import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// AI 顧問開放所有人使用（不需登入）
	return {};
};
