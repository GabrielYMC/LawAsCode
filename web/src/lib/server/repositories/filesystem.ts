/**
 * FilesystemLawRepository
 * 從本地 laws/ 目錄讀取法規資料，用於本地開發
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import Fuse from 'fuse.js';
import type { LawRepository } from './types.js';
import type { LawMeta, LawDocument, SearchResult, AknNode } from '$lib/types/law.js';
import { parseAknXml } from '$lib/server/akn/parser.js';

export class FilesystemLawRepository implements LawRepository {
	private aknDir: string;
	private cache: Map<string, LawDocument> = new Map();
	private metaCache: LawMeta[] | null = null;
	private searchIndex: Fuse<SearchableArticle> | null = null;

	constructor(lawsRoot: string) {
		this.aknDir = join(lawsRoot, 'akn');
	}

	async listLaws(): Promise<LawMeta[]> {
		if (this.metaCache) return this.metaCache;

		const files = await readdir(this.aknDir);
		const xmlFiles = files.filter((f) => f.endsWith('.xml')).sort();

		const laws: LawMeta[] = [];
		for (const file of xmlFiles) {
			const slug = file.replace('.xml', '');
			const doc = await this.loadDocument(slug);
			if (doc) laws.push(doc.meta);
		}

		this.metaCache = laws;
		return laws;
	}

	async getLaw(slug: string): Promise<LawDocument | null> {
		return this.loadDocument(slug);
	}

	async searchLaws(query: string): Promise<SearchResult[]> {
		if (!this.searchIndex) {
			await this.buildSearchIndex();
		}

		const results = this.searchIndex!.search(query, { limit: 30 });

		// 按法規分組
		const grouped = new Map<string, SearchResult>();
		for (const result of results) {
			const item = result.item;
			if (!grouped.has(item.lawSlug)) {
				const doc = await this.loadDocument(item.lawSlug);
				if (!doc) continue;
				grouped.set(item.lawSlug, {
					law: doc.meta,
					matches: []
				});
			}
			const sr = grouped.get(item.lawSlug)!;
			sr.matches.push({
				articleNum: item.articleNum,
				articleHeading: item.articleHeading,
				eId: item.eId,
				text: item.text,
				highlightRanges:
					result.matches?.[0]?.indices?.map((i) => [i[0], i[1]] as [number, number]) || []
			});
		}

		return Array.from(grouped.values());
	}

	private async loadDocument(slug: string): Promise<LawDocument | null> {
		if (this.cache.has(slug)) return this.cache.get(slug)!;

		const filepath = join(this.aknDir, `${slug}.xml`);
		try {
			const xml = await readFile(filepath, 'utf-8');
			const doc = parseAknXml(xml, slug);
			this.cache.set(slug, doc);
			return doc;
		} catch {
			return null;
		}
	}

	private async buildSearchIndex(): Promise<void> {
		const laws = await this.listLaws();
		const articles: SearchableArticle[] = [];

		for (const meta of laws) {
			const doc = await this.loadDocument(meta.slug);
			if (!doc) continue;
			this.extractArticles(doc.body, meta.slug, articles);
		}

		this.searchIndex = new Fuse(articles, {
			keys: ['text', 'articleHeading'],
			includeMatches: true,
			threshold: 0.3,
			minMatchCharLength: 2
		});
	}

	private extractArticles(nodes: AknNode[], lawSlug: string, out: SearchableArticle[]): void {
		for (const node of nodes) {
			if (node.type === 'article') {
				const textParts: string[] = [];
				this.collectText(node, textParts);
				out.push({
					lawSlug,
					eId: node.eId,
					articleNum: node.num || '',
					articleHeading: node.heading,
					text: textParts.join(' ')
				});
			} else {
				this.extractArticles(node.children, lawSlug, out);
			}
		}
	}

	private collectText(node: AknNode, out: string[]): void {
		if (node.text) out.push(node.text);
		for (const child of node.children) {
			this.collectText(child, out);
		}
	}
}

interface SearchableArticle {
	lawSlug: string;
	eId: string;
	articleNum: string;
	articleHeading?: string;
	text: string;
}
