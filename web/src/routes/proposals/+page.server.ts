import { MOCK_PROPOSALS } from '$lib/server/proposals/mock-data.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return {
		proposals: MOCK_PROPOSALS
	};
};
