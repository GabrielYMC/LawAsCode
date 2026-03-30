/**
 * SvelteKit Server Hooks
 * 每個請求都會經過這裡——負責 session 還原和路由守衛
 */

import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { getUserFromSession, COOKIE_NAME } from '$lib/server/auth/index.js';
import { checkPageAccess } from '$lib/server/auth/guards.js';

export const handle: Handle = async ({ event, resolve }) => {
	// 1. 從 cookie 還原使用者（支援 async — PocketBase 模式需查詢 API）
	const sessionId = event.cookies.get(COOKIE_NAME);
	const user = await getUserFromSession(sessionId);
	event.locals.user = user;

	// 2. 路由守衛
	const pathname = event.url.pathname;

	// 靜態資源、API、內部路由不做守衛
	if (
		pathname.startsWith('/_app') ||
		pathname.startsWith('/api') ||
		pathname.includes('.')
	) {
		return resolve(event);
	}

	const access = checkPageAccess(pathname, user);

	if (access === 'login' && pathname !== '/login') {
		throw redirect(303, `/login?redirect=${encodeURIComponent(pathname)}`);
	}

	if (access === 'unauthorized' && pathname !== '/unauthorized') {
		throw redirect(303, '/unauthorized');
	}

	return resolve(event);
};
