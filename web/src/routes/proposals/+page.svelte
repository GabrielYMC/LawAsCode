<svelte:head>
	<title>提案審議 — LawAsCode</title>
</svelte:head>

<h1>提案審議</h1>
<p class="subtitle">目前沒有進行中的提案</p>

<div class="empty">
	<span class="empty-icon">📋</span>
	<p>此功能開發中</p>
	<p class="empty-hint">提案系統將在 Gitea 部署後啟用</p>
</div>

<style>
	h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
	.subtitle { color: var(--text-muted); font-size: 14px; margin-bottom: 40px; }
	.empty {
		text-align: center;
		padding: 80px 0;
		color: var(--text-muted);
	}
	.empty-icon { font-size: 64px; display: block; margin-bottom: 16px; }
	.empty-hint { font-size: 13px; color: var(--text-subtle); margin-top: 8px; }
</style>
