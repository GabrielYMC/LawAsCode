import { requireAuth } from '$lib/server/auth/guards.js';
import { createProposal } from '$lib/server/proposals/service.js';
import { Role } from '$lib/types/user.js';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// 可提案的角色
const PROPOSAL_ROLES = [Role.LEGISLATOR, Role.PRESIDENT, Role.SPEAKER];

export const load: PageServerLoad = async ({ locals }) => {
	requireAuth(locals.user);

	if (!PROPOSAL_ROLES.includes(locals.user.role)) {
		throw redirect(303, '/unauthorized');
	}

	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		requireAuth(locals.user);

		if (!PROPOSAL_ROLES.includes(locals.user.role)) {
			return fail(403, { error: '你沒有提案權限' });
		}

		const formData = await request.formData();
		const title = formData.get('title') as string;
		const description = formData.get('description') as string;
		const targetLaw = formData.get('targetLaw') as string;

		// 解析修正條文
		const amendmentCount = parseInt(formData.get('amendmentCount') as string) || 0;
		const amendments = [];

		for (let i = 0; i < amendmentCount; i++) {
			const articleNum = formData.get(`amendment_${i}_articleNum`) as string;
			const type = formData.get(`amendment_${i}_type`) as 'modify' | 'add' | 'delete';
			const oldText = formData.get(`amendment_${i}_oldText`) as string;
			const newText = formData.get(`amendment_${i}_newText`) as string;
			const reason = formData.get(`amendment_${i}_reason`) as string;

			if (articleNum && (newText || oldText)) {
				amendments.push({
					eId: `art_${articleNum.replace(/[^0-9]/g, '')}`,
					articleNum,
					type: type || 'modify',
					oldText: oldText || '',
					newText: newText || '',
					reason: reason || ''
				});
			}
		}

		if (!title?.trim()) {
			return fail(400, { error: '請輸入提案名稱', title, description, targetLaw });
		}
		if (amendments.length === 0) {
			return fail(400, { error: '至少需要一條修正條文', title, description, targetLaw });
		}

		try {
			const proposal = createProposal(
				{ title, description, targetLaw, amendments },
				locals.user
			);
			throw redirect(303, `/proposals/${proposal.id}`);
		} catch (e) {
			if (e && typeof e === 'object' && 'status' in e) throw e; // re-throw redirect
			return fail(500, { error: '建立提案失敗' });
		}
	}
};
