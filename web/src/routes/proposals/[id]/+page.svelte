<script lang="ts">
	import type { PageData } from './$types';
	import { STATE_LABELS, STATE_COLORS, LegislativeState } from '$lib/types/workflow';
	import { VOTE_LABELS, VOTE_COLORS, VoteChoice } from '$lib/types/vote';
	import { Role } from '$lib/types/user';
	import { invalidateAll } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	const AMENDMENT_TYPE_LABELS: Record<string, string> = {
		modify: '修正',
		add: '新增',
		delete: '刪除'
	};

	const STATE_STEP_LABELS: Record<string, string> = {
		proposed: '提案',
		first_reading: '一讀',
		committee: '委員會',
		second_reading: '二讀',
		third_reading: '三讀',
		pending_promulgation: '待公布',
		promulgated: '已公布'
	};

	let actionLoading = $state(false);
	let actionMessage = $state<{ type: 'success' | 'error'; text: string } | null>(null);

	// 當前使用者可執行的操作（根據角色過濾）
	let myTransitions = $derived(
		data.availableTransitions.filter((t) => data.user && t.requiredRole === data.user.role)
	);

	// 當前使用者是否已在進行中的投票中投過票
	let hasVoted = $derived(
		data.openVote?.ballots.some((b) => b.odaterId === data.user?.id) ?? false
	);

	// 執行不需要投票的狀態轉移
	async function executeTransition(label: string) {
		actionLoading = true;
		actionMessage = null;
		try {
			const res = await fetch(`/api/proposals/${data.proposal.id}/transition`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ transitionLabel: label })
			});
			const result = await res.json();
			if (result.success) {
				actionMessage = { type: 'success', text: `已執行「${label}」` };
				await invalidateAll();
			} else {
				actionMessage = { type: 'error', text: result.error };
			}
		} catch (e: any) {
			actionMessage = { type: 'error', text: e.message };
		} finally {
			actionLoading = false;
		}
	}

	// 議長發起投票
	async function startVote(label: string) {
		actionLoading = true;
		actionMessage = null;
		try {
			const res = await fetch(`/api/proposals/${data.proposal.id}/vote`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'create', transitionLabel: label })
			});
			const result = await res.json();
			if (result.success) {
				actionMessage = { type: 'success', text: `已發起「${label}」表決` };
				await invalidateAll();
			} else {
				actionMessage = { type: 'error', text: result.error };
			}
		} catch (e: any) {
			actionMessage = { type: 'error', text: e.message };
		} finally {
			actionLoading = false;
		}
	}

	// 議員投票
	async function castVote(choice: VoteChoice) {
		if (!data.openVote) return;
		actionLoading = true;
		actionMessage = null;
		try {
			const res = await fetch(`/api/proposals/${data.proposal.id}/vote`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'cast', voteId: data.openVote.id, choice })
			});
			const result = await res.json();
			if (result.success) {
				actionMessage = { type: 'success', text: `已投「${VOTE_LABELS[choice]}」` };
				await invalidateAll();
			} else {
				actionMessage = { type: 'error', text: result.error };
			}
		} catch (e: any) {
			actionMessage = { type: 'error', text: e.message };
		} finally {
			actionLoading = false;
		}
	}

	// 議長結束投票
	async function closeVote() {
		if (!data.openVote) return;
		actionLoading = true;
		actionMessage = null;
		try {
			const res = await fetch(`/api/proposals/${data.proposal.id}/vote`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'close', voteId: data.openVote.id })
			});
			const result = await res.json();
			if (result.success) {
				const passText = result.passed ? '表決通過' : '表決未通過';
				actionMessage = { type: result.passed ? 'success' : 'error', text: passText };
				await invalidateAll();
			} else {
				actionMessage = { type: 'error', text: result.error };
			}
		} catch (e: any) {
			actionMessage = { type: 'error', text: e.message };
		} finally {
			actionLoading = false;
		}
	}
</script>

<svelte:head>
	<title>{data.proposal.title} — LawAsCode</title>
</svelte:head>

<a href="/proposals" class="back-link">← 返回提案列表</a>

