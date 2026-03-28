/**
 * 提案與修法差異型別定義
 */

import type { LegislativeState } from './workflow.js';
import type { Role } from './user.js';

/** 提案 */
export interface Proposal {
	id: string;
	title: string;
	description: string;
	targetLaw: string; // 被修改的法規 slug
	proposer: string; // 提案人名稱
	proposerRole: Role;
	cosigners: string[]; // 連署人
	state: LegislativeState;
	createdAt: string; // ISO datetime
	updatedAt: string;
	amendments: Amendment[];
}

/** 單條修正案 */
export interface Amendment {
	eId: string; // 被修改的條文 eId
	articleNum: string; // 如「第九條」
	type: 'modify' | 'add' | 'delete';
	oldText: string;
	newText: string;
	reason: string; // 修正理由
}

/** Diff 結果（用於渲染） */
export interface DiffSegment {
	type: 'equal' | 'insert' | 'delete';
	text: string;
}

/** 修正前後對照表行 */
export interface ComparisonRow {
	articleNum: string;
	amendmentType: 'modify' | 'add' | 'delete';
	oldText: string;
	newText: string;
	reason: string;
	diff: {
		oldSegments: DiffSegment[];
		newSegments: DiffSegment[];
	};
}
