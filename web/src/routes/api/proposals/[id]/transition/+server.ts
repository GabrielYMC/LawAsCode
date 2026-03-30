/**
 * 提案狀態轉移 API
 * POST /api/proposals/:id/transition
 * body: { transitionLabel: string }
 */

import { json } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth/guards.js';
import { executeTransition } from '$lib/server/proposals/service.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request, locals }) => {
	requireAuth(locals.user);

	const { transitionLabel } = await request.json();

	if (!transitionLabel) {
		return json({ success: false, error: '缺少 transitionLabel' }, { status: 400 });
	}

	const result = executeTransition(params.id, transitionLabel, locals.user);

	if (!result.success) {
		return json({ success: false, error: result.error }, { status: 400 });
	}

	return json({ success: true, proposal: result.proposal });
};
