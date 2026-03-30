/**
 * 路由守衛
 * 檢查使用者是否有權限存取特定頁面或執行特定操作
 */

import { redirect } from '@sveltejs/kit';
import { Role, type User } from '$lib/types/user.js';

/** 需要登入（任何角色） */
export function requireAuth(user: User | null): asserts user is User {
	if (!user) {
		throw redirect(303, '/login');
	}
}

/** 需要特定角色 */
export function requireRole(user: User | null, ...roles: Role[]): asserts user is User {
	requireAuth(user);
	if (!roles.includes(user.role)) {
		throw redirect(303, '/unauthorized');
	}
}

/** 檢查使用者是否有特定角色（不 redirect，回傳 boolean） */
export function hasRole(user: User | null, ...roles: Role[]): boolean {
	if (!user) return false;
	return roles.includes(user.role);
}

/** 頁面存取權限定義 */
export const PAGE_PERMISSIONS: Record<string, Role[] | 'public' | 'authenticated'> = {
	'/': 'public',
	'/login': 'public',
	'/unauthorized': 'public',
	'/laws': 'public', // 法規瀏覽開放所有人
	'/search': 'public', // 搜尋開放所有人
	'/proposals': 'authenticated', // 提案列表需登入
	'/proposals/new': [Role.LEGISLATOR, Role.PRESIDENT, Role.SPEAKER], // 新增提案限有提案權的角色
	'/dashboard': [Role.SPEAKER, Role.PRESIDENT, Role.SECRETARY_GENERAL], // 控制台限特定角色
	'/admin': [Role.SPEAKER, Role.PRESIDENT], // 系統設定限議長/會長
};

/** 根據路徑檢查存取權限 */
export function checkPageAccess(pathname: string, user: User | null): 'ok' | 'login' | 'unauthorized' {
	// 精確匹配
	const permission = PAGE_PERMISSIONS[pathname];

	if (permission === 'public') return 'ok';

	if (!user) return 'login';

	if (permission === 'authenticated') return 'ok';

	if (Array.isArray(permission) && !permission.includes(user.role)) {
		return 'unauthorized';
	}

	// 未定義的路由預設需要登入
	return 'ok';
}