<!-- 提案標題區 -->
<div class="proposal-header">
	<div class="header-top">
		<span
			class="state-badge"
			style="background: {STATE_COLORS[data.proposal.state]}20; color: {STATE_COLORS[data.proposal.state]}; border-color: {STATE_COLORS[data.proposal.state]}40"
		>
			{STATE_LABELS[data.proposal.state]}
		</span>
		<span class="proposal-id">{data.proposal.id}</span>
	</div>
	<h1>{data.proposal.title}</h1>
	<p class="description">{data.proposal.description}</p>

	<div class="meta-grid">
		<div class="meta-item">
			<span class="meta-label">提案人</span>
			<span class="meta-value">{data.proposal.proposer}</span>
		</div>
		<div class="meta-item">
			<span class="meta-label">目標法規</span>
			<span class="meta-value">{data.proposal.targetLaw}</span>
		</div>
		<div class="meta-item">
			<span class="meta-label">提案日期</span>
			<span class="meta-value mono">{data.proposal.createdAt.split('T')[0]}</span>
		</div>
		<div class="meta-item">
			<span class="meta-label">最後更新</span>
			<span class="meta-value mono">{data.proposal.updatedAt.split('T')[0]}</span>
		</div>
		{#if data.proposal.cosigners.length > 0}
			<div class="meta-item">
				<span class="meta-label">連署人</span>
				<span class="meta-value">{data.proposal.cosigners.join('、')}</span>
			</div>
		{/if}
		<div class="meta-item">
			<span class="meta-label">修正條文數</span>
			<span class="meta-value">{data.proposal.amendments.length} 條</span>
		</div>
	</div>
</div>

{#if actionMessage}
	<div class="toast {actionMessage.type}">
		{actionMessage.text}
	</div>
{/if}

<!-- 議事進度 -->
<section class="section">
	<h2 class="section-title">議事進度</h2>
	<div class="progress-track">
		{#each data.stateProgress.steps as step, i}
			<div
				class="progress-step"
				class:completed={i < data.stateProgress.currentIndex}
				class:current={i === data.stateProgress.currentIndex}
				class:future={i > data.stateProgress.currentIndex}
			>
				<div class="step-dot">
					{#if i < data.stateProgress.currentIndex}
						<span class="check">✓</span>
					{:else if i === data.stateProgress.currentIndex}
						<span class="current-dot"></span>
					{/if}
				</div>
				<span class="step-label">{STATE_STEP_LABELS[step]}</span>
			</div>
			{#if i < data.stateProgress.steps.length - 1}
				<div
					class="progress-connector"
					class:completed={i < data.stateProgress.currentIndex}
				></div>
			{/if}
		{/each}
	</div>

	<!-- 可執行操作（根據角色） -->
	{#if myTransitions.length > 0 && !data.openVote}
		<div class="transitions">
			<span class="transitions-label">可執行操作：</span>
			{#each myTransitions as t}
				<button
					class="transition-btn active"
					title={t.description}
					disabled={actionLoading}
					onclick={() => t.requiresVote ? startVote(t.label) : executeTransition(t.label)}
				>
					{t.label}
					{#if t.requiresVote}
						<span class="vote-badge">發起表決</span>
					{/if}
				</button>
			{/each}
		</div>
	{:else if data.availableTransitions.length > 0 && !data.openVote}
		<div class="transitions">
			<span class="transitions-label">等待操作：</span>
			{#each data.availableTransitions as t}
				<span class="transition-btn" title={t.description}>
					{t.label}
					<span class="role-hint">（需{t.requiredRole === 'speaker' ? '議長' : t.requiredRole === 'president' ? '會長' : t.requiredRole === 'secretary_general' ? '秘書長' : '議員'}）</span>
				</span>
			{/each}
		</div>
	{/if}
</section>

<!-- 進行中的投票 -->
{#if data.openVote}
	<section class="section">
		<h2 class="section-title">🗳️ 進行中的表決</h2>

		<div class="live-vote-card">
			<div class="live-vote-header">
				<span class="live-vote-topic">{data.openVote.transitionLabel}</span>
				<span class="live-badge">投票中</span>
			</div>
			<p class="live-vote-desc">{data.openVote.description}</p>

			<!-- 目前票數 -->
			{#if data.openVote.ballots.length > 0}
				<div class="live-vote-tally">
					<span class="tally-item tally-yea">
						贊成 {data.openVote.ballots.filter(b => b.choice === VoteChoice.YEA).length}
					</span>
					<span class="tally-item tally-nay">
						反對 {data.openVote.ballots.filter(b => b.choice === VoteChoice.NAY).length}
					</span>
					<span class="tally-item tally-abstain">
						棄權 {data.openVote.ballots.filter(b => b.choice === VoteChoice.ABSTAIN).length}
					</span>
					<span class="tally-total">共 {data.openVote.ballots.length} 票</span>
				</div>

				<div class="live-ballots">
					{#each data.openVote.ballots as ballot}
						<span class="ballot-chip" style="border-color: {VOTE_COLORS[ballot.choice]}">
							{ballot.voterName}
							<span class="ballot-choice" style="color: {VOTE_COLORS[ballot.choice]}">
								{VOTE_LABELS[ballot.choice]}
							</span>
						</span>
					{/each}
				</div>
			{:else}
				<p class="no-votes-yet">尚無人投票</p>
			{/if}

			<!-- 投票操作 -->
			<div class="vote-actions">
				{#if data.user?.role === Role.LEGISLATOR && !hasVoted}
					<div class="cast-vote-group">
						<span class="cast-label">投下你的票：</span>
						<button class="vote-btn vote-yea" onclick={() => castVote(VoteChoice.YEA)} disabled={actionLoading}>
							👍 贊成
						</button>
						<button class="vote-btn vote-nay" onclick={() => castVote(VoteChoice.NAY)} disabled={actionLoading}>
							👎 反對
						</button>
						<button class="vote-btn vote-abstain" onclick={() => castVote(VoteChoice.ABSTAIN)} disabled={actionLoading}>
							🤚 棄權
						</button>
					</div>
				{:else if data.user?.role === Role.LEGISLATOR && hasVoted}
					<div class="voted-notice">✅ 你已完成投票</div>
				{/if}

				{#if data.user?.role === Role.SPEAKER}
					<button class="close-vote-btn" onclick={closeVote} disabled={actionLoading}>
						{actionLoading ? '處理中...' : '結束投票並計算結果'}
					</button>
				{/if}
			</div>
		</div>
	</section>
{/if}

<!-- 修正前後對照表 -->
<section class="section">
	<h2 class="section-title">修正前後對照表</h2>

	{#each data.comparisonTable as row, i}
		<div class="comparison-card">
			<div class="comparison-header">
				<span class="article-num">{row.articleNum}</span>
				<span class="amendment-type type-{row.amendmentType}">
					{AMENDMENT_TYPE_LABELS[row.amendmentType]}
				</span>
			</div>

			<div class="comparison-table">
				<div class="comparison-col col-new">
					<div class="col-title">修正條文</div>
					<div class="col-content">
						{#each row.diff.newSegments as seg}
							{#if seg.type === 'insert'}
								<mark class="diff-insert">{seg.text}</mark>
							{:else}
								<span>{seg.text}</span>
							{/if}
						{/each}
					</div>
				</div>
				<div class="comparison-col col-old">
					<div class="col-title">現行條文</div>
					<div class="col-content">
						{#each row.diff.oldSegments as seg}
							{#if seg.type === 'delete'}
								<mark class="diff-delete">{seg.text}</mark>
							{:else}
								<span>{seg.text}</span>
							{/if}
						{/each}
					</div>
				</div>
				<div class="comparison-col col-reason">
					<div class="col-title">修正理由</div>
					<div class="col-content reason-text">
						{#each row.reason.split('\\n') as line}
							<p>{line}</p>
						{/each}
					</div>
				</div>
			</div>
		</div>
	{/each}
</section>

<!-- 表決紀錄 -->
{#if data.voteHistory.filter(v => v.status === 'closed').length > 0}
	<section class="section">
		<h2 class="section-title">表決紀錄</h2>

		{#each data.voteHistory.filter(v => v.status === 'closed') as vote}
			<div class="vote-card">
				<div class="vote-card-header">
					<div class="vote-info">
						<span class="vote-topic">{vote.transitionLabel}</span>
						<span class="vote-status" class:passed={vote.result?.passed} class:failed={!vote.result?.passed}>
							{vote.result?.passed ? '通過' : '未通過'}
						</span>
					</div>
					<span class="vote-date">{vote.closedAt?.split('T')[0]}</span>
				</div>

				<p class="vote-desc">{vote.description}</p>

				{#if vote.result}
					<div class="vote-result">
						<div class="vote-bar">
							{#if vote.result.yea > 0}
								<div
									class="bar-segment bar-yea"
									style="width: {(vote.result.yea / vote.result.total) * 100}%"
								>
									{vote.result.yea}
								</div>
							{/if}
							{#if vote.result.nay > 0}
								<div
									class="bar-segment bar-nay"
									style="width: {(vote.result.nay / vote.result.total) * 100}%"
								>
									{vote.result.nay}
								</div>
							{/if}
							{#if vote.result.abstain > 0}
								<div
									class="bar-segment bar-abstain"
									style="width: {(vote.result.abstain / vote.result.total) * 100}%"
								>
									{vote.result.abstain}
								</div>
							{/if}
						</div>
						<div class="vote-counts">
							<span class="count-item">
								<span class="count-dot" style="background: #3fb950"></span>
								贊成 {vote.result.yea}
							</span>
							<span class="count-item">
								<span class="count-dot" style="background: #f85149"></span>
								反對 {vote.result.nay}
							</span>
							<span class="count-item">
								<span class="count-dot" style="background: #8b949e"></span>
								棄權 {vote.result.abstain}
							</span>
							<span class="count-threshold">門檻：{vote.result.threshold}</span>
						</div>
					</div>
				{/if}

				{#if vote.ballots.length > 0}
					<div class="vote-ballots">
						{#each vote.ballots as ballot}
							<span class="ballot-chip" style="border-color: {VOTE_COLORS[ballot.choice]}">
								{ballot.voterName}
								<span class="ballot-choice" style="color: {VOTE_COLORS[ballot.choice]}">
									{VOTE_LABELS[ballot.choice]}
								</span>
							</span>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</section>
{/if}

<style>
	.back-link {
		display: inline-block;
		font-size: 13px;
		color: var(--text-muted);
		text-decoration: none;
		margin-bottom: 16px;
	}
	.back-link:hover {
		color: var(--accent);
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

	/* 標題區 */
	.proposal-header {
		margin-bottom: 32px;
	}
	.header-top {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 12px;
	}
	.state-badge {
		font-size: 12px;
		font-weight: 600;
		padding: 2px 10px;
		border-radius: 12px;
		border: 1px solid;
	}
	.proposal-id {
		font-size: 12px;
		color: var(--text-subtle);
		font-family: var(--font-mono);
	}
	h1 {
		font-size: 22px;
		font-weight: 700;
		margin-bottom: 8px;
	}
	.description {
		color: var(--text-muted);
		font-size: 14px;
		line-height: 1.6;
		margin-bottom: 20px;
	}

	.meta-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 12px;
	}
	.meta-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.meta-label {
		font-size: 11px;
		color: var(--text-subtle);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	.meta-value {
		font-size: 14px;
		color: var(--text);
		font-weight: 500;
	}
	.mono {
		font-family: var(--font-mono);
	}

	/* Section */
	.section {
		margin-bottom: 32px;
	}
	.section-title {
		font-size: 16px;
		font-weight: 600;
		margin-bottom: 16px;
		padding-bottom: 8px;
		border-bottom: 1px solid var(--border);
	}

	/* 議事進度 */
	.progress-track {
		display: flex;
		align-items: center;
		gap: 0;
		margin-bottom: 16px;
		overflow-x: auto;
		padding: 8px 0;
	}
	.progress-step {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
		flex-shrink: 0;
	}
	.step-dot {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		border: 2px solid var(--border);
		background: var(--bg);
	}
	.completed .step-dot {
		background: var(--accent);
		border-color: var(--accent);
		color: #fff;
	}
	.current .step-dot {
		border-color: var(--accent);
		background: var(--bg);
	}
	.current-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--accent);
	}
	.step-label {
		font-size: 11px;
		color: var(--text-subtle);
		white-space: nowrap;
	}
	.completed .step-label {
		color: var(--accent);
	}
	.current .step-label {
		color: var(--accent);
		font-weight: 600;
	}
	.check {
		font-size: 13px;
		font-weight: 700;
	}

	.progress-connector {
		flex: 1;
		height: 2px;
		background: var(--border);
		min-width: 24px;
		margin: 0 4px;
		margin-bottom: 22px;
	}
	.progress-connector.completed {
		background: var(--accent);
	}

	/* 轉移操作 */
	.transitions {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13px;
		flex-wrap: wrap;
	}
	.transitions-label {
		color: var(--text-muted);
	}
	.transition-btn {
		padding: 6px 14px;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--text-muted);
		font-size: 13px;
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.transition-btn.active {
		border-color: var(--accent);
		color: var(--accent);
		background: rgba(88, 166, 255, 0.1);
		cursor: pointer;
	}
	.transition-btn.active:hover:not(:disabled) {
		background: var(--accent);
		color: #fff;
	}
	.transition-btn.active:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.vote-badge {
		font-size: 10px;
		background: var(--warning);
		color: #000;
		padding: 1px 5px;
		border-radius: 4px;
		font-weight: 600;
	}
	.role-hint {
		font-size: 11px;
		color: var(--text-subtle);
	}

	/* 進行中投票 */
	.live-vote-card {
		background: var(--surface);
		border: 2px solid var(--warning);
		border-radius: var(--radius);
		padding: 20px;
	}
	.live-vote-header {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 8px;
	}
	.live-vote-topic {
		font-size: 16px;
		font-weight: 600;
		color: var(--text);
	}
	.live-badge {
		font-size: 11px;
		font-weight: 600;
		padding: 2px 10px;
		border-radius: 12px;
		background: rgba(210, 153, 34, 0.2);
		color: var(--warning);
		animation: pulse 2s ease-in-out infinite;
	}
	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.6; }
	}
	.live-vote-desc {
		font-size: 13px;
		color: var(--text-muted);
		margin-bottom: 16px;
	}

	.live-vote-tally {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 12px;
		font-size: 13px;
	}
	.tally-item {
		font-weight: 600;
		padding: 2px 10px;
		border-radius: 4px;
	}
	.tally-yea { color: #3fb950; background: rgba(63, 185, 80, 0.1); }
	.tally-nay { color: #f85149; background: rgba(248, 81, 73, 0.1); }
	.tally-abstain { color: #8b949e; background: rgba(139, 148, 158, 0.1); }
	.tally-total {
		margin-left: auto;
		color: var(--text-subtle);
		font-size: 12px;
	}

	.live-ballots {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: 16px;
	}

	.no-votes-yet {
		color: var(--text-subtle);
		font-size: 13px;
		margin-bottom: 16px;
	}

	.vote-actions {
		padding-top: 16px;
		border-top: 1px solid var(--border);
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 12px;
	}

	.cast-vote-group {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.cast-label {
		font-size: 13px;
		color: var(--text-muted);
		font-weight: 500;
	}
	.vote-btn {
		padding: 8px 18px;
		border-radius: var(--radius);
		border: 1px solid;
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s;
	}
	.vote-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.vote-yea {
		border-color: #3fb950;
		background: rgba(63, 185, 80, 0.1);
		color: #3fb950;
	}
	.vote-yea:hover:not(:disabled) { background: #3fb950; color: #fff; }
	.vote-nay {
		border-color: #f85149;
		background: rgba(248, 81, 73, 0.1);
		color: #f85149;
	}
	.vote-nay:hover:not(:disabled) { background: #f85149; color: #fff; }
	.vote-abstain {
		border-color: #8b949e;
		background: rgba(139, 148, 158, 0.1);
		color: #8b949e;
	}
	.vote-abstain:hover:not(:disabled) { background: #8b949e; color: #fff; }

	.voted-notice {
		font-size: 14px;
		color: var(--success);
		font-weight: 500;
	}

	.close-vote-btn {
		padding: 8px 20px;
		border-radius: var(--radius);
		border: 1px solid var(--warning);
		background: rgba(210, 153, 34, 0.1);
		color: var(--warning);
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
		margin-left: auto;
	}
	.close-vote-btn:hover:not(:disabled) {
		background: var(--warning);
		color: #000;
	}
	.close-vote-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* 對照表 */
	.comparison-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		margin-bottom: 16px;
		overflow: hidden;
	}
	.comparison-header {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 12px 16px;
		background: var(--bg);
		border-bottom: 1px solid var(--border);
	}
	.article-num {
		font-weight: 600;
		font-size: 14px;
	}
	.amendment-type {
		font-size: 11px;
		font-weight: 600;
		padding: 1px 8px;
		border-radius: 4px;
	}
	.type-modify {
		background: rgba(88, 166, 255, 0.15);
		color: #58a6ff;
	}
	.type-add {
		background: rgba(63, 185, 80, 0.15);
		color: #3fb950;
	}
	.type-delete {
		background: rgba(248, 81, 73, 0.15);
		color: #f85149;
	}

	.comparison-table {
		display: grid;
		grid-template-columns: 1fr 1fr 1fr;
	}
	.comparison-col {
		padding: 0;
		border-right: 1px solid var(--border);
	}
	.comparison-col:last-child {
		border-right: none;
	}
	.col-title {
		font-size: 11px;
		font-weight: 600;
		color: var(--text-subtle);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		padding: 8px 16px;
		background: var(--bg);
		border-bottom: 1px solid var(--border);
	}
	.col-content {
		padding: 16px;
		font-size: 14px;
		line-height: 1.8;
		color: var(--text);
	}

	/* Diff 高亮 */
	.diff-insert {
		background: rgba(63, 185, 80, 0.2);
		color: #3fb950;
		padding: 1px 2px;
		border-radius: 2px;
		text-decoration: none;
	}
	.diff-delete {
		background: rgba(248, 81, 73, 0.2);
		color: #f85149;
		padding: 1px 2px;
		border-radius: 2px;
		text-decoration: line-through;
	}

	/* 修正理由 */
	.reason-text {
		font-size: 13px;
		color: var(--text-muted);
	}
	.reason-text p {
		margin-bottom: 4px;
	}
	.reason-text p:last-child {
		margin-bottom: 0;
	}

	/* 表決紀錄 */
	.vote-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 18px;
		margin-bottom: 12px;
	}
	.vote-card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 8px;
	}
	.vote-info {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	.vote-topic {
		font-size: 15px;
		font-weight: 600;
		color: var(--text);
	}
	.vote-status {
		font-size: 11px;
		font-weight: 600;
		padding: 2px 8px;
		border-radius: 4px;
	}
	.vote-status.passed {
		background: rgba(63, 185, 80, 0.15);
		color: #3fb950;
	}
	.vote-status.failed {
		background: rgba(248, 81, 73, 0.15);
		color: #f85149;
	}
	.vote-date {
		font-size: 12px;
		color: var(--text-subtle);
		font-family: var(--font-mono);
	}
	.vote-desc {
		font-size: 13px;
		color: var(--text-muted);
		margin-bottom: 14px;
		line-height: 1.5;
	}

	.vote-result {
		margin-bottom: 12px;
	}
	.vote-bar {
		display: flex;
		height: 24px;
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 8px;
	}
	.bar-segment {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 12px;
		font-weight: 600;
		color: #fff;
		min-width: 28px;
	}
	.bar-yea { background: #3fb950; }
	.bar-nay { background: #f85149; }
	.bar-abstain { background: #8b949e; }

	.vote-counts {
		display: flex;
		align-items: center;
		gap: 16px;
		font-size: 12px;
		color: var(--text-muted);
	}
	.count-item {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.count-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}
	.count-threshold {
		margin-left: auto;
		color: var(--text-subtle);
		font-size: 11px;
	}

	.vote-ballots {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		padding-top: 12px;
		border-top: 1px solid var(--border);
	}
	.ballot-chip {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 3px 10px;
		border-radius: 12px;
		border: 1px solid;
		font-size: 12px;
		color: var(--text);
	}
	.ballot-choice {
		font-weight: 600;
		font-size: 11px;
	}
</style>
