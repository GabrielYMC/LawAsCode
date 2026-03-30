<script lang="ts">
	import type { PageData } from './$types';
	import { ROLE_LABELS } from '$lib/types/user';

	let { data, form }: { data: PageData; form: any } = $props();

	let selectedUser = $state('');
	let email = $state(form?.email || '');
	let password = $state('');
	let loading = $state(false);

	const ROLE_ICONS: Record<string, string> = {
		president: '👔',
		speaker: '🏛️',
		legislator: '🗳️',
		secretary_general: '📋',
		secretariat: '📁',
		student: '🎓'
	};
</script>

<svelte:head>
	<title>登入 — LawAsCode</title>
</svelte:head>

<div class="login-page">
	<div class="login-card">
		<div class="login-header">
			<span class="logo-icon">⚖️</span>
			<h1>LawAsCode</h1>
			<p class="subtitle">淡江大學學生會數位法制平台</p>
		</div>

		{#if form?.error}
			<div class="error-msg">{form.error}</div>
		{/if}

		{#if data.usePocketBase}
			<!-- PocketBase 登入：帳號密碼 -->
			<div class="pb-notice">
				<span class="pb-badge">PROD</span>
				<span>使用帳號密碼登入</span>
			</div>

			<form method="POST" action="?/pbLogin">
				<input type="hidden" name="redirect" value={data.redirect} />

				<div class="form-group">
					<label for="email">電子郵件</label>
					<input
						type="email"
						id="email"
						name="email"
						bind:value={email}
						placeholder="your@email.com"
						required
						autocomplete="email"
					/>
				</div>

				<div class="form-group">
					<label for="password">密碼</label>
					<input
						type="password"
						id="password"
						name="password"
						bind:value={password}
						placeholder="輸入密碼"
						required
						autocomplete="current-password"
					/>
				</div>

				<button type="submit" class="login-btn" disabled={!email || !password || loading}>
					{loading ? '登入中...' : '登入'}
				</button>
			</form>
		{:else}
			<!-- Mock 登入：選擇角色 -->
			<div class="dev-notice">
				<span class="dev-badge">DEV</span>
				<span>開發模式：選擇角色登入</span>
			</div>

			<form method="POST" action="?/login">
				<input type="hidden" name="redirect" value={data.redirect} />

				<div class="user-grid">
					{#each data.devUsers as user}
						<label
							class="user-option"
							class:selected={selectedUser === user.id}
						>
							<input
								type="radio"
								name="userId"
								value={user.id}
								bind:group={selectedUser}
							/>
							<span class="user-icon">{ROLE_ICONS[user.role]}</span>
							<span class="user-name">{user.name}</span>
							<span class="user-role">{ROLE_LABELS[user.role]}</span>
						</label>
					{/each}
				</div>

				<button type="submit" class="login-btn" disabled={!selectedUser}>
					登入
				</button>
			</form>
		{/if}

		<div class="login-footer">
			{#if data.usePocketBase}
				<p>由 PocketBase 提供認證服務</p>
			{:else}
				<p>生產環境將串接 PocketBase 認證</p>
			{/if}
		</div>
	</div>
</div>

<style>
	.login-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--bg);
		padding: 20px;
	}

	.login-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		padding: 40px;
		width: 100%;
		max-width: 480px;
	}

	.login-header {
		text-align: center;
		margin-bottom: 28px;
	}
	.logo-icon {
		font-size: 48px;
		display: block;
		margin-bottom: 12px;
	}
	h1 {
		font-size: 24px;
		font-weight: 700;
		margin-bottom: 4px;
	}
	.subtitle {
		font-size: 13px;
		color: var(--text-muted);
	}

	.error-msg {
		background: rgba(248, 81, 73, 0.1);
		border: 1px solid rgba(248, 81, 73, 0.3);
		color: var(--error);
		padding: 10px 14px;
		border-radius: var(--radius);
		font-size: 13px;
		margin-bottom: 16px;
	}

	.dev-notice {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		background: rgba(210, 153, 34, 0.1);
		border: 1px solid rgba(210, 153, 34, 0.3);
		border-radius: var(--radius);
		font-size: 12px;
		color: var(--warning);
		margin-bottom: 20px;
	}
	.dev-badge {
		background: var(--warning);
		color: #000;
		padding: 1px 6px;
		border-radius: 4px;
		font-weight: 700;
		font-size: 10px;
	}

	.pb-notice {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		background: rgba(63, 185, 80, 0.1);
		border: 1px solid rgba(63, 185, 80, 0.3);
		border-radius: var(--radius);
		font-size: 12px;
		color: var(--success);
		margin-bottom: 20px;
	}
	.pb-badge {
		background: var(--success);
		color: #000;
		padding: 1px 6px;
		border-radius: 4px;
		font-weight: 700;
		font-size: 10px;
	}

	.form-group {
		margin-bottom: 16px;
	}
	.form-group label {
		display: block;
		font-size: 13px;
		font-weight: 600;
		color: var(--text);
		margin-bottom: 6px;
	}
	.form-group input {
		width: 100%;
		padding: 10px 12px;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--bg);
		color: var(--text);
		font-size: 14px;
		transition: border-color 0.15s;
		box-sizing: border-box;
	}
	.form-group input:focus {
		outline: none;
		border-color: var(--accent);
		box-shadow: 0 0 0 2px rgba(88, 166, 255, 0.15);
	}
	.form-group input::placeholder {
		color: var(--text-subtle);
	}

	.user-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
		margin-bottom: 20px;
	}

	.user-option {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 14px 8px;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		cursor: pointer;
		transition: all 0.15s;
		text-align: center;
	}
	.user-option:hover {
		border-color: var(--text-subtle);
		background: var(--surface-hover);
	}
	.user-option.selected {
		border-color: var(--accent);
		background: rgba(88, 166, 255, 0.08);
	}
	.user-option input[type='radio'] {
		display: none;
	}
	.user-icon {
		font-size: 24px;
	}
	.user-name {
		font-size: 13px;
		font-weight: 600;
		color: var(--text);
	}
	.user-role {
		font-size: 11px;
		color: var(--text-muted);
	}

	.login-btn {
		width: 100%;
		padding: 10px;
		border-radius: var(--radius);
		border: none;
		background: var(--accent);
		color: #fff;
		font-size: 14px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
	}
	.login-btn:hover:not(:disabled) {
		background: var(--accent-hover);
	}
	.login-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.login-footer {
		text-align: center;
		margin-top: 20px;
		font-size: 11px;
		color: var(--text-subtle);
	}
</style>
