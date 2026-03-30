/**
 * PocketBase 認證服務（PB v0.23+ 相容）
 * 生產環境使用 PocketBase 管理帳號與 session
 *
 * PocketBase collections：
 *
 * users (PB 內建 auth collection):
 *   - id, email, name, role (select), studentId (text, optional)
 *
 * lac_sessions (base collection):
 *   - userId: text (存 user id)
 *   - token: text (session token)
 *   - expiresAt: date
 *
 * lac_audit_log (base collection, append-only):
 *   - userId: text
 *   - action: text
 *   - target: text
 *   - detail: json
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

/**
 * 發送 PocketBase API 請求
 * PB v0.23+ 預設 API rules 全鎖，需帶 superuser token 才能操作自訂 collection
 * 我們使用 PB auth token（登入時取得）或用無 auth 存取 users auth endpoint
 */
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
 * 1. 查 lac_sessions 找到 userId
 * 2. 查 users 取得完整 user record
 */
export async function getUserFromSessionPb(sessionToken: string | undefined): Promise<User | null> {
	if (!sessionToken) return null;

	try {
		// 查詢 lac_sessions 中 token 符合的記錄
		const res = await pbFetch(
			`/collections/lac_sessions/records?filter=(token='${encodeURIComponent(sessionToken)}')`
		);

		if (!res.ok) return null;

		const data = await res.json();
		if (!data.items || data.items.length === 0) return null;

		const session = data.items[0];

		// 檢查是否過期
		if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
			// 清除過期 session
			await pbFetch(`/collections/lac_sessions/records/${session.id}`, { method: 'DELETE' });
			return null;
		}

		// 用 userId 查 users collection
		const userRes = await pbFetch(`/collections/users/records/${session.userId}`);
		if (!userRes.ok) return null;

		const userRecord = await userRes.json();
		return mapPbUserToUser(userRecord);
	} catch {
		return null;
	}
}

/**
 * 用 PocketBase auth 登入（email + password）
 * PB v0.23+: POST /api/collections/users/auth-with-password
 */
export async function loginWithPassword(
	email: string,
	password: string
): Promise<{ token: string; user: User } | null> {
	try {
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

		// 用 PB auth token 寫入 lac_sessions
		await pbFetch('/collections/lac_sessions/records', {
			method: 'POST',
			token: data.token,
			body: {
				userId: data.record.id,
				token: sessionToken,
				expiresAt
			}
		});

		// 寫入審計日誌
		await writeAuditLog(data.record.id, 'login', '', { email }, data.token);

		return { token: sessionToken, user };
	} catch (err) {
		console.error('[PB AUTH] Login error:', err);
		return null;
	}
}

/**
 * 登出：刪除 lac_sessions record
 */
export async function logoutPb(sessionToken: string): Promise<void> {
	try {
		const res = await pbFetch(
			`/collections/lac_sessions/records?filter=(token='${encodeURIComponent(sessionToken)}')`
		);

		if (!res.ok) return;

		const data = await res.json();
		if (data.items && data.items.length > 0) {
			await pbFetch(`/collections/lac_sessions/records/${data.items[0].id}`, {
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
 */
export async function writeAuditLog(
	userId: string,
	action: string,
	target: string,
	detail: Record<string, any>,
	authToken?: string
): Promise<void> {
	try {
		await pbFetch('/collections/lac_audit_log/records', {
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
