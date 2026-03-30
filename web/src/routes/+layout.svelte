<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { ROLE_LABELS, Role } from '$lib/types/user';
	import type { LayoutData } from './$types';

	let { children, data }: { children: any; data: LayoutData } = $props();

	// 登入頁不顯示 sidebar
	let isLoginPage = $derived($page.url.pathname === '/login');

	const ROLE_ICONS: Record<string, string> = {
		president: '👔',
		speaker: '🏛️',
		legislator: '🗳️',
		secretary_general: '📋',
		secretariat: '📁',
		student: '🎓'
	};

	const DASHBOARD_ROLES = [Role.SPEAKER, Role.PRESIDENT, Role.SECRETARY_GENERAL];
	const ADMIN_ROLES = [Role.SPEAKER, Role.PRESIDENT];

	const navItems = [
		{ href: '/', label: '首頁', icon: '🏠', auth: false, roles: null },
		{ href: '/laws', label: '法規瀏覽', icon: '📜', auth: false, roles: null },
		{ href: '/proposals', label: '提案審議', icon: '📋', auth: true, roles: null },
		{ href: '/advisor', label: 'AI 顧問', icon: '🤖', auth: true, roles: null },
		{ href: '/dashboard', label: '控制台', icon: '⚙️', auth: true, roles: DASHBOARD_ROLES },
		{ href: '/admin', label: '系統設定', icon: '🔧', auth: true, roles: ADMIN_ROLES },
		{ href: '/search', label: '搜尋', icon: '🔍', auth: false, roles: null }
	];

	let visibleNavItems = $derived(
		navItems.filter((item) => {
			if (!item.auth) return true;
			if (!data.user) return false;
			if (item.roles && !item.roles.includes(data.user.role)) return false;
			return true;
		})
	);
</script>

{#if isLoginPage}
	{@render children()}
{:else}
	<div class="app">
		<nav class="sidebar">
			<div class="logo">
				<span class="logo-icon">⚖️</span>
				<span class="logo-text">LawAsCode</span>
			</div>

			<div class="nav-links">
				{#each visibleNavItems as item}
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
				{#if data.user}
					<div class="user-info">
						<span class="user-avatar">{ROLE_ICONS[data.user.role]}</span>
						<div class="user-detail">
							<span class="user-name">{data.user.name}</span>
							<span class="user-role">{ROLE_LABELS[data.user.role]}</span>
						</div>
					</div>
					<form method="POST" action="/logout">
						<button type="submit" class="logout-btn">登出</button>
					</form>
				{:else}
					<a href="/login" class="login-link">登入</a>
				{/if}
			</div>
		</nav>

		<main class="content">
			{@render children()}
		</main>
	</div>
{/if}

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

	/* 使用者資訊 */
	.user-info {
		display: flex;
		align-items: center;
		gap: 10px;
		margin-bottom: 8px;
	}
	.user-avatar {
		font-size: 22px;
	}
	.user-detail {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	.user-name {
		font-size: 13px;
		font-weight: 600;
		color: var(--text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.user-role {
		font-size: 11px;
		color: var(--text-muted);
	}

	.logout-btn {
		width: 100%;
		padding: 5px;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border);
		background: transparent;
		color: var(--text-muted);
		font-size: 11px;
		cursor: pointer;
		transition: all 0.15s;
	}
	.logout-btn:hover {
		border-color: var(--error);
		color: var(--error);
	}

	.login-link {
		display: block;
		text-align: center;
		padding: 8px;
		border-radius: var(--radius);
		background: var(--accent);
		color: #fff;
		font-size: 13px;
		font-weight: 500;
		text-decoration: none;
	}
	.login-link:hover {
		background: var(--accent-hover);
		text-decoration: none;
		color: #fff;
	}

	.content {
		flex: 1;
		min-width: 0;
		padding: 32px;
		max-width: 1200px;
	}
</style>
