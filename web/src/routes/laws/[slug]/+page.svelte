<script lang="ts">
	import type { PageData } from './$types';
	import type { AknNode } from '$lib/types/law';

	let { data }: { data: PageData } = $props();
	let { law } = data;

	// 預設展開所有章節
	let expandedChapters: Set<string> = $state(
		new Set(law.body.filter((n) => n.type === 'chapter').map((n) => n.eId))
	);

	function toggleChapter(eId: string) {
		if (expandedChapters.has(eId)) {
			expandedChapters.delete(eId);
		} else {
			expandedChapters.add(eId);
		}
		expandedChapters = new Set(expandedChapters);
	}

	function expandAll() {
		expandedChapters = new Set(
			law.body.filter((n) => n.type === 'chapter').map((n) => n.eId)
		);
	}

	function collapseAll() {
		expandedChapters = new Set();
	}
</script>

<svelte:head>
	<title>{law.meta.shortName} — LawAsCode</title>
</svelte:head>

<div class="law-page">
	<div class="law-header">
		<a href="/laws" class="breadcrumb">← 法規瀏覽</a>
		<h1>{law.meta.shortName}</h1>
		<p class="full-title">{law.meta.title}</p>

		{#if law.meta.history.length > 0}
			<details class="history">
				<summary>修訂歷程（{law.meta.history.length} 筆）</summary>
				<ul>
					{#each law.meta.history as entry}
						<li>
							<span class="history-date">{entry.date}</span>
							<span class="history-desc">{entry.description}</span>
						</li>
					{/each}
				</ul>
			</details>
		{/if}

		<div class="law-actions">
			<button onclick={expandAll} class="btn-sm">展開全部</button>
			<button onclick={collapseAll} class="btn-sm">收合全部</button>
		</div>
	</div>

	<div class="law-body">
		{#each law.body as node}
			{#if node.type === 'chapter'}
				<section class="chapter" id={node.eId}>
					<button
						class="chapter-header"
						onclick={() => toggleChapter(node.eId)}
						aria-expanded={expandedChapters.has(node.eId)}
					>
						<span class="chapter-toggle">{expandedChapters.has(node.eId) ? '▼' : '▶'}</span>
						<span class="chapter-num">{node.num}</span>
						<span class="chapter-heading">{node.heading}</span>
						<span class="chapter-count">{node.children.length} 條</span>
					</button>

					{#if expandedChapters.has(node.eId)}
						<div class="chapter-content">
							{#each node.children as article}
								{@render articleBlock(article)}
							{/each}
						</div>
					{/if}
				</section>
			{:else if node.type === 'article'}
				{@render articleBlock(node)}
			{/if}
		{/each}
	</div>
</div>

{#snippet articleBlock(article: AknNode)}
	<article class="article" id={article.eId}>
		<div class="article-header">
			<span class="article-num">{article.num}</span>
			{#if article.heading}
				<span class="article-heading">（{article.heading}）</span>
			{/if}
			<a href="#{article.eId}" class="article-link" title="複製連結">#</a>
		</div>
		<div class="article-body">
			{#each article.children as para}
				{@render paragraphBlock(para)}
			{/each}
		</div>
	</article>
{/snippet}

{#snippet paragraphBlock(para: AknNode)}
	<div class="paragraph" id={para.eId}>
		{#if para.text}
			<p>{para.text}</p>
		{/if}
		{#each para.children as child}
			{#if child.type === 'list'}
				<ol class="law-list">
					{#each child.children as item}
						<li id={item.eId}>
							{#if item.num}<span class="item-num">{item.num}</span>{/if}
							{item.text || ''}
						</li>
					{/each}
				</ol>
			{:else if child.type === 'content' && child.text}
				<p>{child.text}</p>
			{/if}
		{/each}
	</div>
{/snippet}

<style>
	.law-page {
		max-width: 860px;
	}

	.breadcrumb {
		font-size: 13px;
		color: var(--text-muted);
		display: inline-block;
		margin-bottom: 12px;
	}
	.breadcrumb:hover { color: var(--accent); }

	h1 {
		font-size: 26px;
		font-weight: 700;
		margin-bottom: 4px;
	}
	.full-title {
		color: var(--text-muted);
		font-size: 14px;
		margin-bottom: 16px;
	}

	/* History */
	.history {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 12px 16px;
		margin-bottom: 16px;
		font-size: 13px;
	}
	.history summary {
		cursor: pointer;
		color: var(--text-muted);
		font-weight: 600;
	}
	.history ul {
		list-style: none;
		margin-top: 8px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.history-date {
		color: var(--accent);
		font-family: var(--font-mono);
		font-size: 12px;
		margin-right: 8px;
	}
	.history-desc { color: var(--text-muted); }

	.law-actions {
		display: flex;
		gap: 8px;
		margin-bottom: 24px;
	}
	.btn-sm {
		padding: 4px 12px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--text-muted);
		cursor: pointer;
		font-size: 12px;
		font-family: inherit;
		transition: all 0.15s;
	}
	.btn-sm:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

	/* Chapter */
	.chapter {
		margin-bottom: 4px;
	}
	.chapter-header {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 12px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		cursor: pointer;
		font-family: inherit;
		font-size: 15px;
		color: var(--text);
		text-align: left;
		transition: all 0.15s;
	}
	.chapter-header:hover {
		border-color: var(--accent);
	}
	.chapter-toggle {
		font-size: 10px;
		color: var(--text-muted);
		width: 16px;
	}
	.chapter-num { font-weight: 600; }
	.chapter-heading { color: var(--text); }
	.chapter-count {
		margin-left: auto;
		font-size: 12px;
		color: var(--text-subtle);
		font-family: var(--font-mono);
	}
	.chapter-content {
		padding: 8px 0 16px 20px;
		border-left: 2px solid var(--border);
		margin-left: 20px;
	}

	/* Article */
	.article {
		padding: 12px 0;
		border-bottom: 1px solid rgba(48, 54, 61, 0.5);
	}
	.article:last-child { border-bottom: none; }

	.article-header {
		display: flex;
		align-items: baseline;
		gap: 4px;
		margin-bottom: 8px;
	}
	.article-num {
		font-weight: 700;
		color: var(--accent);
		font-size: 15px;
	}
	.article-heading {
		color: var(--text-muted);
		font-size: 14px;
	}
	.article-link {
		margin-left: 8px;
		font-size: 12px;
		color: var(--text-subtle);
		opacity: 0;
		transition: opacity 0.15s;
	}
	.article:hover .article-link { opacity: 1; }

	.article-body {
		font-size: 15px;
		line-height: 1.8;
		color: var(--text);
	}

	/* Paragraph */
	.paragraph {
		margin-bottom: 4px;
	}
	.paragraph p {
		text-indent: 2em;
	}

	/* List */
	.law-list {
		list-style: none;
		padding-left: 2em;
		margin: 4px 0;
	}
	.law-list li {
		margin-bottom: 2px;
		line-height: 1.8;
	}
	.item-num {
		color: var(--text-muted);
		margin-right: 4px;
		font-family: var(--font-mono);
		font-size: 13px;
	}
</style>
