import { getConfig } from '$lib/server/config.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const config = getConfig();
	return {
		llmProvider: config.llm.provider,
		llmModel: config.llm.model
	};
};
