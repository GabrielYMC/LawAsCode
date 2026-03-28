/**
 * Mock 提案資料
 * 模擬 Gitea PR，使用真實法規條文
 * 生產環境中這些資料來自 Gitea API
 */

import { LegislativeState } from '$lib/types/workflow.js';
import { Role } from '$lib/types/user.js';
import type { Proposal } from '$lib/types/proposal.js';

export const MOCK_PROPOSALS: Proposal[] = [
	{
		id: 'proposal-001',
		title: '修正法規標準規則第五條、第十二條條文',
		description:
			'為強化法規公布之時效性與明確性，修正會長公布期限並增訂電子公告機制。',
		targetLaw: '法規標準規則',
		proposer: '測試議員A',
		proposerRole: Role.LEGISLATOR,
		cosigners: ['測試議員B'],
		state: LegislativeState.COMMITTEE,
		createdAt: '2026-03-25T10:00:00',
		updatedAt: '2026-03-27T14:30:00',
		amendments: [
			{
				eId: 'art_5',
				articleNum: '第五條',
				type: 'modify',
				oldText:
					'法律應經學生議會通過，由會長公布。 會長應於收到十四日內公布，未公布者，由學生議會秘書處公布後生效。',
				newText:
					'法律應經學生議會通過，由會長公布。 會長應於收到七日內公布，未公布者，由學生議會秘書處公布後生效。 前項公布，應同時於學生會法規系統進行電子公告。',
				reason:
					'一、將公布期限由十四日縮短為七日，提升法規生效時效。\n二、增訂電子公告機制，配合法規數位化政策。'
			},
			{
				eId: 'art_12',
				articleNum: '第十二條',
				type: 'modify',
				oldText:
					'修正法律廢止少數條文時，得保留所廢條文之條次，並於其下加括弧，註明「刪除」二字。 修正法規增加少數條文時，得將增加之條文，列在適當條文之後，冠以前條「之一」、「之二」等條次。 廢止或增加編、章、節、款、目時，準用前二項之規定。 法律不得牴觸學生會組織章程，命令不得牴觸本會組織章程或法律，下級單位訂定之命令不得牴觸上級單位之命令。',
				newText:
					'修正法律廢止少數條文時，得保留所廢條文之條次，並於其下加括弧，註明「刪除」二字。 修正法規增加少數條文時，得將增加之條文，列在適當條文之後，冠以前條「之一」、「之二」等條次。 廢止或增加編、章、節、款、目時，準用前二項之規定。 法律不得牴觸學生會組織章程，命令不得牴觸本會組織章程或法律，下級單位訂定之命令不得牴觸上級單位之命令。 法規之修正，應於法規系統中保留完整修訂歷程。',
				reason: '增訂修訂歷程保留規定，確保法規修正過程的完整紀錄與可追溯性。'
			}
		]
	},
	{
		id: 'proposal-002',
		title: '修正組織章程第二十條條文',
		description: '明確議長之數位系統管理權限。',
		targetLaw: '組織章程',
		proposer: '測試會長',
		proposerRole: Role.PRESIDENT,
		cosigners: [],
		state: LegislativeState.FIRST_READING,
		createdAt: '2026-03-26T09:00:00',
		updatedAt: '2026-03-26T09:00:00',
		amendments: [
			{
				eId: 'art_20',
				articleNum: '第二十條',
				type: 'modify',
				oldText: '學生議會置議長一人、副議長一人，由學生議員互選之。',
				newText:
					'學生議會置議長一人、副議長一人，由學生議員互選之。 議長為學生議會法規系統之管理者，負責議事流程之數位化推進。',
				reason: '配合法規數位化系統之建置，明確賦予議長法規系統管理權限。'
			}
		]
	},
	{
		id: 'proposal-003',
		title: '修正預算辦法第三十四條條文',
		description: '簡化經費核銷流程，增加數位簽核機制。',
		targetLaw: '預算辦法',
		proposer: '測試議員B',
		proposerRole: Role.LEGISLATOR,
		cosigners: ['測試議員A'],
		state: LegislativeState.PENDING_PROMULGATION,
		createdAt: '2026-03-20T11:00:00',
		updatedAt: '2026-03-28T16:00:00',
		amendments: [
			{
				eId: 'art_34',
				articleNum: '第三十四條',
				type: 'modify',
				oldText:
					'各部門請領經費時，應填具請款單及本會郵政儲金簿，赴會計室辦理核銷手續。',
				newText:
					'各部門請領經費時，應透過學生會行政系統提出請款申請，經數位簽核完成後，赴會計室辦理核銷手續。',
				reason:
					'將紙本請款單改為數位系統申請，導入數位簽核機制，提升行政效率並留存完整紀錄。'
			}
		]
	}
];
