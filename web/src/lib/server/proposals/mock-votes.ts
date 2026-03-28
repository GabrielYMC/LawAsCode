/**
 * Mock 投票資料
 * 生產環境中投票紀錄存於 PocketBase
 */

import { VoteChoice } from '$lib/types/vote.js';
import type { VoteSession } from '$lib/types/vote.js';

export const MOCK_VOTE_SESSIONS: VoteSession[] = [
	{
		id: 'vote-001',
		proposalId: 'proposal-001',
		transitionLabel: '交付委員會',
		description: '是否將「修正法規標準規則第五條、第十二條條文」交付法規委員會審查',
		status: 'closed',
		createdAt: '2026-03-26T14:00:00',
		closedAt: '2026-03-26T14:15:00',
		closedBy: 'dev-speaker',
		ballots: [
			{
				odaterId: 'dev-legislator-1',
				voterName: '測試議員A',
				choice: VoteChoice.YEA,
				timestamp: '2026-03-26T14:05:00'
			},
			{
				odaterId: 'dev-legislator-2',
				voterName: '測試議員B',
				choice: VoteChoice.YEA,
				timestamp: '2026-03-26T14:06:00'
			}
		],
		result: {
			yea: 2,
			nay: 0,
			abstain: 0,
			total: 2,
			passed: true,
			threshold: '出席過半數同意'
		}
	},
	{
		id: 'vote-002',
		proposalId: 'proposal-003',
		transitionLabel: '三讀通過',
		description: '是否通過「修正預算辦法第三十四條條文」三讀',
		status: 'closed',
		createdAt: '2026-03-28T10:00:00',
		closedAt: '2026-03-28T10:20:00',
		closedBy: 'dev-speaker',
		ballots: [
			{
				odaterId: 'dev-legislator-1',
				voterName: '測試議員A',
				choice: VoteChoice.YEA,
				timestamp: '2026-03-28T10:05:00'
			},
			{
				odaterId: 'dev-legislator-2',
				voterName: '測試議員B',
				choice: VoteChoice.YEA,
				timestamp: '2026-03-28T10:06:00'
			}
		],
		result: {
			yea: 2,
			nay: 0,
			abstain: 0,
			total: 2,
			passed: true,
			threshold: '出席過半數同意'
		}
	}
];
