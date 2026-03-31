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

/** 建立系統提示詞（從集中設定讀取，可在 /admin 頁面修改） */
function buildSystemPrompt(mode: AdvisorMode): string {
	const { prompts } = getConfig();

	switch (mode) {
		case AdvisorMode.GENERAL:
			return `${prompts.base}\n${prompts.general}`;
		case AdvisorMode.LEGISLATIVE:
			return `${prompts.base}\n${prompts.legislative}`;
		case AdvisorMode.COMPLIANCE:
			return `${prompts.base}\n${prompts.compliance}`;
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

	console.log(`[LLM] callLlm provider=${config.llm.provider}, mode=${request.mode}, baseUrl=${config.llm.baseUrl}`);

	if (config.llm.provider === 'ollama') {
		return callOllama(request);
	}

	console.log('[LLM] ⚠ 走 Mock 路徑（非 Ollama）');
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

/** Ollama API 呼叫（非串流模式） */
async function callOllama(request: LlmRequest): Promise<LlmResponse> {
	const ollamaConfig = getOllamaConfig();
	const systemPrompt = buildSystemPrompt(request.mode);
	const contextPrompt = buildContextPrompt(request.sources);

	const messages = [
		{ role: 'system', content: systemPrompt + contextPrompt },
		...request.history.slice(-6), // 保留最近 6 則對話
		{ role: 'user', content: request.userMessage }
	];

	// 90 秒 timeout — Gemma 3 12B 在 3080Ti 上可能要 10-30 秒
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 90_000);

	try {
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
			}),
			signal: controller.signal
		});

		if (!response.ok) {
			const body = await response.text().catch(() => '');
			if (response.status === 404) {
				throw new Error(`模型 "${ollamaConfig.model}" 不存在，請確認 Ollama 已下載此模型（ollama pull ${ollamaConfig.model}）`);
			}
			throw new Error(`Ollama 回應錯誤 (HTTP ${response.status})：${body.slice(0, 200)}`);
		}

		const data = await response.json();
		return { content: data.message.content };
	} catch (err: any) {
		if (err.name === 'AbortError') {
			throw new Error('Ollama 回應逾時（90 秒），模型可能正在載入中，請稍後再試');
		}
		if (err.cause?.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
			throw new Error(`無法連線至 Ollama（${ollamaConfig.baseUrl}），請確認服務已啟動`);
		}
		throw err;
	} finally {
		clearTimeout(timeout);
	}
}

/**
 * Ollama 串流 API 呼叫
 * 回傳 ReadableStream，前端可逐步顯示回覆
 */
export async function callLlmStream(request: LlmRequest): Promise<ReadableStream<string>> {
	const config = getConfig();

	console.log(`[LLM] callLlmStream provider=${config.llm.provider}, mode=${request.mode}, model=${config.llm.model}`);

	if (config.llm.provider !== 'ollama') {
		// Mock 模式：模擬串流
		console.log('[LLM] ⚠ 串流走 Mock 路徑（非 Ollama）');
		const mockResponse = await callMock(request);
		return new ReadableStream({
			async start(controller) {
				const words = mockResponse.content.split('');
				for (let i = 0; i < words.length; i += 3) {
					controller.enqueue(words.slice(i, i + 3).join(''));
					await new Promise((r) => setTimeout(r, 20));
				}
				controller.close();
			}
		});
	}

	const ollamaConfig = getOllamaConfig();
	const systemPrompt = buildSystemPrompt(request.mode);
	const contextPrompt = buildContextPrompt(request.sources);

	const messages = [
		{ role: 'system', content: systemPrompt + contextPrompt },
		...request.history.slice(-6),
		{ role: 'user', content: request.userMessage }
	];

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 90_000);

	const response = await fetch(`${ollamaConfig.baseUrl}/api/chat`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			model: ollamaConfig.model,
			messages,
			stream: true,
			options: {
				temperature: ollamaConfig.temperature,
				num_predict: ollamaConfig.maxTokens
			}
		}),
		signal: controller.signal
	}).catch((err) => {
		clearTimeout(timeout);
		if (err.cause?.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
			throw new Error(`無法連線至 Ollama（${ollamaConfig.baseUrl}），請確認服務已啟動`);
		}
		throw err;
	});

	if (!response.ok) {
		clearTimeout(timeout);
		if (response.status === 404) {
			throw new Error(`模型 "${ollamaConfig.model}" 不存在`);
		}
		throw new Error(`Ollama 回應錯誤 (HTTP ${response.status})`);
	}

	// 將 Ollama 的 NDJSON 串流轉為純文字串流
	const reader = response.body!.getReader();
	const decoder = new TextDecoder();

	return new ReadableStream<string>({
		async pull(streamController) {
			try {
				const { done, value } = await reader.read();
				if (done) {
					clearTimeout(timeout);
					streamController.close();
					return;
				}

				const text = decoder.decode(value, { stream: true });
				// Ollama 回傳一行一個 JSON
				for (const line of text.split('\n').filter(Boolean)) {
					try {
						const json = JSON.parse(line);
						if (json.message?.content) {
							streamController.enqueue(json.message.content);
						}
						if (json.done) {
							clearTimeout(timeout);
							streamController.close();
							return;
						}
					} catch {
						// skip malformed lines
					}
				}
			} catch (err: any) {
				clearTimeout(timeout);
				if (err.name === 'AbortError') {
					streamController.error(new Error('Ollama 回應逾時'));
				} else {
					streamController.error(err);
				}
			}
		},
		cancel() {
			clearTimeout(timeout);
			reader.cancel();
		}
	});
}
