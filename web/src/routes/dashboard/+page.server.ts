import { MOCK_PROPOSALS } from '$lib/server/proposals/mock-data.js';
import { TRANSITIONS } from '$lib/types/workflow.js';
import { Role } from '$lib/types/user.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// 為每個提案計算可用操作
	const proposalsWithActions = MOCK_PROPOSALS.map((proposal) => {
		const transitions = TRANSITIONS.filter((t) => t.from === proposal.state);

		// 分角色歸類操作
		const speakerActions = transitions.filter((t) => t.requiredRole === Role.SPEAKER);
		const presidentActions = transitions.filter((t) => t.requiredRole === Role.PRESIDENT);
		const secretaryActions = transitions.filter(
			(t) => t.requiredRole === Role.SECRETARY_GENERAL
		);
		const legislatorActions = transitions.filter((t) => t.requiredRole === Role.LEGISLATOR);

		return {
			...proposal,
			speakerActions,
			presidentActions,
			secretaryActions,
			legislatorActions
		};
	});

	// 議長待處理：有 speakerActions 的提案
	const speakerQueue = proposalsWithActions.filter((p) => p.speakerActions.length > 0);

	// 會長待處理：有 presidentActions 的提案
	const presidentQueue = proposalsWithActions.filter((p) => p.presidentActions.length > 0);

	// 秘書長待處理
	const secretaryQueue = proposalsWithActions.filter((p) => p.secretaryActions.length > 0);

	// 統計
	const stats = {
		total: MOCK_PROPOSALS.length,
		speakerPending: speakerQueue.length,
		presidentPending: presidentQueue.length,
		secretaryPending: secretaryQueue.length
	};

	return {
		proposals: proposalsWithActions,
		speakerQueue,
		presidentQueue,
		secretaryQueue,
		stats
	};
};
