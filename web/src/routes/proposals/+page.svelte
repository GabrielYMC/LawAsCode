<script lang="ts">
	import type { PageData } from './$types';
	import { STATE_LABELS, STATE_COLORS } from '$lib/types/workflow';
	import { Role } from '$lib/types/user';

	let { data }: { data: PageData } = $props();

	const PROPOSAL_ROLES = [Role.LEGISLATOR, Role.PRESIDENT, Role.SPEAKER];
	let canPropose = $derived(data.user && PROPOSAL_ROLES.includes(data.user.role));
</script>

<svelte:head>
	<title>提案審議 — LawAsCode</title>
</svelte:head>

<div class="page-header">
	<div>
		<h1>提案審議</h1>
		<p class="subtitle">{data.proposals.length} 件提案</p>
	</div>
	{#if canPropose}
		<a href="/proposals/new" class="new-proposal-btn">+ 新增提案</a>
	{/if}
</div>

<div class="proposal-list">
	{#each data.proposals as proposal}
		<a href="/proposals/{proposal.id}" class="proposal-card">
			<div class="proposal-header">
				<span
					class="state-badge"
					style="background: {STATE_COLORS[proposal.state]}20; color: {STATE_COLORS[proposal.state]}; border-color: {STATE_COLORS[proposal.state]}40"
				>
					{STATE_LABELS[proposal.state]}
				</span>
				<span class="proposal-date">{proposal.updatedAt.split('T')[0]}</span>
			</div>
			<h2 class="proposal-title">{proposal.title}</h2>
			<p class="proposal-desc">{proposal.description}</p>
			<div class="proposal-meta">
				<span class="meta-item">📌 {proposal.targetLaw}</span>
				<span class="meta-item">👤 {proposal.proposer}</span>
				<span class="meta-item">📝 {proposal.amendments.length} 條修正</span>
			</div>
		</a>
	{/each}
</div>

<style>
	.page-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		margin-bottom: 24px;
	}
	h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
	.subtitle { color: var(--text-muted); font-size: 14px; }

	.new-proposal-btn {
		padding: 8px 18px;
		border-radius: var(--radius);
		background: var(--accent);
		color: #fff;
		font-size: 13px;
		font-weight: 500;
		text-decoration: none;
		white-space: nowrap;
	}
	.new-proposal-btn:hover {
		background: var(--accent-hover);
		text-decoration: none;
		color: #fff;
	}

	.proposal-list {
		display: flex;
		flex-direction: column;
		gap: 12px;
		max-width: 800px;
	}

	.proposal-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		transition: all 0.15s;
		text-decoration: none;
	}
	.proposal-card:hover {
		border-color: var(--accent);
		background: var(--surface-hover);
		text-decoration: none;
	}

	.proposal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.state-badge {
		font-size: 12px;
		font-weight: 600;
		padding: 2px 10px;
		border-radius: 12px;
		border: 1px solid;
	}

	.proposal-date {
		font-size: 12px;
		color: var(--text-subtle);
		font-family: var(--font-mono);
	}

	.proposal-title {
		font-size: 16px;
		font-weight: 600;
		color: var(--text);
	}

	.proposal-desc {
		font-size: 14px;
		color: var(--text-muted);
		line-height: 1.5;
	}

	.proposal-meta {
		display: flex;
		gap: 16px;
		font-size: 12px;
		color: var(--text-subtle);
	}
</style>
