/**
 * AI 法規顧問 API
 * POST /api/advisor — 接收問題，回傳 AI 回覆 + 引用來源
 *
 * 支援兩種模式（由 Accept header 或 stream 參數決定）：
 *   1. JSON 模式（預設）：等待完整回覆後一次回傳
 *   2. 串流模式：Server-Sent Events，逐步回傳文字
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchRelevantArticles } from '$lib/server/advisor/search.js';
import { callLlm, callLlmStream } from '$lib/server/advisor/llm.js';
import { AdvisorMode } from '$lib/types/advisor.js';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { mode, message, history, stream } = body;

	if (!message || typeof message !== 'string' || message.trim().length === 0) {
		throw error(400, '請輸入問題');
	}

	if (!Object.values(AdvisorMode).includes(mode)) {
		throw error(400, '無效的顧問模式');
	}

	// 1. 搜尋相關法規
	const sources = await searchRelevantArticles(message, 5);

	const llmRequest = {
		mode,
		userMessage: message,
		sources,
		history: (history || []).slice(-6).map((h: any) => ({
			role: h.role as 'user' | 'assistant',
			content: h.content
		}))
	};

	// 2. 串流模式
	if (stream) {
		try {
			const textStream = await callLlmStream(llmRequest);

			// 先送 sources metadata，再串流文字內容
			const encoder = new TextEncoder();
			const responseStream = new ReadableStream({
				async start(controller) {
					// 第一個 SSE event：sources
					controller.enqueue(
						encoder.encode(`data: ${JSON.stringify({ type: 'sources', sources: sources.slice(0, 3) })}\n\n`)
					);

					// 串流 LLM 文字
					const reader = textStream.getReader();
					try {
						while (true) {
							const { done, value } = await reader.read();
							if (done) break;
							controller.enqueue(
								encoder.encode(`data: ${JSON.stringify({ type: 'token', content: value })}\n\n`)
							);
						}
						// 完成事件
						controller.enqueue(
							encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
						);
					} catch (err: any) {
						controller.enqueue(
							encoder.encode(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`)
						);
					} finally {
						controller.close();
					}
				}
			});

			return new Response(responseStream, {
				headers: {
					'Content-Type': 'text/event-stream',
					'Cache-Control': 'no-cache',
					Connection: 'keep-alive'
				}
			});
		} catch (err: any) {
			throw error(500, err.message || 'AI 服務錯誤');
		}
	}

	// 3. 一般 JSON 模式
	try {
		const llmResponse = await callLlm(llmRequest);

		return json({
			message: llmResponse.content,
			sources: sources.slice(0, 3),
			mode
		});
	} catch (err: any) {
		throw error(500, err.message || 'AI 服務錯誤');
	}
};
