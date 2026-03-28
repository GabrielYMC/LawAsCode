<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>LawAsCode — 淡江大學學生會</title>
</svelte:head>

<div class="dashboard">
	<h1>淡江大學學生會法規系統</h1>
	<p class="subtitle">法規開源 · 數位法治 · 全面參與</p>

	<div class="stats">
		<div class="stat-card">
			<span class="stat-number">{data.lawCount}</span>
			<span class="stat-label">部法規</span>
		</div>
		<div class="stat-card">
			<span class="stat-number">{data.articleCount}</span>
			<span class="stat-label">條條文</span>
		</div>
		<div class="stat-card">
			<span class="stat-number">0</span>
			<span class="stat-label">審議中提案</span>
		</div>
	</div>

	<div class="quick-links">
		<a href="/laws" class="quick-link">
			<span class="ql-icon">📜</span>
			<span class="ql-title">瀏覽法規</span>
			<span class="ql-desc">查看所有現行法規條文</span>
		</a>
		<a href="/search" class="quick-link">
			<span class="ql-icon">🔍</span>
			<span class="ql-title">搜尋條文</span>
			<span class="ql-desc">全文搜尋法規內容</span>
		</a>
		<a href="/proposals" class="quick-link">
			<span class="ql-icon">📋</span>
			<span class="ql-title">提案審議</span>
			<span class="ql-desc">查看與參與修法提案</span>
		</a>
	</div>
</div>

<style>
	.dashboard { max-width: 800px; }

	h1 {
		font-size: 28px;
		font-weight: 700;
		margin-bottom: 8px;
	}
	.subtitle {
		color: var(--text-muted);
		font-size: 16px;
		margin-bottom: 32px;
	}

	.stats {
		display: flex;
		gap: 16px;
		margin-bottom: 40px;
	}
	.stat-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 20px 24px;
		display: flex;
		flex-direction: column;
		min-width: 140px;
	}
	.stat-number {
		font-size: 32px;
		font-weight: 700;
		color: var(--accent);
		font-family: var(--font-mono);
	}
	.stat-label {
		font-size: 13px;
		color: var(--text-muted);
		margin-top: 4px;
	}

	.quick-links {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}
	.quick-link {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		transition: all 0.15s;
		text-decoration: none;
	}
	.quick-link:hover {
		border-color: var(--accent);
		background: var(--surface-hover);
		text-decoration: none;
	}
	.ql-icon { font-size: 28px; }
	.ql-title {
		font-size: 16px;
		font-weight: 600;
		color: var(--text);
	}
	.ql-desc {
		font-size: 13px;
		color: var(--text-muted);
	}
</style>
