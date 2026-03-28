<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let searchInput = $state(data.query);

	function handleSearch(e: Event) {
		e.preventDefault();
		if (searchInput.trim()) {
			goto(`/search?q=${encodeURIComponent(searchInput.trim())}`);
		}
	}
</script>

<svelte:head>
	<title>搜尋 — LawAsCode</title>
</svelte:head>

<h1>搜尋條文</h1>

<form onsubmit={handleSearch} class="search-form">
	<input
		type="text"
		bind:value={searchInput}
		placeholder="輸入關鍵字搜尋所有法規條文..."
		class="search-input"
		autofocus
	/>
	<button type="submit" class="search-btn">搜尋</button>
</form>

{#if data.query}
	<p class="result-count">
		找到 {data.results.length} 部法規中的相關條文
	</p>

	{#each data.results as result}
		<div class="result-group">
			<h2>
				<a href="/laws/{result.law.slug}">{result.law.shortName}</a>
			</h2>
			{#each result.matches as match}
				<a href="/laws/{result.law.slug}#{match.eId}" class="result-item">
					<span class="result-article">
						{match.articleNum}
						{#if match.articleHeading}（{match.articleHeading}）{/if}
					</span>
					<span class="result-text">{match.text.slice(0, 120)}...</span>
				</a>
			{/each}
		</div>
	{/each}

	{#if data.results.length === 0}
		<div class="no-results">
			<span class="no-icon">🔍</span>
			<p>沒有找到包含「{data.query}」的條文</p>
		</div>
	{/if}
{/if}

<style>
	h1 {
		font-size: 24px;
		font-weight: 700;
		margin-bottom: 16px;
	}

	.search-form {
		display: flex;
		gap: 8px;
		margin-bottom: 24px;
	}
	.search-input {
		flex: 1;
		padding: 10px 16px;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--text);
		font-size: 15px;
		font-family: inherit;
		outline: none;
	}
	.search-input:focus { border-color: var(--accent); }
	.search-btn {
		padding: 10px 20px;
		border-radius: var(--radius);
		border: 1px solid var(--accent);
		background: var(--accent);
		color: #fff;
		font-size: 14px;
		font-family: inherit;
		cursor: pointer;
	}

	.result-count {
		color: var(--text-muted);
		font-size: 14px;
		margin-bottom: 20px;
	}

	.result-group {
		margin-bottom: 24px;
	}
	.result-group h2 {
		font-size: 16px;
		margin-bottom: 8px;
	}

	.result-item {
		display: block;
		padding: 10px 14px;
		border-left: 3px solid var(--border);
		margin-bottom: 4px;
		transition: all 0.15s;
		text-decoration: none;
	}
	.result-item:hover {
		border-left-color: var(--accent);
		background: var(--surface);
		text-decoration: none;
	}
	.result-article {
		font-size: 13px;
		font-weight: 600;
		color: var(--accent);
		display: block;
		margin-bottom: 2px;
	}
	.result-text {
		font-size: 13px;
		color: var(--text-muted);
		line-height: 1.5;
	}

	.no-results {
		text-align: center;
		padding: 60px;
		color: var(--text-muted);
	}
	.no-icon { font-size: 48px; display: block; margin-bottom: 12px; }
</style>
