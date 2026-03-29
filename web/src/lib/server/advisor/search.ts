/**
 * 法規語意搜尋
 * 開發環境：fuse.js 關鍵字搜尋
 * 生產環境：Ollama embedding + vector search
 */

import Fuse from 'fuse.js';
import type { LawSource } from '$lib/types/advisor.js';
import { getLawRepository } from '$lib/server/repositories/index.js';

interface SearchableArticle {
	lawName: string;
	articleNum: string;
	eId: string;
	text: string;
}

let _fuse: Fuse<SearchableArticle> | null = null;
let _articles: SearchableArticle[] = [];

/** 建立搜尋索引（lazy init） */
async function getSearchIndex(): Promise<Fuse<SearchableArticle>> {
	if (_fuse) return _fuse;

	const repo = getLawRepository();
	const laws = await repo.listLaws();
	_articles = [];

	for (const meta of laws) {
		try {
			const law = await repo.getLaw(meta.slug);
			if (!law) continue;

			// 遞迴擷取所有條文
			function extractArticles(nodes: any[], lawName: string) {
				for (const node of nodes) {
					if (node.type === 'article') {
						const texts: string[] = [];
						function collectText(n: any) {
							if (n.text) texts.push(n.text);
							if (n.children) n.children.forEach(collectText);
						}
						collectText(node);

						_articles.push({
							lawName,
							articleNum: node.num || node.eId,
							eId: node.eId,
							text: texts.join(' ')
						});
					}
					if (node.children) {
						extractArticles(node.children, lawName);
					}
				}
			}

			extractArticles(law.body, law.meta.title);
		} catch {
			// skip broken files
		}
	}

	_fuse = new Fuse(_articles, {
		keys: [
			{ name: 'text', weight: 0.7 },
			{ name: 'lawName', weight: 0.2 },
			{ name: 'articleNum', weight: 0.1 }
		],
		threshold: 0.5,
		includeScore: true,
		minMatchCharLength: 2,
		useExtendedSearch: true
	});

	return _fuse;
}

/** 從問句中擷取搜尋關鍵字 */
function extractKeywords(query: string): string[] {
	// 移除常見問句詞，保留實質關鍵字
	const stopWords = [
		'的', '是', '在', '了', '嗎', '呢', '吧', '啊', '怎麼', '什麼', '如何',
		'可以', '可不可以', '能', '能不能', '有沒有', '請問', '想問', '關於',
		'多久', '多少', '哪裡', '為什麼', '是否'
	];
	const words = query.replace(/[？?！!。，、]/g, ' ').split(/\s+/).filter(Boolean);
	return words.filter((w) => !stopWords.includes(w) && w.length >= 2);
}

/** 搜尋相關法規條文 */
export async function searchRelevantArticles(
	query: string,
	maxResults: number = 5
): Promise<LawSource[]> {
	const fuse = await getSearchIndex();

	// 先用完整問句搜尋
	let results = fuse.search(query, { limit: maxResults });

	// 若結果不足，用擷取的關鍵字逐一搜尋並合併
	if (results.length < 3) {
		const keywords = extractKeywords(query);
		const seen = new Set(results.map((r) => r.item.eId));

		for (const kw of keywords) {
			if (results.length >= maxResults) break;
			const kwResults = fuse.search(kw, { limit: 3 });
			for (const r of kwResults) {
				if (!seen.has(r.item.eId) && results.length < maxResults) {
					seen.add(r.item.eId);
					results.push(r);
				}
			}
		}
	}

	return results.map((r) => ({
		lawName: r.item.lawName,
		articleNum: r.item.articleNum,
		eId: r.item.eId,
		text: r.item.text,
		relevance: 1 - (r.score ?? 0)
	}));
}
