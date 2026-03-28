/**
 * 法規資料型別定義
 * 對應 Akoma Ntoso XML 結構的 TypeScript 表示
 */

/** 法規元資料（列表用，不含條文內容） */
export interface LawMeta {
	slug: string; // 檔名（不含副檔名），用作 URL
	title: string; // 全名，如「淡江大學學生會組織章程」
	shortName: string; // 簡稱，如「組織章程」
	history: HistoryEntry[];
	chapterCount: number;
	articleCount: number;
}

/** 修訂歷程 */
export interface HistoryEntry {
	date: string; // ISO 日期
	description: string;
}

/** AKN 節點（遞迴結構） */
export interface AknNode {
	eId: string;
	type: 'chapter' | 'article' | 'paragraph' | 'list' | 'item' | 'content';
	num?: string; // 如「第一條」「第一章」
	heading?: string; // 如「立法依據」「總則」
	text?: string; // 文字內容
	children: AknNode[];
}

/** 完整法規文件（含條文） */
export interface LawDocument {
	meta: LawMeta;
	body: AknNode[];
}

/** 搜尋結果 */
export interface SearchResult {
	law: LawMeta;
	matches: SearchMatch[];
}

export interface SearchMatch {
	articleNum: string;
	articleHeading?: string;
	eId: string;
	text: string;
	highlightRanges: [number, number][];
}
