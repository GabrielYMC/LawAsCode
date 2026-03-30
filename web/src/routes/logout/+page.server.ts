import { redirect } from '@sveltejs/kit';
import { COOKIE_NAME, destroySession } from '$lib/server/auth/index.js';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ cookies }) => {
		const token = cookies.get(COOKIE_NAME);
		if (token) {
			await destroySession(token);
		}
		cookies.delete(COOKIE_NAME, { path: '/' });
		throw redirect(303, '/login');
	}
};
