import { DEV_USERS } from '$lib/types/user.js';
import {
	createSession,
	getSessionCookieOptions,
	COOKIE_NAME
} from '$lib/server/auth/index.js';
import { loginWithPassword } from '$lib/server/auth/pocketbase.js';
import { getConfig } from '$lib/server/config.js';
import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	// 已登入就跳轉
	if (locals.user) {
		throw redirect(303, url.searchParams.get('redirect') || '/');
	}

	const config = getConfig();
	const isPb = config.pocketbase.enabled;
	const demoEnabled = config.demo.enabled;

	return {
		devUsers: (!isPb || demoEnabled) ? DEV_USERS : [],
		redirect: url.searchParams.get('redirect') || '/',
		usePocketBase: isPb,
		demoEnabled
	};
};

export const actions: Actions = {
	/** Mock 登入（開發模式：選擇角色） */
	login: async ({ request, cookies }) => {
		const formData = await request.formData();
		const userId = formData.get('userId') as string;
		const redirectTo = (formData.get('redirect') as string) || '/';

		if (!userId) {
			return fail(400, { error: '請選擇登入身份' });
		}

		const sessionId = createSession(userId);
		if (!sessionId) {
			return fail(400, { error: '無效的使用者' });
		}

		const opts = getSessionCookieOptions();
		cookies.set(COOKIE_NAME, sessionId, {
			path: opts.path,
			httpOnly: opts.httpOnly,
			sameSite: opts.sameSite,
			secure: opts.secure,
			maxAge: opts.maxAge
		});

		throw redirect(303, redirectTo);
	},

	/** PocketBase 登入（生產環境：帳號密碼） */
	pbLogin: async ({ request, cookies }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;
		const redirectTo = (formData.get('redirect') as string) || '/';

		if (!email || !password) {
			return fail(400, { error: '請輸入帳號和密碼', email });
		}

		const result = await loginWithPassword(email, password);
		if (!result) {
			return fail(400, { error: '帳號或密碼錯誤', email });
		}

		const opts = getSessionCookieOptions();
		cookies.set(COOKIE_NAME, result.token, {
			path: opts.path,
			httpOnly: opts.httpOnly,
			sameSite: opts.sameSite,
			secure: opts.secure,
			maxAge: opts.maxAge
		});

		throw redirect(303, redirectTo);
	},

	logout: async ({ cookies }) => {
		const token = cookies.get(COOKIE_NAME);
		if (token) {
			const { destroySession } = await import('$lib/server/auth/index.js');
			await destroySession(token);
		}
		cookies.delete(COOKIE_NAME, { path: '/' });
		throw redirect(303, '/login');
	}
};
