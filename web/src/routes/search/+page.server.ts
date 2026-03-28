import { getLawRepository } from '$lib/server/repositories/index.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const query = url.searchParams.get('q') || '';
	if (!query.trim()) return { query, results: [] };

	const repo = getLawRepository();
	const results = await repo.searchLaws(query);
	return { query, results };
};
