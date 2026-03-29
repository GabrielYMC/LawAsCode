import { MOCK_PROPOSALS } from '$lib/server/proposals/mock-data.js';
import { requireAuth } from '$lib/server/auth/guards.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireAuth(locals.user);

	return {
		proposals: MOCK_PROPOSALS
	};
};
