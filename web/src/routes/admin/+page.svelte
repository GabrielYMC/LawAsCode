<script lang="ts">
	import type { PageData } from './$types';

	let { data, form }: { data: PageData; form: any } = $props();

	let config = $derived(form?.config ?? data.config);

	// Ollama 連線測試
	let testStatus = $state<'idle' | 'testing' | 'ok' | 'fail'>('idle');
	let testMessage = $state('');

	async function testOllamaConnection() {
		testStatus = 'testing';
		testMessage = '';
		try {
			const res = await fetch(config.llm.baseUrl + '/api/tags');
			if (res.ok) {
				const data = await res.json();
				const models = data.models?.map((m: any) => m.name).join(', ') || '(無模型)';
				testStatus = 'ok';
				testMessage = `連線成功，可用模型：${models}`;
			} else {
				testStatus = 'fail';
				testMessage = `HTTP ${res.status}`;
			}
		} catch (e: any) {
			testStatus = 'fail';
			testMessage = `無法連線：${e.message}`;
		}
	}
</script>

<svelte:head>
	<title>系統設定 — LawAsCode</title>
</svelte:head>

<h1>系統設定</h1>
<p class="subtitle">管理 LawAsCode 平台的所有參數設定</p>

{#if form?.success}
	<div class="toast success">
		{form.reset ? '已重置為預設值' : '設定已儲存'}
	</div>
{/if}
{#if form?.error}
	<div class="toast error">{form.error}</div>
{/if}

<form method="POST" action="?/save">
	<!-- AI / LLM 設定 -->
	<section class="config-section">
		<div class="section-header">
			<h2>🤖 AI 語言模型</h2>
			<p>設定 AI 法規顧問使用的語言模型</p>
		</div>

		<div class="field-group">
			<label class="field">
				<span class="field-label">模型提供者</span>
				<select name="llm_provider" value={config.llm.provider}>
					<option value="mock">Mock（模擬回覆）</option>
					<option value="ollama">Ollama（本地部署）</option>
				</select>
			</label>

			<label class="field">
				<span class="field-label">Ollama API 位址</span>
				<div class="field-with-btn">
					<input type="text" name="llm_baseUrl" value={config.llm.baseUrl} placeholder="http://localhost:11434" />
					<button type="button" class="test-btn" onclick={testOllamaConnection} disabled={testStatus === 'testing'}>
						{testStatus === 'testing' ? '測試中...' : '測試連線'}
					</button>
				</div>
				{#if testStatus === 'ok'}
					<span class="field-hint success">{testMessage}</span>
				{:else if testStatus === 'fail'}
					<span class="field-hint error">{testMessage}</span>
				{/if}
			</label>

			<label class="field">
				<span class="field-label">模型名稱</span>
				<input type="text" name="llm_model" value={config.llm.model} placeholder="gemma3:12b" />
				<span class="field-hint">Ollama 已下載的模型名稱</span>
			</label>

			<div class="field-row">
				<label class="field">
					<span class="field-label">Temperature</span>
					<input type="number" name="llm_temperature" value={config.llm.temperature} min="0" max="2" step="0.1" />
					<span class="field-hint">越低越精確，建議法規用途設 0.1-0.3</span>
				</label>

				<label class="field">
					<span class="field-label">最大 Token 數</span>
					<input type="number" name="llm_maxTokens" value={config.llm.maxTokens} min="128" max="4096" step="128" />
				</label>
			</div>
		</div>
	</section>

	<!-- AI 顧問提示詞 -->
	<section class="config-section">
		<div class="section-header">
			<h2>💬 AI 顧問提示詞</h2>
			<p>自訂 AI 顧問三種模式的系統指令（System Prompt）</p>
		</div>

		<div class="field-group">
			<label class="field">
				<span class="field-label">基礎角色設定（所有模式共用）</span>
				<textarea name="prompt_base" rows="2" class="prompt-textarea">{config.prompts.base}</textarea>
			</label>

			<label class="field">
				<span class="field-label">💬 法規諮詢（一般同學）</span>
				<textarea name="prompt_general" rows="5" class="prompt-textarea">{config.prompts.general}</textarea>
			</label>

			<label class="field">
				<span class="field-label">📝 修法輔助（議員）</span>
				<textarea name="prompt_legislative" rows="5" class="prompt-textarea">{config.prompts.legislative}</textarea>
			</label>

			<label class="field">
				<span class="field-label">🔍 法規健檢（提案檢查）</span>
				<textarea name="prompt_compliance" rows="6" class="prompt-textarea">{config.prompts.compliance}</textarea>
			</label>
		</div>
	</section>

	<!-- 搜尋設定 -->
	<section class="config-section">
		<div class="section-header">
			<h2>🔍 法規搜尋</h2>
			<p>設定 AI 顧問的法規檢索引擎</p>
		</div>

		<div class="field-group">
			<label class="field">
				<span class="field-label">搜尋引擎</span>
				<select name="search_provider" value={config.search.provider}>
					<option value="fuse">Fuse.js（關鍵字搜尋）</option>
					<option value="embedding">Embedding（語意搜尋）</option>
				</select>
				<span class="field-hint">Embedding 需搭配 Ollama 使用</span>
			</label>

			<div class="field-row">
				<label class="field">
					<span class="field-label">匹配閾值</span>
					<input type="number" name="search_threshold" value={config.search.threshold} min="0" max="1" step="0.05" />
					<span class="field-hint">0=完全匹配 1=寬鬆匹配</span>
				</label>

				<label class="field">
					<span class="field-label">最大結果數</span>
					<input type="number" name="search_maxResults" value={config.search.maxResults} min="1" max="20" />
				</label>
			</div>
		</div>
	</section>

	<!-- Gitea 設定 -->
	<section class="config-section">
		<div class="section-header">
			<h2>📦 Gitea 法規倉庫</h2>
			<p>Git 版本控制伺服器，儲存法規正式版本</p>
		</div>

		<div class="field-group">
			<label class="field toggle-field">
				<input type="checkbox" name="gitea_enabled" checked={config.gitea.enabled} />
				<span class="field-label">啟用 Gitea 整合</span>
				<span class="field-hint">關閉時使用本地檔案系統</span>
			</label>

			<label class="field">
				<span class="field-label">Gitea API 位址</span>
				<input type="text" name="gitea_baseUrl" value={config.gitea.baseUrl} placeholder="http://localhost:3000" />
			</label>

			<div class="field-row">
				<label class="field">
					<span class="field-label">Owner</span>
					<input type="text" name="gitea_owner" value={config.gitea.owner} />
				</label>
				<label class="field">
					<span class="field-label">Repository</span>
					<input type="text" name="gitea_repo" value={config.gitea.repo} />
				</label>
			</div>

			<label class="field">
				<span class="field-label">API Token</span>
				<input type="password" name="gitea_token" value={config.gitea.token} placeholder="輸入 Gitea API Token" />
				<span class="field-hint">具有 repo 權限的存取令牌</span>
			</label>
		</div>
	</section>

	<!-- PocketBase 設定 -->
	<section class="config-section">
		<div class="section-header">
			<h2>🔐 PocketBase 認證</h2>
			<p>使用者帳號、角色權限、投票紀錄</p>
		</div>

		<div class="field-group">
			<label class="field toggle-field">
				<input type="checkbox" name="pb_enabled" checked={config.pocketbase.enabled} />
				<span class="field-label">啟用 PocketBase 整合</span>
				<span class="field-hint">關閉時使用 Mock 認證</span>
			</label>

			<label class="field">
				<span class="field-label">PocketBase 位址</span>
				<input type="text" name="pb_baseUrl" value={config.pocketbase.baseUrl} placeholder="http://localhost:8090" />
			</label>
		</div>
	</section>

	<!-- 展示模式 -->
	<section class="config-section">
		<div class="section-header">
			<h2>🎭 展示模式</h2>
			<p>允許外部訪客以預設角色體驗系統，無需 PocketBase 帳號</p>
		</div>

		<div class="field-group">
			<label class="field toggle-field">
				<input type="checkbox" name="demo_enabled" checked={config.demo.enabled} />
				<span class="field-label">啟用展示模式</span>
				<span class="field-hint">登入頁將顯示「以角色身份體驗」選項</span>
			</label>
		</div>
	</section>

	<!-- 議事設定 -->
	<section class="config-section">
		<div class="section-header">
			<h2>🏛️ 議事流程</h2>
			<p>法規修訂流程相關參數</p>
		</div>

		<div class="field-group">
			<label class="field">
				<span class="field-label">會長公布期限（天）</span>
				<input type="number" name="leg_deadline" value={config.legislative.promulgationDeadlineDays} min="1" max="60" />
				<span class="field-hint">法規標準規則§5 規定為 14 天</span>
			</label>

			<label class="field toggle-field">
				<input type="checkbox" name="leg_autoPromulgation" checked={config.legislative.autoPromulgation} />
				<span class="field-label">逾期自動公布</span>
				<span class="field-hint">會長未於期限內公布，由秘書處帳號自動執行 Merge</span>
			</label>
		</div>
	</section>

	<!-- 按鈕列 -->
	<div class="form-actions">
		<button type="submit" class="btn-primary">儲存設定</button>
		<button type="submit" formaction="?/reset" class="btn-outline">重置為預設值</button>
	</div>
</form>

<style>
	h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
	.subtitle { color: var(--text-muted); font-size: 14px; margin-bottom: 24px; }

	.toast {
		padding: 10px 16px;
		border-radius: var(--radius);
		font-size: 13px;
		margin-bottom: 20px;
	}
	.toast.success {
		background: rgba(63, 185, 80, 0.1);
		border: 1px solid rgba(63, 185, 80, 0.3);
		color: var(--success);
	}
	.toast.error {
		background: rgba(248, 81, 73, 0.1);
		border: 1px solid rgba(248, 81, 73, 0.3);
		color: var(--error);
	}

	.config-section {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		margin-bottom: 16px;
		overflow: hidden;
	}
	.section-header {
		padding: 16px 20px;
		border-bottom: 1px solid var(--border);
	}
	.section-header h2 {
		font-size: 15px;
		font-weight: 600;
		margin-bottom: 2px;
	}
	.section-header p {
		font-size: 12px;
		color: var(--text-muted);
	}

	.field-group {
		padding: 16px 20px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.field-label {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-muted);
	}
	.field-hint {
		font-size: 11px;
		color: var(--text-subtle);
	}
	.field-hint.success { color: var(--success); }
	.field-hint.error { color: var(--error); }

	.field input[type="text"],
	.field input[type="password"],
	.field input[type="number"],
	.field select {
		padding: 8px 12px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg);
		color: var(--text);
		font-size: 13px;
		font-family: var(--font-mono);
	}
	.field select {
		font-family: var(--font-sans);
	}
	.field textarea.prompt-textarea {
		padding: 8px 12px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg);
		color: var(--text);
		font-size: 13px;
		font-family: var(--font-sans);
		line-height: 1.6;
		resize: vertical;
	}
	.field input:focus,
	.field select:focus,
	.field textarea:focus {
		outline: none;
		border-color: var(--accent);
	}

	.field-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}

	.field-with-btn {
		display: flex;
		gap: 8px;
	}
	.field-with-btn input {
		flex: 1;
	}
	.test-btn {
		padding: 8px 14px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--surface-hover);
		color: var(--text);
		font-size: 12px;
		cursor: pointer;
		white-space: nowrap;
	}
	.test-btn:hover:not(:disabled) {
		border-color: var(--accent);
		color: var(--accent);
	}
	.test-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.toggle-field {
		flex-direction: row;
		align-items: center;
		gap: 10px;
	}
	.toggle-field input[type="checkbox"] {
		width: 16px;
		height: 16px;
		accent-color: var(--accent);
	}
	.toggle-field .field-hint {
		margin-left: auto;
	}

	.form-actions {
		display: flex;
		gap: 10px;
		margin-top: 8px;
		margin-bottom: 32px;
	}
	.btn-primary {
		padding: 10px 24px;
		border-radius: var(--radius);
		border: none;
		background: var(--accent);
		color: #fff;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
	}
	.btn-primary:hover { background: var(--accent-hover); }
	.btn-outline {
		padding: 10px 24px;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: transparent;
		color: var(--text-muted);
		font-size: 14px;
		cursor: pointer;
	}
	.btn-outline:hover {
		border-color: var(--error);
		color: var(--error);
	}
</style>
