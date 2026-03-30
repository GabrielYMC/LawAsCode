/**
 * AI 法規顧問 API
 * POST /api/advisor — 接收問題，回傳 AI 回覆 + 引用來源
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchRelevantArticles } from '$lib/server/advisor/search.js';
import { callLlm } from '$lib/server/advisor/llm.js';
import { AdvisorMode } from '$lib/types/advisor.js';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { mode, message, history } = body;

	if (!message || typeof message !== 'string' || message.trim().length === 0) {
		throw error(400, '請輸入問題');
	}

	if (!Object.values(AdvisorMode).includes(mode)) {
		throw error(400, '無效的顧問模式');
	}

	// 1. 搜尋相關法規
	const sources = await searchRelevantArticles(message, 5);

	// 2. 呼叫 LLM
	const llmResponse = await callLlm({
		mode,
		userMessage: message,
		sources,
		history: (history || []).slice(-6).map((h: any) => ({
			role: h.role as 'user' | 'assistant',
			content: h.content
		}))
	});

	return json({
		message: llmResponse.content,
		sources: sources.slice(0, 3), // 前端只顯示前 3 個來源
		mode
	});
};
