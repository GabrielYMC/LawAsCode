import { MOCK_PROPOSALS } from '$lib/server/proposals/mock-data.js';
import { buildComparisonTable } from '$lib/server/proposals/diff.js';
import { TRANSITIONS } from '$lib/types/workflow.js';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const proposal = MOCK_PROPOSALS.find((p) => p.id === params.id);

	if (!proposal) {
		throw error(404, '找不到此提案');
	}

	const comparisonTable = buildComparisonTable(proposal.amendments);

	// 找出此提案目前狀態的可用轉移
	const availableTransitions = TRANSITIONS.filter((t) => t.from === proposal.state);

	// 建立狀態歷程（依照狀態機推算）
	const stateOrder = [
		'proposed',
		'first_reading',
		'committee',
		'second_reading',
		'third_reading',
		'pending_promulgation',
		'promulgated'
	];
	const currentIndex = stateOrder.indexOf(proposal.state);

	return {
		proposal,
		comparisonTable,
		availableTransitions,
		stateProgress: {
			steps: stateOrder,
			currentIndex
		}
	};
};
