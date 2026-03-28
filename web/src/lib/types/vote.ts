/**
 * 投票與表決型別定義
 * 生產環境中投票紀錄存於 PocketBase
 */

export enum VoteChoice {
	YEA = 'yea', // 贊成
	NAY = 'nay', // 反對
	ABSTAIN = 'abstain' // 棄權
}

export const VOTE_LABELS: Record<VoteChoice, string> = {
	[VoteChoice.YEA]: '贊成',
	[VoteChoice.NAY]: '反對',
	[VoteChoice.ABSTAIN]: '棄權'
};

export const VOTE_COLORS: Record<VoteChoice, string> = {
	[VoteChoice.YEA]: '#3fb950',
	[VoteChoice.NAY]: '#f85149',
	[VoteChoice.ABSTAIN]: '#8b949e'
};

/** 單次投票紀錄 */
export interface VoteBallot {
	odaterId: string; // 投票人 ID
	voterName: string;
	choice: VoteChoice;
	timestamp: string; // ISO datetime
}

/** 表決案 */
export interface VoteSession {
	id: string;
	proposalId: string;
	transitionLabel: string; // 表決議題（如「逕付二讀」「三讀通過」）
	description: string;
	status: 'open' | 'closed';
	createdAt: string;
	closedAt?: string;
	closedBy?: string; // 議長 ID
	ballots: VoteBallot[];
	result?: VoteResult;
}

/** 表決結果 */
export interface VoteResult {
	yea: number;
	nay: number;
	abstain: number;
	total: number;
	passed: boolean;
	threshold: string; // 法定門檻描述，如「出席過半」
}

/** 計算表決結果 */
export function computeVoteResult(
	ballots: VoteBallot[],
	threshold: 'simple_majority' | 'two_thirds' | 'one_fifth'
): VoteResult {
	const yea = ballots.filter((b) => b.choice === VoteChoice.YEA).length;
	const nay = ballots.filter((b) => b.choice === VoteChoice.NAY).length;
	const abstain = ballots.filter((b) => b.choice === VoteChoice.ABSTAIN).length;
	const total = ballots.length;

	let passed = false;
	let thresholdDesc = '';

	switch (threshold) {
		case 'simple_majority':
			passed = yea > total / 2;
			thresholdDesc = '出席過半數同意';
			break;
		case 'two_thirds':
			passed = yea >= (total * 2) / 3;
			thresholdDesc = '出席三分之二以上同意';
			break;
		case 'one_fifth':
			passed = yea >= total / 5;
			thresholdDesc = '議員總額五分之一以上連署';
			break;
	}

	return { yea, nay, abstain, total, passed, threshold: thresholdDesc };
}
