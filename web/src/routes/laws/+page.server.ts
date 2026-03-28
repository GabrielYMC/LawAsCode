import { getLawRepository } from '$lib/server/repositories/index.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const repo = getLawRepository();
	const laws = await repo.listLaws();

	// 按類型分組：章程/規則/辦法/條例/細則/準則/其他
	const categories = [
		{ label: '章程', laws: laws.filter((l) => l.shortName.includes('章程')) },
		{ label: '規則', laws: laws.filter((l) => l.shortName.includes('規則')) },
		{
			label: '辦法',
			laws: laws.filter(
				(l) => l.shortName.includes('辦法') && !l.shortName.includes('規範辦法')
			)
		},
		{ label: '條例', laws: laws.filter((l) => l.shortName.includes('條例')) },
		{
			label: '細則 · 準則 · 其他',
			laws: laws.filter(
				(l) =>
					l.shortName.includes('細則') ||
					l.shortName.includes('準則') ||
					l.shortName.includes('規範') ||
					l.shortName.includes('釋字') ||
					l.shortName.includes('施行法')
			)
		}
	];

	return { categories, totalCount: laws.length };
};
