<svelte:head>
	<title>無權限 — LawAsCode</title>
</svelte:head>

<div class="unauthorized-page">
	<div class="unauthorized-card">
		<span class="icon">🚫</span>
		<h1>無存取權限</h1>
		<p>你的帳號角色無權存取此頁面。</p>
		<p class="hint">如需存取，請聯繫系統管理員調整角色。</p>
		<div class="actions">
			<a href="/" class="btn">返回首頁</a>
			<form method="POST" action="/logout" style="display:inline">
				<button type="submit" class="btn btn-outline">切換帳號</button>
			</form>
		</div>
	</div>
</div>

<style>
	.unauthorized-page {
		min-height: 60vh;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.unauthorized-card {
		text-align: center;
		max-width: 400px;
	}
	.icon {
		font-size: 48px;
		display: block;
		margin-bottom: 16px;
	}
	h1 {
		font-size: 22px;
		font-weight: 700;
		margin-bottom: 8px;
	}
	p {
		color: var(--text-muted);
		font-size: 14px;
		margin-bottom: 4px;
	}
	.hint {
		font-size: 13px;
		color: var(--text-subtle);
		margin-bottom: 24px;
	}
	.actions {
		display: flex;
		gap: 10px;
		justify-content: center;
	}
	.btn {
		padding: 8px 20px;
		border-radius: var(--radius);
		font-size: 13px;
		font-weight: 500;
		text-decoration: none;
		border: none;
		cursor: pointer;
		background: var(--accent);
		color: #fff;
	}
	.btn-outline {
		background: transparent;
		border: 1px solid var(--border);
		color: var(--text-muted);
	}
</style>
