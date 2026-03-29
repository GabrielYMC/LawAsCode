import { DEV_USERS } from '$lib/types/user.js';
import { createSession, getSessionCookieOptions, COOKIE_NAME } from '$lib/server/auth/index.js';
import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	// 已登入就跳轉
	if (locals.user) {
		throw redirect(303, url.searchParams.get('redirect') || '/');
	}

	return {
		devUsers: DEV_USERS,
		redirect: url.searchParams.get('redirect') || '/'
	};
};

export const actions: Actions = {
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

	logout: async ({ cookies }) => {
		cookies.delete(COOKIE_NAME, { path: '/' });
		throw redirect(303, '/login');
	}
};
