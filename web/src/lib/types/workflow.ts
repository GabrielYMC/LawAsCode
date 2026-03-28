/**
 * 議事流程狀態機型別定義
 */

import { Role } from './user.js';

export enum LegislativeState {
	PROPOSED = 'proposed', // 提案
	FIRST_READING = 'first_reading', // 一讀
	COMMITTEE = 'committee', // 委員會審查
	SECOND_READING = 'second_reading', // 二讀
	THIRD_READING = 'third_reading', // 三讀
	PENDING_PROMULGATION = 'pending_promulgation', // 待公布
	PROMULGATED = 'promulgated', // 已公布
	REJECTED = 'rejected' // 退回/不予審議
}

export const STATE_LABELS: Record<LegislativeState, string> = {
	[LegislativeState.PROPOSED]: '提案',
	[LegislativeState.FIRST_READING]: '一讀',
	[LegislativeState.COMMITTEE]: '委員會審查',
	[LegislativeState.SECOND_READING]: '二讀',
	[LegislativeState.THIRD_READING]: '三讀',
	[LegislativeState.PENDING_PROMULGATION]: '待公布',
	[LegislativeState.PROMULGATED]: '已公布',
	[LegislativeState.REJECTED]: '退回'
};

export const STATE_COLORS: Record<LegislativeState, string> = {
	[LegislativeState.PROPOSED]: '#8b949e',
	[LegislativeState.FIRST_READING]: '#58a6ff',
	[LegislativeState.COMMITTEE]: '#d29922',
	[LegislativeState.SECOND_READING]: '#58a6ff',
	[LegislativeState.THIRD_READING]: '#58a6ff',
	[LegislativeState.PENDING_PROMULGATION]: '#f85149',
	[LegislativeState.PROMULGATED]: '#3fb950',
	[LegislativeState.REJECTED]: '#8b949e'
};

export interface Transition {
	from: LegislativeState;
	to: LegislativeState;
	label: string;
	requiredRole: Role;
	requiresVote: boolean;
	description: string;
}

/** 法定狀態轉移規則 */
export const TRANSITIONS: Transition[] = [
	{
		from: LegislativeState.PROPOSED,
		to: LegislativeState.FIRST_READING,
		label: '排入議程',
		requiredRole: Role.SECRETARY_GENERAL,
		requiresVote: false,
		description: '秘書長將提案排入議會大會議程'
	},
	{
		from: LegislativeState.FIRST_READING,
		to: LegislativeState.COMMITTEE,
		label: '交付委員會',
		requiredRole: Role.SPEAKER,
		requiresVote: false,
		description: '議長宣讀標題後交付法規委員會審查（職權行使辦法§6）'
	},
	{
		from: LegislativeState.FIRST_READING,
		to: LegislativeState.SECOND_READING,
		label: '逕付二讀',
		requiredRole: Role.SPEAKER,
		requiresVote: true,
		description: '出席議員決議不經審查逕付二讀（職權行使辦法§6）'
	},
	{
		from: LegislativeState.FIRST_READING,
		to: LegislativeState.REJECTED,
		label: '不予審議',
		requiredRole: Role.SPEAKER,
		requiresVote: true,
		description: '大會決議不予審議'
	},
	{
		from: LegislativeState.COMMITTEE,
		to: LegislativeState.SECOND_READING,
		label: '審查完成',
		requiredRole: Role.LEGISLATOR,
		requiresVote: true,
		description: '法規委員會審查完成，提出審查意見書（職權行使辦法§8）'
	},
	{
		from: LegislativeState.SECOND_READING,
		to: LegislativeState.THIRD_READING,
		label: '二讀通過',
		requiredRole: Role.SPEAKER,
		requiresVote: true,
		description: '逐條討論完成，進入三讀（職權行使辦法§9-10）'
	},
	{
		from: LegislativeState.SECOND_READING,
		to: LegislativeState.COMMITTEE,
		label: '重付審查',
		requiredRole: Role.SPEAKER,
		requiresVote: true,
		description: '出席議員1/3以上連署，重付委員會審查（以一次為限）（職權行使辦法§10）'
	},
	{
		from: LegislativeState.THIRD_READING,
		to: LegislativeState.PENDING_PROMULGATION,
		label: '三讀通過',
		requiredRole: Role.SPEAKER,
		requiresVote: true,
		description: '全案表決通過，送會長公布（職權行使辦法§12）'
	},
	{
		from: LegislativeState.PENDING_PROMULGATION,
		to: LegislativeState.PROMULGATED,
		label: '公布施行',
		requiredRole: Role.PRESIDENT,
		requiresVote: false,
		description: '會長於收到14日內公布（法規標準規則§5）'
	}
];
