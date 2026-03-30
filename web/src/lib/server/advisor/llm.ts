/**
 * LLM 服務抽象層
 * 開發環境：Mock 回應（模擬延遲 + 預設回覆）
 * 生產環境：Ollama API（Gemma 3 12B）
 */

import { AdvisorMode } from '$lib/types/advisor.js';
import type { LawSource } from '$lib/types/advisor.js';
import { getConfig } from '$lib/server/config.js';

export interface LlmRequest {
	mode: AdvisorMode;
	userMessage: string;
	sources: LawSource[];
	history: { role: 'user' | 'assistant'; content: string }[];
}

export interface LlmResponse {
	content: string;
}

/** 從集中設定取得 Ollama 參數 */
function getOllamaConfig() {
	const config = getConfig();
	return {
		baseUrl: config.llm.baseUrl,
		model: config.llm.model,
		temperature: config.llm.temperature,
		maxTokens: config.llm.maxTokens
	};
}

/** 建立系統提示詞 */
function buildSystemPrompt(mode: AdvisorMode): string {
	const base = '你是淡江大學學生會的 AI 法規顧問。你的知識範圍限於淡江大學學生會法規錄中的法規。';

	switch (mode) {
		case AdvisorMode.GENERAL:
			return `${base}
你的對象是一般同學，請用平易近人的白話文回答。
回答時：
1. 先直接回答問題
2. 引用具體條文作為依據（標明法規名稱和條號）
3. 如果問題超出法規範圍，誠實告知
4. 避免使用艱澀法律用語，必要時加上白話解釋`;

		case AdvisorMode.LEGISLATIVE:
			return `${base}
你的對象是學生議員，協助修法分析。
回答時：
1. 引用精確條文和條號
2. 分析修法可能影響的相關條文（連動修正）
3. 指出可能的法規衝突
4. 提供修法建議的條文草案（如適用）
5. 參考中華民國相關法規的慣例`;

		case AdvisorMode.COMPLIANCE:
			return `${base}
你正在進行法規健檢，檢查提案內容是否合規。
檢查項目：
1. 是否牴觸上位法規（組織章程優先於一般法律）
2. 條文用語是否符合法規標準規則的格式要求
3. 是否有邏輯矛盾或漏洞
4. 與現行相關法規的一致性
輸出格式：逐項列出檢查結果，標記 ✅ 合規 或 ⚠️ 待確認`;
	}
}

/** 建立帶有法規上下文的提示詞 */
function buildContextPrompt(sources: LawSource[]): string {
	if (sources.length === 0) return '';

	const context = sources
		.map((s) => `【${s.lawName} ${s.articleNum}】\n${s.text}`)
		.join('\n\n');

	return `\n以下是相關法規條文供你參考：\n\n${context}\n\n請基於以上條文回答問題。`;
}

/**
 * 呼叫 LLM（Mock 版本）
 * 生產環境替換為 Ollama API call
 */
export async function callLlm(request: LlmRequest): Promise<LlmResponse> {
	const config = getConfig();

	if (config.llm.provider === 'ollama') {
		return callOllama(request);
	}

	return callMock(request);
}

/** Mock LLM 回應 */
async function callMock(request: LlmRequest): Promise<LlmResponse> {
	// 模擬網路延遲
	await new Promise((r) => setTimeout(r, 800 + Math.random() * 1200));

	const { mode, userMessage, sources } = request;

	// 根據關鍵字和模式產生模擬回覆
	if (sources.length > 0) {
		const sourceRefs = sources
			.slice(0, 3)
			.map((s) => `${s.lawName} ${s.articleNum}`)
			.join('、');

		switch (mode) {
			case AdvisorMode.GENERAL:
				return {
					content: generateGeneralResponse(userMessage, sources)
				};
			case AdvisorMode.LEGISLATIVE:
				return {
					content: generateLegislativeResponse(userMessage, sources)
				};
			case AdvisorMode.COMPLIANCE:
				return {
					content: generateComplianceResponse(userMessage, sources)
				};
		}
	}

	return {
		content: `感謝你的提問。關於「${userMessage}」，我在現行法規中沒有找到直接相關的條文。\n\n你可以嘗試：\n1. 用不同的關鍵字重新提問\n2. 到法規瀏覽頁面直接查閱相關法規\n\n如果這是法規沒有規範的事項，可能需要透過提案程序來制定新的規定。`
	};
}

