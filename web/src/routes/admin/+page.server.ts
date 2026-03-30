import { requireRole } from '$lib/server/auth/guards.js';
import { getConfig, updateConfig, resetConfig } from '$lib/server/config.js';
import { Role } from '$lib/types/user.js';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// 僅系統管理員可存取（開發階段暫時開放議長/會長）
const ADMIN_ROLES = [Role.SPEAKER, Role.PRESIDENT];

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals.user, ...ADMIN_ROLES);

	return {
		config: getConfig()
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		requireRole(locals.user, ...ADMIN_ROLES);

		const formData = await request.formData();

		try {
			const updated = updateConfig({
				llm: {
					provider: formData.get('llm_provider') as 'mock' | 'ollama',
					baseUrl: formData.get('llm_baseUrl') as string,
					model: formData.get('llm_model') as string,
					temperature: parseFloat(formData.get('llm_temperature') as string) || 0.3,
					maxTokens: parseInt(formData.get('llm_maxTokens') as string) || 1024
				},
				search: {
					provider: formData.get('search_provider') as 'fuse' | 'embedding',
					threshold: parseFloat(formData.get('search_threshold') as string) || 0.5,
					maxResults: parseInt(formData.get('search_maxResults') as string) || 5
				},
				gitea: {
					enabled: formData.get('gitea_enabled') === 'on',
					baseUrl: formData.get('gitea_baseUrl') as string,
					owner: formData.get('gitea_owner') as string,
					repo: formData.get('gitea_repo') as string,
					token: formData.get('gitea_token') as string
				},
				pocketbase: {
					enabled: formData.get('pb_enabled') === 'on',
					baseUrl: formData.get('pb_baseUrl') as string
				},
				legislative: {
					promulgationDeadlineDays: parseInt(formData.get('leg_deadline') as string) || 14,
					autoPromulgation: formData.get('leg_autoPromulgation') === 'on'
				},
				demo: {
					enabled: formData.get('demo_enabled') === 'on'
				}
			});

			return { success: true, config: updated };
		} catch (e) {
			return fail(400, { error: '設定儲存失敗' });
		}
	},

	reset: async ({ locals }) => {
		requireRole(locals.user, ...ADMIN_ROLES);
		const config = resetConfig();
		return { success: true, config, reset: true };
	}
};
