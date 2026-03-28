<script lang="ts">
	import type { PageData } from './$types';
	import { STATE_LABELS, STATE_COLORS, LegislativeState } from '$lib/types/workflow';
	import { VOTE_LABELS, VOTE_COLORS } from '$lib/types/vote';

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

	{#if data.availableTransitions.length > 0}
		<div class="transitions">
			<span class="transitions-label">可執行操作：</span>
			{#each data.availableTransitions as t}
				<button class="transition-btn" disabled title={t.description}>
					{t.label}
					{#if t.requiresVote}
						<span class="vote-badge">需表決</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</section>

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
{#if data.voteHistory.length > 0}
	<section class="section">
		<h2 class="section-title">表決紀錄</h2>

		{#each data.voteHistory as vote}
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
	}
	.transitions-label {
		color: var(--text-muted);
	}
	.transition-btn {
		padding: 6px 14px;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: var(--surface);
		color: var(--text);
		font-size: 13px;
		cursor: not-allowed;
		opacity: 0.7;
		display: flex;
		align-items: center;
		gap: 6px;
	}
	.vote-badge {
		font-size: 10px;
		background: var(--warning);
		color: #000;
		padding: 1px 5px;
		border-radius: 4px;
		font-weight: 600;
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
