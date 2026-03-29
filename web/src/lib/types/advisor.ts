/**
 * AI 法規顧問型別定義
 */

/** 顧問模式 */
export enum AdvisorMode {
	GENERAL = 'general', // 一般諮詢（面向學生）
	LEGISLATIVE = 'legislative', // 修法輔助（面向議員）
	COMPLIANCE = 'compliance' // 法規健檢（面向提案）
}

export const MODE_LABELS: Record<AdvisorMode, string> = {
	[AdvisorMode.GENERAL]: '法規諮詢',
	[AdvisorMode.LEGISLATIVE]: '修法輔助',
	[AdvisorMode.COMPLIANCE]: '法規健檢'
};

export const MODE_DESCRIPTIONS: Record<AdvisorMode, string> = {
	[AdvisorMode.GENERAL]: '用白話文回答法規問題，適合一般同學',
	[AdvisorMode.LEGISLATIVE]: '協助議員分析條文、比較修法方案',
	[AdvisorMode.COMPLIANCE]: '檢查提案是否牴觸現行法規'
};

export const MODE_ICONS: Record<AdvisorMode, string> = {
	[AdvisorMode.GENERAL]: '💬',
	[AdvisorMode.LEGISLATIVE]: '📝',
	[AdvisorMode.COMPLIANCE]: '🔍'
};

/** 聊天訊息 */
export interface ChatMessage {
	id: string;
	role: 'user' | 'assistant' | 'system';
	content: string;
	timestamp: string;
	/** 引用的法規來源 */
	sources?: LawSource[];
}

/** 法規引用來源 */
export interface LawSource {
	lawName: string;
	articleNum: string;
	eId: string;
	text: string;
	relevance: number; // 0-1 相關度
}

/** 顧問請求 */
export interface AdvisorRequest {
	mode: AdvisorMode;
	message: string;
	history: ChatMessage[];
}

/** 顧問回應 */
export interface AdvisorResponse {
	message: string;
	sources: LawSource[];
	mode: AdvisorMode;
}
