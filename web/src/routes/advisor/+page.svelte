<script lang="ts">
	import {
		AdvisorMode,
		MODE_LABELS,
		MODE_DESCRIPTIONS,
		MODE_ICONS
	} from '$lib/types/advisor';
	import type { ChatMessage, LawSource } from '$lib/types/advisor';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let currentMode: AdvisorMode = $state(AdvisorMode.GENERAL);
	let messages: ChatMessage[] = $state([]);
	let inputText = $state('');
	let isLoading = $state(false);
	let chatContainer: HTMLElement;
	let useStream = $derived(data.llmProvider === 'ollama');

	const MODES = [AdvisorMode.GENERAL, AdvisorMode.LEGISLATIVE, AdvisorMode.COMPLIANCE];

	const EXAMPLE_QUESTIONS: Record<AdvisorMode, string[]> = {
		[AdvisorMode.GENERAL]: [
			'會長任期多久？可以連任嗎？',
			'學生議員怎麼選出來的？',
			'學生會的經費怎麼使用？'
		],
		[AdvisorMode.LEGISLATIVE]: [
			'修改組織章程需要什麼門檻？',
			'法規標準規則第五條可以怎麼修？',
			'「逕付二讀」的法律依據是什麼？'
		],
		[AdvisorMode.COMPLIANCE]: [
			'檢查：新增預算辦法第三十五條',
			'會長公布期限從14日改為7日是否合規？',
			'議長可以兼任法規委員會召集人嗎？'
		]
	};

	function switchMode(mode: AdvisorMode) {
		currentMode = mode;
		messages = [];
	}

	async function sendMessage(text?: string) {
		const msg = text ?? inputText.trim();
		if (!msg || isLoading) return;

		inputText = '';

		// 加入使用者訊息
		const userMsg: ChatMessage = {
			id: crypto.randomUUID(),
			role: 'user',
			content: msg,
			timestamp: new Date().toISOString()
		};
		messages = [...messages, userMsg];

		isLoading = true;
		scrollToBottom();

		try {
			const response = await fetch('/api/advisor', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					mode: currentMode,
					message: msg,
					history: messages.map((m) => ({ role: m.role, content: m.content })),
					stream: useStream
				})
			});

			if (!response.ok) {
				const errBody = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
				throw new Error(errBody.message || `HTTP ${response.status}`);
			}

			if (useStream && response.headers.get('Content-Type')?.includes('text/event-stream')) {
				// 串流模式：逐步顯示回覆
				const assistantMsg: ChatMessage = {
					id: crypto.randomUUID(),
					role: 'assistant',
					content: '',
					timestamp: new Date().toISOString()
				};
				messages = [...messages, assistantMsg];
				const msgIndex = messages.length - 1;

				const reader = response.body!.getReader();
				const decoder = new TextDecoder();
				let buffer = '';

				while (true) {
					const { done, value } = await reader.read();
					if (done) break;

					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split('\n\n');
					buffer = lines.pop() || '';

					for (const line of lines) {
						if (!line.startsWith('data: ')) continue;
						try {
							const event = JSON.parse(line.slice(6));
							if (event.type === 'sources') {
								messages[msgIndex] = { ...messages[msgIndex], sources: event.sources };
								messages = [...messages];
							} else if (event.type === 'token') {
								messages[msgIndex] = {
									...messages[msgIndex],
									content: messages[msgIndex].content + event.content
								};
								messages = [...messages];
								scrollToBottom();
							} else if (event.type === 'error') {
								messages[msgIndex] = {
									...messages[msgIndex],
									content: messages[msgIndex].content || `錯誤：${event.message}`
								};
								messages = [...messages];
							}
						} catch { /* skip */ }
					}
				}
			} else {
				// JSON 模式
				const resData = await response.json();
				const assistantMsg: ChatMessage = {
					id: crypto.randomUUID(),
					role: 'assistant',
					content: resData.message,
					timestamp: new Date().toISOString(),
					sources: resData.sources
				};
				messages = [...messages, assistantMsg];
			}
		} catch (err: any) {
			const errorMsg: ChatMessage = {
				id: crypto.randomUUID(),
				role: 'assistant',
				content: `抱歉，發生錯誤：${err.message || '請稍後再試'}`,
				timestamp: new Date().toISOString()
			};
			messages = [...messages, errorMsg];
		} finally {
			isLoading = false;
			scrollToBottom();
		}
	}

	function scrollToBottom() {
		setTimeout(() => {
			if (chatContainer) {
				chatContainer.scrollTop = chatContainer.scrollHeight;
			}
		}, 50);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}
