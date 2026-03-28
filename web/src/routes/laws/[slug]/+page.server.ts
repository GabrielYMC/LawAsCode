import { error } from '@sveltejs/kit';
import { getLawRepository } from '$lib/server/repositories/index.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const repo = getLawRepository();
	const doc = await repo.getLaw(params.slug);

	if (!doc) {
		throw error(404, `找不到法規：${params.slug}`);
	}

	return {
		law: doc
	};
};
