/**
 * 認證服務（統一入口）
 * 根據設定自動切換 Mock / PocketBase
 *
 * - Mock：開發用，Cookie 存 user ID，對應 DEV_USERS
 * - PocketBase：生產環境，session token 對應 PB sessions collection
 */

import { DEV_USERS, type User } from '$lib/types/user.js';
import { getConfig } from '$lib/server/config.js';
import { getUserFromSessionPb, logoutPb } from './pocketbase.js';

const COOKIE_NAME = 'lac_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/** 判斷是否使用 PocketBase 認證 */
function usePocketBase(): boolean {
	return getConfig().pocketbase.enabled;
}

/** 從 cookie 還原使用者 */
export async function getUserFromSession(sessionId: string | undefined): Promise<User | null> {
	if (!sessionId) return null;

	if (usePocketBase()) {
		return getUserFromSessionPb(sessionId);
	}

	// Mock: sessionId = user.id
	const user = DEV_USERS.find((u) => u.id === sessionId);
	return user ?? null;
}

/** 建立 session（Mock 模式：回傳 user ID 作為 session token） */
export function createSession(userId: string): string | null {
	// PocketBase 模式下，登入由 loginWithPassword 處理，不走這裡
	const user = DEV_USERS.find((u) => u.id === userId);
	if (!user) return null;
	return user.id;
}

/** 登出 */
export async function destroySession(sessionToken: string): Promise<void> {
	if (usePocketBase()) {
		await logoutPb(sessionToken);
	}
	// Mock 模式不需要做什麼，清 cookie 就好
}

/** Cookie 設定 */
export function getSessionCookieOptions(maxAge: number = COOKIE_MAX_AGE) {
	const isProd = usePocketBase();
	return {
		name: COOKIE_NAME,
		path: '/',
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: isProd, // 生產環境啟用 secure
		maxAge
	};
}

export { COOKIE_NAME };
