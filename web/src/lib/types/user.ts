/**
 * 使用者與角色型別定義
 */

export enum Role {
	PRESIDENT = 'president', // 會長
	SPEAKER = 'speaker', // 議長
	LEGISLATOR = 'legislator', // 議員
	SECRETARY_GENERAL = 'secretary_general', // 秘書長
	SECRETARIAT = 'secretariat', // 秘書處
	STUDENT = 'student' // 一般學生
}

export const ROLE_LABELS: Record<Role, string> = {
	[Role.PRESIDENT]: '會長',
	[Role.SPEAKER]: '議長',
	[Role.LEGISLATOR]: '議員',
	[Role.SECRETARY_GENERAL]: '秘書長',
	[Role.SECRETARIAT]: '秘書處',
	[Role.STUDENT]: '一般學生'
};

export interface User {
	id: string;
	name: string;
	role: Role;
	email?: string;
}

/** 開發用預設帳號 */
export const DEV_USERS: User[] = [
	{ id: 'dev-president', name: '測試會長', role: Role.PRESIDENT },
	{ id: 'dev-speaker', name: '測試議長', role: Role.SPEAKER },
	{ id: 'dev-legislator-1', name: '測試議員A', role: Role.LEGISLATOR },
	{ id: 'dev-legislator-2', name: '測試議員B', role: Role.LEGISLATOR },
	{ id: 'dev-secretary-general', name: '測試秘書長', role: Role.SECRETARY_GENERAL },
	{ id: 'dev-secretariat', name: '測試秘書', role: Role.SECRETARIAT },
	{ id: 'dev-student', name: '一般同學', role: Role.STUDENT }
];
