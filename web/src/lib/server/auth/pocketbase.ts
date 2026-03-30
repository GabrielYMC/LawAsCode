/**
 * PocketBase 認證服務
 * 生產環境使用 PocketBase 管理帳號與 session
 *
 * PocketBase collections 設計：
 *
 * users (auth collection):
 *   - id: string (auto)
 *   - email: string
 *   - name: string
 *   - role: string (president|speaker|legislator|secretary_general|secretariat|student)
 *   - studentId: string (學號，可選)
 *
 * sessions (base collection):
 *   - id: string (auto)
 *   - userId: string (relation → users)
 *   - token: string (unique, indexed)
 *   - expiresAt: string (datetime)
 *   - createdAt: string (datetime, auto)
 *
 * audit_log (base collection, append-only):
 *   - id: string (auto)
 *   - userId: string (relation → users)
 *   - action: string (e.g., 'login', 'transition', 'vote', 'create_proposal')
 *   - target: string (e.g., proposal ID, vote session ID)
 *   - detail: json (操作細節)
 *   - createdAt: string (datetime, auto)
 */

import { getConfig } from '$lib/server/config.js';
import { Role, type User } from '$lib/types/user.js';
import { randomBytes } from 'crypto';

// ─── PocketBase API 呼叫 ───

/** 取得 PocketBase 設定 */
function getPbConfig() {
	const config = getConfig();
	return {
		baseUrl: config.pocketbase.baseUrl
	};
}

/** 發送 PocketBase API 請求 */
async function pbFetch(
	path: string,
	options: { method?: string; body?: any; token?: string } = {}
): Promise<Response> {
	const { baseUrl } = getPbConfig();
	const url = `${baseUrl}/api${path}`;

	const headers: Record<string, string> = {
		'Content-Type': 'application/json'
	};
	if (options.token) {
		headers['Authorization'] = options.token;
	}

	const response = await fetch(url, {
		method: options.method || 'GET',
		headers,
		body: options.body ? JSON.stringify(options.body) : undefined
	});

	return response;
}

// ─── Session 管理 ───

/** 產生安全的 session token */
function generateToken(): string {
	return randomBytes(32).toString('hex');
}

/**
 * 從 session token 還原使用者
 * 查詢 PocketBase sessions collection → 取得 user record
 */
export async function getUserFromSessionPb(sessionToken: string | undefined): Promise<User | null> {
	if (!sessionToken) return null;

	try {
		// 查詢 sessions collection 中 token 符合的記錄
		const res = await pbFetch(
			`/collections/sessions/records?filter=(token='${encodeURIComponent(sessionToken)}')&expand=userId`
		);

		if (!res.ok) return null;

		const data = await res.json();
		if (!data.items || data.items.length === 0) return null;

		const session = data.items[0];

		// 檢查是否過期
		if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
			// 清除過期 session
			await pbFetch(`/collections/sessions/records/${session.id}`, { method: 'DELETE' });
			return null;
		}

		// 展開的 user 資料
		const userRecord = session.expand?.userId;
		if (!userRecord) return null;

		return mapPbUserToUser(userRecord);
	} catch {
		return null;
	}
}

/**
 * 用 PocketBase auth 登入（email + password）
 * 回傳 session token
 */
export async function loginWithPassword(
	email: string,
	password: string
): Promise<{ token: string; user: User } | null> {
	try {
		// PocketBase auth endpoint
		const res = await pbFetch('/collections/users/auth-with-password', {
			method: 'POST',
			body: { identity: email, password }
		});

		if (!res.ok) return null;

		const data = await res.json();
		const user = mapPbUserToUser(data.record);

		// 建立 session record
		const sessionToken = generateToken();
		const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 天

		await pbFetch('/collections/sessions/records', {
			method: 'POST',
			token: data.token, // 使用 PocketBase 回傳的 auth token 寫入
			body: {
				userId: data.record.id,
				token: sessionToken,
				expiresAt
			}
		});

		// 寫入審計日誌
		await writeAuditLog(data.record.id, 'login', '', { email }, data.token);

		return { token: sessionToken, user };
	} catch {
		return null;
	}
}

/**
 * 登出：刪除 session record
 */
export async function logoutPb(sessionToken: string): Promise<void> {
	try {
		const res = await pbFetch(
			`/collections/sessions/records?filter=(token='${encodeURIComponent(sessionToken)}')`
		);

		if (!res.ok) return;

		const data = await res.json();
		if (data.items && data.items.length > 0) {
			await pbFetch(`/collections/sessions/records/${data.items[0].id}`, {
				method: 'DELETE'
			});
		}
	} catch {
		// best effort
	}
}

// ─── 審計日誌 ───

/**
 * 寫入審計日誌（append-only）
 * 記錄所有重要操作：登入、狀態轉移、投票、建立提案等
 */
export async function writeAuditLog(
	userId: string,
	action: string,
	target: string,
	detail: Record<string, any>,
	authToken?: string
): Promise<void> {
	try {
		await pbFetch('/collections/audit_log/records', {
			method: 'POST',
			token: authToken,
			body: {
				userId,
				action,
				target,
				detail: JSON.stringify(detail)
			}
		});
	} catch {
		// 審計失敗不應阻擋主流程，但應該記錄到 server log
		console.error(`[AUDIT] Failed to write audit log: ${action} ${target}`);
	}
}

// ─── 型別轉換 ───

/** 將 PocketBase user record 轉為 app User 型別 */
function mapPbUserToUser(record: PbUserRecord): User {
	return {
		id: record.id,
		name: record.name,
		role: (record.role as Role) || Role.STUDENT,
		email: record.email
	};
}

/** PocketBase user record 型別 */
interface PbUserRecord {
	id: string;
	email: string;
	name: string;
	role: string;
	studentId?: string;
	created: string;
	updated: string;
}
