/**
 * 認證服務
 * 開發環境：Mock auth（Cookie 存 user ID）
 * 生產環境：PocketBase auth（待整合）
 */

import { DEV_USERS, type User } from '$lib/types/user.js';

const COOKIE_NAME = 'lac_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/** 從 cookie 還原使用者 */
export function getUserFromSession(sessionId: string | undefined): User | null {
	if (!sessionId) return null;

	// Mock: sessionId = user.id
	const user = DEV_USERS.find((u) => u.id === sessionId);
	return user ?? null;
}

/** 建立 session（mock: 回傳 user ID 作為 session token） */
export function createSession(userId: string): string | null {
	const user = DEV_USERS.find((u) => u.id === userId);
	if (!user) return null;
	return user.id;
}

/** Cookie 設定 */
export function getSessionCookieOptions(maxAge: number = COOKIE_MAX_AGE) {
	return {
		name: COOKIE_NAME,
		path: '/',
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: false, // dev 環境，生產環境改 true
		maxAge
	};
}

export { COOKIE_NAME };
