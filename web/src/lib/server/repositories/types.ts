/**
 * LawRepository 介面
 * 定義法規資料的存取抽象層
 * 本地開發：FilesystemLawRepository（讀取 laws/ 目錄）
 * 生產環境：GiteaLawRepository（呼叫 Gitea REST API）
 */

import type { LawMeta, LawDocument, SearchResult } from '$lib/types/law.js';

export interface LawRepository {
	/** 列出所有法規的元資料 */
	listLaws(): Promise<LawMeta[]>;

	/** 取得單一法規的完整內容（含條文） */
	getLaw(slug: string): Promise<LawDocument | null>;

	/** 全文搜尋 */
	searchLaws(query: string): Promise<SearchResult[]>;
}
