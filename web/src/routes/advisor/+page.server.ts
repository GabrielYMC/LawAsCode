import { requireAuth } from '$lib/server/auth/guards.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireAuth(locals.user);
	return {};
};
