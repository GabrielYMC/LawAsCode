<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>法規瀏覽 — LawAsCode</title>
</svelte:head>

<h1>法規瀏覽</h1>
<p class="subtitle">共 {data.totalCount} 部現行法規</p>

{#each data.categories as category}
	{#if category.laws.length > 0}
		<section class="category">
			<h2>{category.label}</h2>
			<div class="law-grid">
				{#each category.laws as law}
					<a href="/laws/{law.slug}" class="law-card">
						<div class="law-title">{law.shortName}</div>
						<div class="law-stats">
							{#if law.chapterCount > 0}
								<span class="law-stat">{law.chapterCount} 章</span>
							{/if}
							<span class="law-stat">{law.articleCount} 條</span>
						</div>
						{#if law.history.length > 0}
							<div class="law-date">
								最後修訂：{law.history[law.history.length - 1].date}
							</div>
						{/if}
					</a>
				{/each}
			</div>
		</section>
	{/if}
{/each}

<style>
	h1 {
		font-size: 24px;
		font-weight: 700;
		margin-bottom: 4px;
	}
	.subtitle {
		color: var(--text-muted);
		font-size: 14px;
		margin-bottom: 32px;
	}

	.category {
		margin-bottom: 32px;
	}
	.category h2 {
		font-size: 14px;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 12px;
		padding-bottom: 8px;
		border-bottom: 1px solid var(--border);
	}

	.law-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
		gap: 12px;
	}

	.law-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		transition: all 0.15s;
		text-decoration: none;
	}
	.law-card:hover {
		border-color: var(--accent);
		background: var(--surface-hover);
		text-decoration: none;
	}

	.law-title {
		font-size: 15px;
		font-weight: 600;
		color: var(--text);
	}
	.law-stats {
		display: flex;
		gap: 12px;
	}
	.law-stat {
		font-size: 12px;
		color: var(--text-muted);
		font-family: var(--font-mono);
	}
	.law-date {
		font-size: 11px;
		color: var(--text-subtle);
	}
</style>
