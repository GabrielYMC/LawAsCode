import { redirect } from '@sveltejs/kit';
import { COOKIE_NAME } from '$lib/server/auth/index.js';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ cookies }) => {
		cookies.delete(COOKIE_NAME, { path: '/' });
		throw redirect(303, '/login');
	}
};
