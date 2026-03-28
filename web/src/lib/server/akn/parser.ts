/**
 * AKN XML → JSON 解析器
 * 將 Akoma Ntoso 3.0 XML 轉換為 TypeScript 型別化的 JSON 結構
 */

import { XMLParser } from 'fast-xml-parser';
import type { AknNode, LawMeta, LawDocument, HistoryEntry } from '$lib/types/law.js';

const parser = new XMLParser({
	ignoreAttributes: false,
	attributeNamePrefix: '@_',
	textNodeName: '#text',
	isArray: (name) => ['chapter', 'article', 'paragraph', 'point', 'list', 'eventRef'].includes(name)
});

/** 從 AKN XML 字串解析出完整法規文件 */
export function parseAknXml(xml: string, slug: string): LawDocument {
	const parsed = parser.parse(xml);
	const act = parsed.akomaNtoso.act;

	const meta = extractMeta(act, slug);
	const body = extractBody(act.body);

	// 計算統計
	meta.chapterCount = body.filter((n) => n.type === 'chapter').length;
	meta.articleCount = countArticles(body);

	return { meta, body };
}

/** 只解析元資料（用於列表，不解析 body） */
export function parseAknMeta(xml: string, slug: string): LawMeta {
	const parsed = parser.parse(xml);
	const act = parsed.akomaNtoso.act;
	const meta = extractMeta(act, slug);

	// 快速計算條文數（粗略計算）
	const body = extractBody(act.body);
	meta.chapterCount = body.filter((n) => n.type === 'chapter').length;
	meta.articleCount = countArticles(body);

	return meta;
}

function extractMeta(act: any, slug: string): LawMeta {
	const identification = act.meta?.identification;
	const frbrWork = identification?.FRBRWork;

	// 從 FRBRthis URI 提取法規名稱
	// URI 格式: /akn/tw-tku/act/法規名稱/main
	const uri: string = frbrWork?.FRBRthis?.['@_value'] || '';
	const uriParts = uri.split('/').filter(Boolean);
	// 法規名稱在 act 之後、main 之前；如果找不到就用檔名 slug
	const actIndex = uriParts.indexOf('act');
	const titleFromUri = actIndex >= 0 && actIndex + 1 < uriParts.length
		? uriParts[actIndex + 1]
		: slug;

	// 提取修訂歷程
	const history: HistoryEntry[] = [];
	const lifecycle = act.meta?.lifecycle;
	if (lifecycle) {
		const events = Array.isArray(lifecycle.eventRef)
			? lifecycle.eventRef
			: lifecycle.eventRef
				? [lifecycle.eventRef]
				: [];

		for (const evt of events) {
			history.push({
				date: evt['@_date'] || '',
				description: evt['@_source']?.replace('#', '') || ''
			});
		}
	}

	return {
		slug,
		title: `淡江大學學生會${titleFromUri}`,
		shortName: titleFromUri,
		history,
		chapterCount: 0,
		articleCount: 0
	};
}

function extractBody(body: any): AknNode[] {
	if (!body) return [];
	const nodes: AknNode[] = [];

	// 頂層可能是 chapter 或直接是 article
	if (body.chapter) {
		const chapters = ensureArray(body.chapter);
		for (const ch of chapters) {
			nodes.push(parseChapter(ch));
		}
	}

	if (body.article) {
		const articles = ensureArray(body.article);
		for (const art of articles) {
			nodes.push(parseArticle(art));
		}
	}

	return nodes;
}

function parseChapter(ch: any): AknNode {
	const children: AknNode[] = [];

	if (ch.article) {
		const articles = ensureArray(ch.article);
		for (const art of articles) {
			children.push(parseArticle(art));
		}
	}

	return {
		eId: ch['@_eId'] || '',
		type: 'chapter',
		num: extractText(ch.num),
		heading: extractText(ch.heading),
		children
	};
}

function parseArticle(art: any): AknNode {
	const children: AknNode[] = [];

	if (art.paragraph) {
		const paragraphs = ensureArray(art.paragraph);
		for (const para of paragraphs) {
			children.push(parseParagraph(para));
		}
	}

	return {
		eId: art['@_eId'] || '',
		type: 'article',
		num: extractText(art.num),
		heading: extractText(art.heading),
		children
	};
}

function parseParagraph(para: any): AknNode {
	const children: AknNode[] = [];
	let text = '';

	// intro 文字
	if (para.intro) {
		text += extractDeepText(para.intro);
	}

	// content 文字
	if (para.content) {
		text += extractDeepText(para.content);
	}

	// list → items
	if (para.list) {
		const lists = ensureArray(para.list);
		for (const list of lists) {
			children.push(parseList(list));
		}
	}

	// wrapUp 文字（列舉後的收尾文字）
	if (para.wrapUp) {
		const wrapText = extractDeepText(para.wrapUp);
		if (wrapText) {
			children.push({
				eId: `${para['@_eId'] || ''}__wrapup`,
				type: 'content',
				text: wrapText,
				children: []
			});
		}
	}

	return {
		eId: para['@_eId'] || '',
		type: 'paragraph',
		text: text.trim() || undefined,
		children
	};
}

function parseList(list: any): AknNode {
	const children: AknNode[] = [];

	if (list.point) {
		const points = ensureArray(list.point);
		for (const pt of points) {
			children.push({
				eId: pt['@_eId'] || '',
				type: 'item',
				num: extractText(pt.num),
				text: extractDeepText(pt.content || pt),
				children: []
			});
		}
	}

	return {
		eId: list['@_eId'] || '',
		type: 'list',
		children
	};
}

// === Utility functions ===

function extractText(node: any): string | undefined {
	if (!node) return undefined;
	if (typeof node === 'string') return node;
	if (node['#text']) return String(node['#text']);
	return undefined;
}

function extractDeepText(node: any): string {
	if (!node) return '';
	if (typeof node === 'string') return node;
	if (node['#text']) return String(node['#text']);

	// Recursively extract text from <p>, <span>, etc.
	let text = '';
	if (node.p) {
		const ps = ensureArray(node.p);
		text += ps.map((p: any) => (typeof p === 'string' ? p : p['#text'] || '')).join(' ');
	}
	// Fallback: try to get any text content
	if (!text && typeof node === 'object') {
		for (const key of Object.keys(node)) {
			if (key.startsWith('@_')) continue;
			if (typeof node[key] === 'string') text += node[key];
		}
	}
	return text.trim();
}

function ensureArray<T>(val: T | T[]): T[] {
	if (Array.isArray(val)) return val;
	return val ? [val] : [];
}

function countArticles(nodes: AknNode[]): number {
	let count = 0;
	for (const node of nodes) {
		if (node.type === 'article') count++;
		count += countArticles(node.children);
	}
	return count;
}
