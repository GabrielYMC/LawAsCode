/**
 * 投票 API
 * POST /api/proposals/:id/vote
 *
 * Actions:
 *   { action: 'create', transitionLabel: string }  — 議長發起投票
 *   { action: 'cast', voteId: string, choice: 'yea' | 'nay' | 'abstain' }  — 議員投票
 *   { action: 'close', voteId: string }  — 議長結束投票
 */

import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/guards.js';
import {
	createVoteSession,
	castVote,
	closeVoteSession,
	getOpenVoteSession
} from '$lib/server/proposals/service.js';
import { VoteChoice } from '$lib/types/vote.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	requireAuth(locals.user);

	const body = await request.json();

	switch (body.action) {
		case 'create': {
			const result = createVoteSession(params.id, body.transitionLabel, locals.user);
			if (!result.success) {
				return json({ success: false, error: result.error }, { status: 400 });
			}
			return json({ success: true, voteSession: result.voteSession });
		}

		case 'cast': {
			const choice = body.choice as VoteChoice;
			if (!Object.values(VoteChoice).includes(choice)) {
				return json({ success: false, error: '無效的投票選項' }, { status: 400 });
			}
			const result = castVote(body.voteId, choice, locals.user);
			if (!result.success) {
				return json({ success: false, error: result.error }, { status: 400 });
			}
			return json({ success: true });
		}

		case 'close': {
			const result = closeVoteSession(body.voteId, locals.user);
			if (!result.success) {
				return json({ success: false, error: result.error }, { status: 400 });
			}
			return json({ success: true, passed: result.passed });
		}

		default:
			return json({ success: false, error: '未知的 action' }, { status: 400 });
	}
};

/** GET /api/proposals/:id/vote — 取得進行中的投票 */
export const GET: RequestHandler = async ({ params, locals }) => {
	requireAuth(locals.user);

	const openVote = getOpenVoteSession(params.id);
	return json({ voteSession: openVote ?? null });
};
