import { getProposal, getVoteSessionsForProposal, getOpenVoteSession } from '$lib/server/proposals/service.js';
import { buildComparisonTable } from '$lib/server/proposals/diff.js';
import { TRANSITIONS } from '$lib/types/workflow.js';
import { error } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/guards.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	requireAuth(locals.user);
	const proposal = getProposal(params.id);

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

	// 此提案的歷史表決紀錄
	const voteHistory = getVoteSessionsForProposal(proposal.id);

	// 進行中的投票
	const openVote = getOpenVoteSession(proposal.id);

	return {
		proposal,
		comparisonTable,
		availableTransitions,
		voteHistory,
		openVote: openVote ?? null,
		stateProgress: {
			steps: stateOrder,
			currentIndex
		}
	};
};
