<script lang="ts">
	import type { PageData } from './$types';
	import { STATE_LABELS, STATE_COLORS } from '$lib/types/workflow';
	import { ROLE_LABELS } from '$lib/types/user';
	import { goto, invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	const ROLE_DESCRIPTIONS: Record<string, string> = {
		speaker: '管理議事流程，主持一讀至三讀程序',
		president: '公布通過之法規，行使否決權',
		secretary_general: '排入議程，管理提案收受'
	};

	let actionLoading = $state<string | null>(null);
	let actionMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	async function handleAction(proposalId: string, action: any) {
		actionLoading = `${proposalId}-${action.label}`;
		actionMessage = null;

		try {
			if (action.requiresVote) {
				// 需要投票的操作：發起投票後跳轉到提案詳情頁
				const res = await fetch(`/api/proposals/${proposalId}/vote`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ action: 'create', transitionLabel: action.label })
				});
				const result = await res.json();
				if (result.success) {
					goto(`/proposals/${proposalId}`);
				} else {
					actionMessage = { type: 'error', text: result.error };
				}
			} else {
				// 不需要投票：直接執行狀態轉移
				const res = await fetch(`/api/proposals/${proposalId}/transition`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ transitionLabel: action.label })
				});
				const result = await res.json();
				if (result.success) {
					actionMessage = { type: 'success', text: `已執行「${action.label}」` };
					await invalidateAll();
				} else {
					actionMessage = { type: 'error', text: result.error };
				}
			}
		} catch (e: any) {
			actionMessage = { type: 'error', text: `操作失敗：${e.message}` };
		} finally {
			actionLoading = null;
		}
	}
</script>

<svelte:head>
	<title>控制台 — LawAsCode</title>
</svelte:head>