function generateGeneralResponse(question: string, sources: LawSource[]): string {
	const mainSource = sources[0];
	const otherSources = sources.slice(1, 3);

	let response = `根據**${mainSource.lawName} ${mainSource.articleNum}**的規定：\n\n`;
	response += `> ${mainSource.text.slice(0, 100)}${mainSource.text.length > 100 ? '...' : ''}\n\n`;
	response += `簡單來說，`;

	if (question.includes('會長') || question.includes('選舉')) {
		response += `會長的選舉和任期在組織章程中有明確規範。如果你想了解更多投票資格或候選人條件，可以查閱選舉罷免辦法。`;
	} else if (question.includes('議會') || question.includes('議員')) {
		response += `學生議會是學生自治的立法機關，議員由各系所選出。議會的運作規則在職權行使辦法中有詳細規定。`;
	} else if (question.includes('預算') || question.includes('經費')) {
		response += `學生會的經費使用需要依照預算辦法的規定辦理，包括編列預算、核銷程序等。`;
	} else {
		response += `這個問題涉及到學生會的基本運作規範。建議你詳細閱讀相關條文以了解完整內容。`;
	}

	if (otherSources.length > 0) {
		response += `\n\n**相關條文：**\n`;
		for (const s of otherSources) {
			response += `- ${s.lawName} ${s.articleNum}\n`;
		}
	}

	return response;
}

function generateLegislativeResponse(question: string, sources: LawSource[]): string {
	let response = `## 條文分析\n\n`;

	for (const s of sources.slice(0, 3)) {
		response += `### ${s.lawName} ${s.articleNum}\n`;
		response += `${s.text.slice(0, 150)}${s.text.length > 150 ? '...' : ''}\n\n`;
	}

	response += `## 修法建議\n\n`;
	response += `1. **影響範圍**：修改此條文可能連動影響 ${sources.length} 條相關規定\n`;
	response += `2. **注意事項**：需確認是否牴觸組織章程的上位規範\n`;
	response += `3. **程序提醒**：修正案需經一讀、委員會審查、二讀、三讀程序\n\n`;
	response += `*此為 AI 輔助分析，修法決策仍需議員專業判斷。*`;

	return response;
}

function generateComplianceResponse(question: string, sources: LawSource[]): string {
	let response = `## 法規健檢報告\n\n`;
	response += `**檢查對象**：${question.slice(0, 50)}\n\n`;
	response += `### 檢查結果\n\n`;
	response += `✅ **格式規範**：條文格式符合法規標準規則要求\n\n`;
	response += `✅ **條號編排**：條號連續，無跳號或重複\n\n`;
	response += `⚠️ **上位法規一致性**：建議確認是否與組織章程相關條文一致\n\n`;

	if (sources.length > 0) {
		response += `### 相關現行條文\n\n`;
		for (const s of sources.slice(0, 2)) {
			response += `- **${s.lawName} ${s.articleNum}**：${s.text.slice(0, 80)}...\n`;
		}
	}

	response += `\n*此為 AI 自動健檢，結果僅供參考，不構成法律意見。*`;

	return response;
}

/** Ollama API 呼叫 */
async function callOllama(request: LlmRequest): Promise<LlmResponse> {
	const ollamaConfig = getOllamaConfig();
	const systemPrompt = buildSystemPrompt(request.mode);
	const contextPrompt = buildContextPrompt(request.sources);

	const messages = [
		{ role: 'system', content: systemPrompt + contextPrompt },
		...request.history.slice(-6), // 保留最近 6 則對話
		{ role: 'user', content: request.userMessage }
	];

	const response = await fetch(`${ollamaConfig.baseUrl}/api/chat`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			model: ollamaConfig.model,
			messages,
			stream: false,
			options: {
				temperature: ollamaConfig.temperature,
				num_predict: ollamaConfig.maxTokens
			}
		})
	});

	if (!response.ok) {
		throw new Error(`Ollama API error: ${response.status}`);
	}

	const data = await response.json();
	return { content: data.message.content };
}
