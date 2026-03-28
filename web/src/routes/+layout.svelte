<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { ROLE_LABELS, DEV_USERS } from '$lib/types/user';

	let { children } = $props();

	let currentUserIndex = $state(6); // 預設一般學生
	let currentUser = $derived(DEV_USERS[currentUserIndex]);

	const navItems = [
		{ href: '/', label: '首頁', icon: '🏠' },
		{ href: '/laws', label: '法規瀏覽', icon: '📜' },
		{ href: '/proposals', label: '提案審議', icon: '📋' },
		{ href: '/dashboard', label: '控制台', icon: '⚙️' },
		{ href: '/search', label: '搜尋', icon: '🔍' }
	];
</script>

<div class="app">
	<nav class="sidebar">
		<div class="logo">
			<span class="logo-icon">⚖️</span>
			<span class="logo-text">LawAsCode</span>
		</div>

		<div class="nav-links">
			{#each navItems as item}
				<a
					href={item.href}
					class="nav-item"
					class:active={$page.url.pathname === item.href ||
						(item.href !== '/' && $page.url.pathname.startsWith(item.href))}
				>
					<span class="nav-icon">{item.icon}</span>
					<span class="nav-label">{item.label}</span>
				</a>
			{/each}
		</div>

		<div class="nav-footer">
			<div class="dev-role-switcher">
				<span class="dev-badge">DEV</span>
				<select
					class="dev-select"
					bind:value={currentUserIndex}
				>
					{#each DEV_USERS as user, i}
						<option value={i}>{user.name}（{ROLE_LABELS[user.role]}）</option>
					{/each}
				</select>
			</div>
		</div>
	</nav>

	<main class="content">
		{@render children()}
	</main>
</div>

<style>
	.app {
		display: flex;
		min-height: 100vh;
	}

	.sidebar {
		width: 220px;
		background: var(--surface);
		border-right: 1px solid var(--border);
		display: flex;
		flex-direction: column;
		flex-shrink: 0;
		position: sticky;
		top: 0;
		height: 100vh;
	}

	.logo {
		padding: 20px 16px;
		display: flex;
		align-items: center;
		gap: 10px;
		border-bottom: 1px solid var(--border);
	}
	.logo-icon { font-size: 24px; }
	.logo-text {
		font-size: 16px;
		font-weight: 700;
		color: var(--text);
	}

	.nav-links {
		flex: 1;
		padding: 8px;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 12px;
		border-radius: var(--radius);
		color: var(--text-muted);
		font-size: 14px;
		transition: all 0.15s;
		text-decoration: none;
	}
	.nav-item:hover {
		background: var(--surface-hover);
		color: var(--text);
		text-decoration: none;
	}
	.nav-item.active {
		background: rgba(88, 166, 255, 0.1);
		color: var(--accent);
	}
	.nav-icon { font-size: 18px; width: 24px; text-align: center; }

	.nav-footer {
		padding: 12px 16px;
		border-top: 1px solid var(--border);
	}
	.dev-role-switcher {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
	}
	.dev-badge {
		background: var(--warning);
		color: #000;
		padding: 1px 6px;
		border-radius: 4px;
		font-weight: 700;
		font-size: 10px;
	}
	.dev-select {
		background: var(--bg);
		color: var(--text-muted);
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 3px 6px;
		font-size: 11px;
		cursor: pointer;
		flex: 1;
		min-width: 0;
	}
	.dev-select:focus {
		outline: 1px solid var(--accent);
		border-color: var(--accent);
	}

	.content {
		flex: 1;
		min-width: 0;
		padding: 32px;
		max-width: 1200px;
	}
</style>
