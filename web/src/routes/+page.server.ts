import { getLawRepository } from '$lib/server/repositories/index.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const repo = getLawRepository();
	const laws = await repo.listLaws();

	const articleCount = laws.reduce((sum, law) => sum + law.articleCount, 0);

	return {
		lawCount: laws.length,
		articleCount
	};
};
