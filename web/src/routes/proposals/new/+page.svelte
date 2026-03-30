<script lang="ts">
	import type { ActionData } from './$types';
	import { enhance } from '$app/forms';

	let { form }: { form: ActionData } = $props();

	// 動態修正條文列表
	let amendments = $state([
		{ articleNum: '', type: 'modify' as const, oldText: '', newText: '', reason: '' }
	]);

	function addAmendment() {
		amendments = [
			...amendments,
			{ articleNum: '', type: 'modify' as const, oldText: '', newText: '', reason: '' }
		];
	}

	function removeAmendment(index: number) {
		if (amendments.length <= 1) return;
		amendments = amendments.filter((_, i) => i !== index);
	}
</script>

<svelte:head>
	<title>新增提案 — LawAsCode</title>
</svelte:head>

<a href="/proposals" class="back-link">← 返回提案列表</a>

<h1>新增提案</h1>
<p class="subtitle">提出法規修正案，經議事程序審議</p>

{#if form?.error}
	<div class="toast error">{form.error}</div>
{/if}

<form method="POST" use:enhance>
	<!-- 基本資訊 -->
	<section class="form-section">
		<h2>基本資訊</h2>

		<label class="field">
			<span class="field-label">提案名稱 *</span>
			<input
				type="text"
				name="title"
				value={form?.title ?? ''}
				placeholder="例：修正法規標準規則第五條條文"
				required
			/>
		</label>

		<label class="field">
			<span class="field-label">提案說明</span>
			<textarea
				name="description"
				rows="3"
				placeholder="簡述修法目的與理由"
			>{form?.description ?? ''}</textarea>
		</label>

		<label class="field">
			<span class="field-label">目標法規</span>
			<input
				type="text"
				name="targetLaw"
				value={form?.targetLaw ?? ''}
				placeholder="例：法規標準規則"
			/>
		</label>
	</section>

	<!-- 修正條文 -->
	<section class="form-section">
		<div class="section-header-row">
			<h2>修正條文</h2>
			<button type="button" class="add-btn" onclick={addAmendment}>+ 新增條文</button>
		</div>

		<input type="hidden" name="amendmentCount" value={amendments.length} />

		{#each amendments as amendment, i}
			<div class="amendment-card">
				<div class="amendment-header">
					<span class="amendment-num">修正 {i + 1}</span>
					{#if amendments.length > 1}
						<button type="button" class="remove-btn" onclick={() => removeAmendment(i)}>刪除</button>
					{/if}
				</div>

				<div class="amendment-row">
					<label class="field">
						<span class="field-label">條號 *</span>
						<input
							type="text"
							name="amendment_{i}_articleNum"
							bind:value={amendment.articleNum}
							placeholder="第五條"
						/>
					</label>

					<label class="field">
						<span class="field-label">類型</span>
						<select name="amendment_{i}_type" bind:value={amendment.type}>
							<option value="modify">修正</option>
							<option value="add">新增</option>
							<option value="delete">刪除</option>
						</select>
					</label>
				</div>

				{#if amendment.type !== 'add'}
					<label class="field">
						<span class="field-label">現行條文</span>
						<textarea
							name="amendment_{i}_oldText"
							bind:value={amendment.oldText}
							rows="3"
							placeholder="貼上目前的條文內容"
						></textarea>
					</label>
				{/if}

				{#if amendment.type !== 'delete'}
					<label class="field">
						<span class="field-label">修正後條文 *</span>
						<textarea
							name="amendment_{i}_newText"
							bind:value={amendment.newText}
							rows="3"
							placeholder="輸入修正後的條文內容"
						></textarea>
					</label>
				{/if}

				<label class="field">
					<span class="field-label">修正理由</span>
					<textarea
						name="amendment_{i}_reason"
						bind:value={amendment.reason}
						rows="2"
						placeholder="說明修正的理由"
					></textarea>
				</label>
			</div>
		{/each}
	</section>

	<div class="form-actions">
		<button type="submit" class="btn-primary">提交提案</button>
		<a href="/proposals" class="btn-outline">取消</a>
	</div>
</form>

<style>
	.back-link {
		display: inline-block;
		font-size: 13px;
		color: var(--text-muted);
		text-decoration: none;
		margin-bottom: 16px;
	}
	.back-link:hover { color: var(--accent); }

	h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
	.subtitle { color: var(--text-muted); font-size: 14px; margin-bottom: 24px; }

	.toast.error {
		padding: 10px 16px;
		border-radius: var(--radius);
		font-size: 13px;
		margin-bottom: 16px;
		background: rgba(248, 81, 73, 0.1);
		border: 1px solid rgba(248, 81, 73, 0.3);
		color: var(--error);
	}

	.form-section {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 20px;
		margin-bottom: 16px;
	}
	.form-section h2 {
		font-size: 15px;
		font-weight: 600;
		margin-bottom: 16px;
	}
	.section-header-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 16px;
	}
	.section-header-row h2 {
		margin-bottom: 0;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: 14px;
	}
	.field:last-child {
		margin-bottom: 0;
	}
	.field-label {
		font-size: 12px;
		font-weight: 600;
		color: var(--text-muted);
	}
	.field input[type="text"],
	.field textarea,
	.field select {
		padding: 8px 12px;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--bg);
		color: var(--text);
		font-size: 13px;
		font-family: inherit;
	}
	.field textarea {
		resize: vertical;
	}
	.field input:focus,
	.field textarea:focus,
	.field select:focus {
		outline: none;
		border-color: var(--accent);
	}

	.amendment-card {
		background: var(--bg);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		padding: 16px;
		margin-bottom: 12px;
	}
	.amendment-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 12px;
	}
	.amendment-num {
		font-size: 13px;
		font-weight: 600;
		color: var(--accent);
	}
	.amendment-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}

	.add-btn {
		padding: 4px 12px;
		border-radius: var(--radius-sm);
		border: 1px dashed var(--accent);
		background: transparent;
		color: var(--accent);
		font-size: 12px;
		cursor: pointer;
	}
	.add-btn:hover {
		background: rgba(88, 166, 255, 0.1);
	}
	.remove-btn {
		padding: 2px 10px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: transparent;
		color: var(--text-subtle);
		font-size: 11px;
		cursor: pointer;
	}
	.remove-btn:hover {
		border-color: var(--error);
		color: var(--error);
	}

	.form-actions {
		display: flex;
		gap: 10px;
		margin-bottom: 32px;
	}
	.btn-primary {
		padding: 10px 24px;
		border-radius: var(--radius);
		border: none;
		background: var(--accent);
		color: #fff;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
	}
	.btn-primary:hover { background: var(--accent-hover); }
	.btn-outline {
		padding: 10px 24px;
		border-radius: var(--radius);
		border: 1px solid var(--border);
		background: transparent;
		color: var(--text-muted);
		font-size: 14px;
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
	}
	.btn-outline:hover {
		border-color: var(--text-muted);
		color: var(--text);
		text-decoration: none;
	}
</style>
