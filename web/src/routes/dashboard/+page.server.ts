import { MOCK_PROPOSALS } from '$lib/server/proposals/mock-data.js';
import { TRANSITIONS } from '$lib/types/workflow.js';
import { Role } from '$lib/types/user.js';
import { requireRole } from '$lib/server/auth/guards.js';
import type { PageServerLoad } from './$types';

const DASHBOARD_ROLES = [Role.SPEAKER, Role.PRESIDENT, Role.SECRETARY_GENERAL];

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user, ...DASHBOARD_ROLES);

	const currentRole = locals.user.role;

	// 為每個提案計算可用操作
	const proposalsWithActions = MOCK_PROPOSALS.map((proposal) => {
		const transitions = TRANSITIONS.filter((t) => t.from === proposal.state);

		// 只顯示當前角色的操作
		const myActions = transitions.filter((t) => t.requiredRole === currentRole);

		return {
			...proposal,
			myActions
		};
	});

	// 當前角色待處理
	const myQueue = proposalsWithActions.filter((p) => p.myActions.length > 0);

	return {
		proposals: proposalsWithActions,
		myQueue,
		stats: {
			total: MOCK_PROPOSALS.length,
			pending: myQueue.length
		}
	};
};
