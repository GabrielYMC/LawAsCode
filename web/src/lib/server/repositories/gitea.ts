/**
 * GiteaLawRepository
 * 從 Gitea REST API 讀取法規資料
 * 法規以 AKN XML 格式存放於 Gitea 倉庫的 main 分支
 *
 * API 文件：https://gitea.com/api/swagger
 */

import Fuse from 'fuse.js';
import type { LawRepository } from './types.js';
import type { LawMeta, LawDocument, SearchResult, AknNode } from '$lib/types/law.js';
import { parseAknXml } from '$lib/server/akn/parser.js';
import { getConfig } from '$lib/server/config.js';

export class GiteaLawRepository implements LawRepository {
	private cache: Map<string, LawDocument> = new Map();
	private metaCache: LawMeta[] | null = null;
	private metaCacheTime = 0;
	private searchIndex: Fuse<SearchableArticle> | null = null;

	/** 快取有效期（毫秒） — 避免每次請求都打 API */
	private readonly CACHE_TTL = 5 * 60 * 1000; // 5 分鐘

	// ─── 公開方法 ───

	async listLaws(): Promise<LawMeta[]> {
		// 快取未過期直接回傳
		if (this.metaCache && Date.now() - this.metaCacheTime < this.CACHE_TTL) {
			return this.metaCache;
		}

		const config = getConfig();
		const files = await this.listAknFiles();
		const laws: LawMeta[] = [];

		for (const filePath of files) {
			const slug = filePath.replace(/\.xml$/, '').replace(/^.*\//, '');
			try {
				const doc = await this.loadDocument(slug);
				if (doc) laws.push(doc.meta);
			} catch {
				// skip broken files
			}
		}

		this.metaCache = laws;
		this.metaCacheTime = Date.now();
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

	/** 清除所有快取（設定變更時呼叫） */
	clearCache(): void {
		this.cache.clear();
		this.metaCache = null;
		this.metaCacheTime = 0;
		this.searchIndex = null;
	}

	// ─── Gitea API 操作 ───

	/** 取得 Gitea API 設定 */
	private getApiConfig() {
		const config = getConfig();
		return {
			baseUrl: config.gitea.baseUrl,
			owner: config.gitea.owner,
			repo: config.gitea.repo,
			token: config.gitea.token
		};
	}

	/** 發送 Gitea API 請求 */
	private async giteaFetch(path: string): Promise<Response> {
		const { baseUrl, token } = this.getApiConfig();
		const url = `${baseUrl}/api/v1${path}`;

		const headers: Record<string, string> = {
			'Accept': 'application/json'
		};
		if (token) {
			headers['Authorization'] = `token ${token}`;
		}

		const response = await fetch(url, { headers });
		if (!response.ok) {
			throw new Error(`Gitea API error: ${response.status} ${response.statusText} — ${url}`);
		}
		return response;
	}

	/** 列出 AKN 目錄下所有 XML 檔案 */
	private async listAknFiles(): Promise<string[]> {
		const { owner, repo } = this.getApiConfig();

		// GET /repos/{owner}/{repo}/contents/{filepath}
		// 取得 akn/ 目錄下的所有檔案
		const res = await this.giteaFetch(`/repos/${owner}/${repo}/contents/akn`);
		const entries: GiteaContentEntry[] = await res.json();

		return entries
			.filter((e) => e.type === 'file' && e.name.endsWith('.xml'))
			.map((e) => e.name);
	}

	/** 讀取單一法規 XML 內容 */
	private async fetchFileContent(slug: string): Promise<string> {
		const { owner, repo } = this.getApiConfig();

		// GET /repos/{owner}/{repo}/raw/{filepath}
		// 取得檔案原始內容
		const res = await this.giteaFetch(`/repos/${owner}/${repo}/raw/akn/${slug}.xml`);
		return await res.text();
	}

	/** 載入並解析法規文件（含快取） */
	private async loadDocument(slug: string): Promise<LawDocument | null> {
		if (this.cache.has(slug)) return this.cache.get(slug)!;

		try {
			const xml = await this.fetchFileContent(slug);
			const doc = parseAknXml(xml, slug);
			this.cache.set(slug, doc);
			return doc;
		} catch {
			return null;
		}
	}

	// ─── 搜尋索引 ───

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

// ─── Gitea API 型別 ───

/** Gitea contents API 回傳的檔案/目錄條目 */
interface GiteaContentEntry {
	name: string;
	path: string;
	type: 'file' | 'dir' | 'symlink' | 'submodule';
	size: number;
	sha: string;
	url: string;
	download_url: string;
}

interface SearchableArticle {
	lawSlug: string;
	eId: string;
	articleNum: string;
	articleHeading?: string;
	text: string;
}