</script>

<svelte:head>
	<title>AI 法規顧問 — LawAsCode</title>
</svelte:head>

<div class="advisor-layout">
	<!-- 左側：模式選擇 -->
	<div class="mode-panel">
		<h2 class="panel-title">顧問模式</h2>
		{#each MODES as mode}
			<button
				class="mode-card"
				class:active={currentMode === mode}
				onclick={() => switchMode(mode)}
			>
				<span class="mode-icon">{MODE_ICONS[mode]}</span>
				<div class="mode-info">
					<span class="mode-name">{MODE_LABELS[mode]}</span>
					<span class="mode-desc">{MODE_DESCRIPTIONS[mode]}</span>
				</div>
			</button>
		{/each}

		{#if data.llmProvider === 'ollama'}
			<div class="mode-notice live">
				<span class="notice-badge live">AI</span>
				<span>{data.llmModel}<br />串流回覆已啟用</span>
			</div>
		{:else}
			<div class="mode-notice">
				<span class="notice-badge">DEV</span>
				<span>目前為模擬回覆<br />可在系統設定切換 Ollama</span>
			</div>
		{/if}
	</div>

	<!-- 右側：聊天區 -->
	<div class="chat-panel">
		<div class="chat-header">
			<span class="chat-mode-icon">{MODE_ICONS[currentMode]}</span>
			<div>
				<h1>{MODE_LABELS[currentMode]}</h1>
				<p class="chat-mode-desc">{MODE_DESCRIPTIONS[currentMode]}</p>
			</div>
		</div>

		<div class="chat-messages" bind:this={chatContainer}>
			{#if messages.length === 0}
				<!-- 空狀態：範例問題 -->
				<div class="empty-state">
					<span class="empty-icon">{MODE_ICONS[currentMode]}</span>
					<p class="empty-title">有什麼法規問題嗎？</p>
					<p class="empty-desc">試試以下問題，或自行輸入</p>
					<div class="example-questions">
						{#each EXAMPLE_QUESTIONS[currentMode] as q}
							<button class="example-btn" onclick={() => sendMessage(q)}>
								{q}
							</button>
						{/each}
					</div>
				</div>
			{:else}
				{#each messages as msg}
					<div class="message" class:user={msg.role === 'user'} class:assistant={msg.role === 'assistant'}>
						{#if msg.role === 'assistant'}
							<span class="msg-avatar">⚖️</span>
						{/if}
						<div class="msg-bubble">
							<div class="msg-content">
								{#if msg.role === 'assistant'}
									{@html formatMarkdown(msg.content)}
								{:else}
									{msg.content}
								{/if}
							</div>
							{#if msg.sources && msg.sources.length > 0}
								<div class="msg-sources">
									<span class="sources-label">引用來源</span>
									{#each msg.sources as source}
										<a
											href="/laws/{encodeURIComponent(source.lawName)}#{source.eId}"
											class="source-chip"
											title={source.text.slice(0, 100)}
										>
											{source.lawName} {source.articleNum}
										</a>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{/each}
				{#if isLoading}
					<div class="message assistant">
						<span class="msg-avatar">⚖️</span>
						<div class="msg-bubble">
							<div class="typing-indicator">
								<span></span><span></span><span></span>
							</div>
						</div>
					</div>
				{/if}
			{/if}
		</div>

		<div class="chat-input-area">
			<textarea
				class="chat-input"
				placeholder="輸入法規問題..."
				bind:value={inputText}
				onkeydown={handleKeydown}
				rows="1"
				disabled={isLoading}
			></textarea>
			<button
				class="send-btn"
				onclick={() => sendMessage()}
				disabled={!inputText.trim() || isLoading}
			>
				發送
			</button>
		</div>
	</div>
</div>

<script lang="ts" context="module">
	/** 簡易 Markdown → HTML（粗體、標題、列表、引用、程式碼） */
	function formatMarkdown(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			// headers
			.replace(/^### (.+)$/gm, '<h4>$1</h4>')
			.replace(/^## (.+)$/gm, '<h3>$1</h3>')
			// bold
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			// blockquote
			.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
			// unordered list
			.replace(/^- (.+)$/gm, '<li>$1</li>')
			// ordered list
			.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
			// checkmarks
			.replace(/✅/g, '<span class="check-pass">✅</span>')
			.replace(/⚠️/g, '<span class="check-warn">⚠️</span>')
			// paragraphs
			.replace(/\n\n/g, '</p><p>')
			.replace(/\n/g, '<br>')
			.replace(/^/, '<p>')
			.replace(/$/, '</p>');
	}
</script>

<style>
	.advisor-layout {
		display: flex;
		gap: 0;
		height: calc(100vh - 64px);
		margin: -32px;
	}

	/* Mode Panel */
	.mode-panel {
		width: 240px;
		border-right: 1px solid var(--border);
		padding: 20px 14px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		flex-shrink: 0;
	}
	.panel-title {
		font-size: 13px;
		font-weight: 600;
		color: var(--text-subtle);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin-bottom: 4px;
		padding: 0 4px;
	}

	.mode-card {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 12px;
		border-radius: var(--radius);
		border: 1px solid transparent;
		background: transparent;
		cursor: pointer;
		text-align: left;
		transition: all 0.15s;
		color: var(--text);
	}
	.mode-card:hover {
		background: var(--surface-hover);
	}
	.mode-card.active {
		background: rgba(88, 166, 255, 0.08);
		border-color: var(--accent);
	}
	.mode-icon {
		font-size: 20px;
		margin-top: 2px;
	}
	.mode-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.mode-name {
		font-size: 13px;
		font-weight: 600;
	}
	.mode-desc {
		font-size: 11px;
		color: var(--text-muted);
		line-height: 1.4;
	}

	.mode-notice {
		margin-top: auto;
		display: flex;
		align-items: flex-start;
		gap: 8px;
		padding: 10px;
		background: rgba(210, 153, 34, 0.08);
		border-radius: var(--radius);
		font-size: 11px;
		color: var(--text-subtle);
		line-height: 1.4;
	}
	.notice-badge {
		background: var(--warning);
		color: #000;
		padding: 1px 5px;
		border-radius: 3px;
		font-weight: 700;
		font-size: 9px;
		flex-shrink: 0;
	}
	.mode-notice.live {
		background: rgba(63, 185, 80, 0.08);
	}
	.notice-badge.live {
		background: var(--success);
	}

	/* Chat Panel */
	.chat-panel {
		flex: 1;
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.chat-header {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px 24px;
		border-bottom: 1px solid var(--border);
		flex-shrink: 0;
	}
	.chat-mode-icon {
		font-size: 28px;
	}
	.chat-header h1 {
		font-size: 18px;
		font-weight: 600;
	}
	.chat-mode-desc {
		font-size: 12px;
		color: var(--text-muted);
	}

	/* Messages */
	.chat-messages {
		flex: 1;
		overflow-y: auto;
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		gap: 8px;
	}
	.empty-icon {
		font-size: 48px;
		opacity: 0.5;
	}
	.empty-title {
		font-size: 18px;
		font-weight: 600;
		color: var(--text);
	}
	.empty-desc {
		font-size: 13px;
		color: var(--text-muted);
		margin-bottom: 12px;
	}
	.example-questions {
		display: flex;
		flex-direction: column;
		gap: 8px;
		max-width: 400px;
		width: 100%;
	}
	.example-btn {
		padding: 10px 16px;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--text);
		font-size: 13px;
		cursor: pointer;
		text-align: left;
		transition: all 0.15s;
	}
	.example-btn:hover {
		border-color: var(--accent);
		background: rgba(88, 166, 255, 0.05);
	}

	/* Message bubbles */
	.message {
		display: flex;
		gap: 10px;
		max-width: 85%;
	}
	.message.user {
		align-self: flex-end;
		flex-direction: row-reverse;
	}
	.msg-avatar {
		font-size: 20px;
		flex-shrink: 0;
		margin-top: 4px;
	}
	.msg-bubble {
		border-radius: 12px;
		padding: 12px 16px;
		font-size: 14px;
		line-height: 1.7;
	}
	.message.user .msg-bubble {
		background: var(--accent);
		color: #fff;
		border-bottom-right-radius: 4px;
	}
	.message.assistant .msg-bubble {
		background: var(--surface);
		border: 1px solid var(--border);
		border-bottom-left-radius: 4px;
	}

	.msg-content :global(h3) {
		font-size: 15px;
		font-weight: 600;
		margin: 8px 0 4px;
	}
	.msg-content :global(h4) {
		font-size: 14px;
		font-weight: 600;
		margin: 6px 0 2px;
	}
	.msg-content :global(blockquote) {
		border-left: 3px solid var(--accent);
		padding-left: 12px;
		margin: 8px 0;
		color: var(--text-muted);
		font-size: 13px;
	}
	.msg-content :global(li) {
		margin-left: 16px;
		margin-bottom: 2px;
	}
	.msg-content :global(strong) {
		color: var(--accent);
	}
	.msg-content :global(p) {
		margin-bottom: 4px;
	}

	/* Sources */
	.msg-sources {
		margin-top: 10px;
		padding-top: 8px;
		border-top: 1px solid var(--border);
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: center;
	}
	.sources-label {
		font-size: 10px;
		color: var(--text-subtle);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	.source-chip {
		font-size: 11px;
		padding: 2px 8px;
		border-radius: 10px;
		background: rgba(88, 166, 255, 0.1);
		color: var(--accent);
		text-decoration: none;
		border: 1px solid rgba(88, 166, 255, 0.2);
	}
	.source-chip:hover {
		background: rgba(88, 166, 255, 0.2);
		text-decoration: none;
	}

	/* Typing indicator */
	.typing-indicator {
		display: flex;
		gap: 4px;
		padding: 4px 0;
	}
	.typing-indicator span {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--text-subtle);
		animation: typing 1.4s infinite ease-in-out;
	}
	.typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
	.typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
	@keyframes typing {
		0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
		30% { transform: translateY(-6px); opacity: 1; }
	}

	/* Input */
	.chat-input-area {
		display: flex;
		gap: 8px;
		padding: 16px 24px;
		border-top: 1px solid var(--border);
		flex-shrink: 0;
	}
	.chat-input {
		flex: 1;
		padding: 10px 14px;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg);
		color: var(--text);
		font-size: 14px;
		font-family: var(--font-sans);
		resize: none;
		outline: none;
	}
	.chat-input:focus {
		border-color: var(--accent);
	}
	.chat-input:disabled {
		opacity: 0.5;
	}
	.send-btn {
		padding: 10px 20px;
		border-radius: var(--radius);
		border: none;
		background: var(--accent);
		color: #fff;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
		flex-shrink: 0;
	}
	.send-btn:hover:not(:disabled) {
		background: var(--accent-hover);
	}
	.send-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