<div class="dashboard-header">
	<h1>控制台</h1>
	{#if data.user}
		<div class="role-badge">
			{ROLE_LABELS[data.user.role]}
		</div>
	{/if}
</div>

{#if data.user}
	<p class="role-desc">{ROLE_DESCRIPTIONS[data.user.role] ?? ''}</p>
{/if}

{#if actionMessage}
	<div class="toast {actionMessage.type}">
		{actionMessage.text}
	</div>
{/if}

<!-- 統計卡片 -->
<div class="stat-cards">
	<div class="stat-card">
		<div class="stat-number">{data.stats.total}</div>
		<div class="stat-label">總提案數</div>
	</div>
	<div class="stat-card highlight">
		<div class="stat-number">{data.stats.pending}</div>
		<div class="stat-label">待處理</div>
	</div>
</div>

<!-- 待處理提案 -->
<section class="section">
	<h2 class="section-title">
		待處理提案
		{#if data.myQueue.length === 0}
			<span class="empty-hint">— 目前無待處理項目</span>
		{/if}
	</h2>

	{#each data.myQueue as proposal}
		<div class="action-card">
			<div class="action-card-header">
				<a href="/proposals/{proposal.id}" class="proposal-link">
					<span
						class="state-badge"
						style="background: {STATE_COLORS[proposal.state]}20; color: {STATE_COLORS[proposal.state]}; border-color: {STATE_COLORS[proposal.state]}40"
					>
						{STATE_LABELS[proposal.state]}
					</span>
					<span class="proposal-title">{proposal.title}</span>
				</a>
				<span class="proposal-date">{proposal.updatedAt.split('T')[0]}</span>
			</div>

			<p class="proposal-desc">{proposal.description}</p>

			<div class="proposal-info">
				<span>📌 {proposal.targetLaw}</span>
				<span>👤 {proposal.proposer}</span>
				<span>📝 {proposal.amendments.length} 條修正</span>
			</div>

			<div class="action-buttons">
				{#each proposal.myActions as action}
					<button
						class="action-btn"
						title={action.description}
						disabled={actionLoading !== null}
						onclick={() => handleAction(proposal.id, action)}
					>
						{#if actionLoading === `${proposal.id}-${action.label}`}
							執行中...
						{:else}
							{action.label}
							{#if action.requiresVote}
								<span class="vote-tag">需表決</span>
							{/if}
						{/if}
					</button>
				{/each}
				<a href="/proposals/{proposal.id}" class="detail-link">查看詳情 →</a>
			</div>
		</div>
	{/each}
</section>

<!-- 全部提案概覽 -->
<section class="section">
	<h2 class="section-title">全部提案概覽</h2>

	<div class="overview-table">
		<div class="table-header">
			<span class="col-status">狀態</span>
			<span class="col-title">提案名稱</span>
			<span class="col-proposer">提案人</span>
			<span class="col-date">更新日期</span>
		</div>
		{#each data.proposals as proposal}
			<a href="/proposals/{proposal.id}" class="table-row">
				<span class="col-status">
					<span
						class="state-dot"
						style="background: {STATE_COLORS[proposal.state]}"
						title={STATE_LABELS[proposal.state]}
					></span>
					{STATE_LABELS[proposal.state]}
				</span>
				<span class="col-title">{proposal.title}</span>
				<span class="col-proposer">{proposal.proposer}</span>
				<span class="col-date mono">{proposal.updatedAt.split('T')[0]}</span>
			</a>
		{/each}
	</div>
</section>

<style>
	/* Header */
	.dashboard-header {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 8px;
	}
	h1 {
		font-size: 24px;
		font-weight: 700;
	}
	.role-badge {
		padding: 4px 12px;
		border-radius: 12px;
		background: rgba(88, 166, 255, 0.15);
		color: var(--accent);
		font-size: 13px;
		font-weight: 600;
	}

	.role-desc {
		color: var(--text-muted);
		font-size: 13px;
		margin-bottom: 20px;
	}

	/* Toast */
	.toast {
		padding: 10px 16px;
		border-radius: var(--radius);
		font-size: 13px;
		margin-bottom: 16px;
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

	/* Stats */
	.stat-cards {
		display: flex;
		gap: 12px;
		margin-bottom: 28px;
	}
	.stat-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 16px 24px;
		min-width: 120px;
	}
	.stat-card.highlight {
		border-color: var(--accent);
		background: rgba(88, 166, 255, 0.05);
	}
	.stat-number {
		font-size: 28px;
		font-weight: 700;
		color: var(--text);
	}
	.stat-card.highlight .stat-number {
		color: var(--accent);
	}
	.stat-label {
		font-size: 12px;
		color: var(--text-subtle);
		margin-top: 2px;
	}

	/* Section */
	.section {
		margin-bottom: 32px;
	}
	.section-title {
		font-size: 16px;
		font-weight: 600;
		margin-bottom: 14px;
		padding-bottom: 8px;
		border-bottom: 1px solid var(--border);
	}
	.empty-hint {
		font-weight: 400;
		color: var(--text-subtle);
		font-size: 14px;
	}

	/* Action Cards */
	.action-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 18px;
		margin-bottom: 12px;
	}
	.action-card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8px;
	}
	.proposal-link {
		display: flex;
		align-items: center;
		gap: 10px;
		text-decoration: none;
	}
	.proposal-link:hover .proposal-title {
		color: var(--accent);
	}
	.state-badge {
		font-size: 11px;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 12px;
		border: 1px solid;
		flex-shrink: 0;
	}
	.proposal-title {
		font-size: 15px;
		font-weight: 600;
		color: var(--text);
		transition: color 0.15s;
	}
	.proposal-date {
		font-size: 12px;
		color: var(--text-subtle);
		font-family: var(--font-mono);
		flex-shrink: 0;
	}

	.proposal-desc {
		font-size: 13px;
		color: var(--text-muted);
		margin-bottom: 10px;
		line-height: 1.5;
	}
	.proposal-info {
		display: flex;
		gap: 14px;
		font-size: 12px;
		color: var(--text-subtle);
		margin-bottom: 14px;
	}

	.action-buttons {
		display: flex;
		align-items: center;
		gap: 8px;
		padding-top: 12px;
		border-top: 1px solid var(--border);
		flex-wrap: wrap;
	}
	.action-btn {
		padding: 6px 16px;
		border-radius: var(--radius);
		border: 1px solid var(--accent);
		background: rgba(88, 166, 255, 0.1);
		color: var(--accent);
		font-size: 13px;
		font-weight: 500;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 6px;
		transition: all 0.15s;
		white-space: nowrap;
	}
	.action-btn:hover:not(:disabled) {
		background: var(--accent);
		color: #fff;
	}
	.action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.vote-tag {
		font-size: 10px;
		background: var(--warning);
		color: #000;
		padding: 1px 5px;
		border-radius: 4px;
		font-weight: 600;
	}
	.detail-link {
		margin-left: auto;
		font-size: 12px;
		color: var(--text-subtle);
		text-decoration: none;
	}
	.detail-link:hover {
		color: var(--accent);
	}

	/* Overview Table */
	.overview-table {
		border: 1px solid var(--border);
		border-radius: var(--radius);
		overflow: hidden;
	}
	.table-header,
	.table-row {
		display: grid;
		grid-template-columns: 90px 1fr 80px 100px;
		padding: 10px 16px;
		gap: 8px;
		align-items: center;
		font-size: 13px;
	}
	.table-header {
		background: var(--bg);
		border-bottom: 1px solid var(--border);
		font-size: 11px;
		font-weight: 600;
		color: var(--text-subtle);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		white-space: nowrap;
	}
	.table-row {
		border-bottom: 1px solid var(--border);
		color: var(--text);
		text-decoration: none;
		transition: background 0.15s;
	}
	.table-row:last-child {
		border-bottom: none;
	}
	.table-row:hover {
		background: var(--surface-hover);
	}

	.state-dot {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		margin-right: 6px;
	}
	.col-status {
		font-size: 12px;
		display: flex;
		align-items: center;
	}
	.col-date {
		font-size: 12px;
		color: var(--text-subtle);
	}
	.mono {
		font-family: var(--font-mono);
	}
</style>
