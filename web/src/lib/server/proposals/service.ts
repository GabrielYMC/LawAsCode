/**
 * 提案服務層
 * 管理提案狀態轉移、投票、新增提案
 * 開發環境：記憶體內操作 Mock 資料
 * 生產環境：透過 Gitea API + PocketBase 操作
 */

import { MOCK_PROPOSALS } from './mock-data.js';
import { MOCK_VOTE_SESSIONS } from './mock-votes.js';
import { TRANSITIONS, LegislativeState } from '$lib/types/workflow.js';
import { VoteChoice, computeVoteResult } from '$lib/types/vote.js';
import type { Proposal } from '$lib/types/proposal.js';
import type { VoteSession, VoteBallot } from '$lib/types/vote.js';
import type { Transition } from '$lib/types/workflow.js';
import type { User } from '$lib/types/user.js';

/** 記憶體中的提案與投票資料（開發用） */
let _proposals: Proposal[] = [...MOCK_PROPOSALS];
let _voteSessions: VoteSession[] = [...MOCK_VOTE_SESSIONS];
let _nextProposalId = 4;
let _nextVoteId = 3;

// ─── 提案查詢 ───

export function getAllProposals(): Proposal[] {
	return _proposals;
}

export function getProposal(id: string): Proposal | undefined {
	return _proposals.find((p) => p.id === id);
}

// ─── 提案建立 ───

export interface CreateProposalInput {
	title: string;
	description: string;
	targetLaw: string;
	amendments: Proposal['amendments'];
}

export function createProposal(input: CreateProposalInput, user: User): Proposal {
	const now = new Date().toISOString();
	const proposal: Proposal = {
		id: `proposal-${String(_nextProposalId++).padStart(3, '0')}`,
		title: input.title,
		description: input.description,
		targetLaw: input.targetLaw,
		proposer: user.name,
		proposerRole: user.role,
		cosigners: [],
		state: LegislativeState.PROPOSED,
		createdAt: now,
		updatedAt: now,
		amendments: input.amendments
	};
	_proposals.push(proposal);
	return proposal;
}

// ─── 狀態轉移（無需投票） ───

export interface TransitionResult {
	success: boolean;
	error?: string;
	proposal?: Proposal;
}

export function executeTransition(
	proposalId: string,
	transitionLabel: string,
	user: User
): TransitionResult {
	const proposal = getProposal(proposalId);
	if (!proposal) return { success: false, error: '找不到此提案' };

	// 找到對應的轉移規則
	const transition = TRANSITIONS.find(
		(t) => t.from === proposal.state && t.label === transitionLabel
	);
	if (!transition) return { success: false, error: '無效的狀態轉移' };

	// 驗證角色
	if (user.role !== transition.requiredRole) {
		return { success: false, error: `此操作需要 ${transition.requiredRole} 角色` };
	}

	// 需要投票的轉移不能直接執行
	if (transition.requiresVote) {
		return { success: false, error: '此操作需要經過表決，請先發起投票' };
	}

	// 執行轉移
	proposal.state = transition.to;
	proposal.updatedAt = new Date().toISOString();

	return { success: true, proposal };
}

// ─── 投票管理 ───

export function getVoteSessionsForProposal(proposalId: string): VoteSession[] {
	return _voteSessions.filter((v) => v.proposalId === proposalId);
}

export function getOpenVoteSession(proposalId: string): VoteSession | undefined {
	return _voteSessions.find((v) => v.proposalId === proposalId && v.status === 'open');
}

export function getVoteSession(voteId: string): VoteSession | undefined {
	return _voteSessions.find((v) => v.id === voteId);
}

/** 議長發起投票 */
export function createVoteSession(
	proposalId: string,
	transitionLabel: string,
	user: User
): { success: boolean; error?: string; voteSession?: VoteSession } {
	const proposal = getProposal(proposalId);
	if (!proposal) return { success: false, error: '找不到此提案' };

	// 找到對應的轉移規則
	const transition = TRANSITIONS.find(
		(t) => t.from === proposal.state && t.label === transitionLabel
	);
	if (!transition) return { success: false, error: '無效的狀態轉移' };
	if (!transition.requiresVote) return { success: false, error: '此操作不需要投票' };

	// 檢查是否已有進行中的投票
	const existing = getOpenVoteSession(proposalId);
	if (existing) return { success: false, error: '此提案已有進行中的投票' };

	const voteSession: VoteSession = {
		id: `vote-${String(_nextVoteId++).padStart(3, '0')}`,
		proposalId,
		transitionLabel,
		description: `是否${transitionLabel}「${proposal.title}」`,
		status: 'open',
		createdAt: new Date().toISOString(),
		ballots: []
	};

	_voteSessions.push(voteSession);
	return { success: true, voteSession };
}

/** 議員投票 */
export function castVote(
	voteId: string,
	choice: VoteChoice,
	user: User
): { success: boolean; error?: string } {
	const session = getVoteSession(voteId);
	if (!session) return { success: false, error: '找不到此投票' };
	if (session.status !== 'open') return { success: false, error: '投票已結束' };

	// 檢查是否已投過
	const existing = session.ballots.find((b) => b.odaterId === user.id);
	if (existing) return { success: false, error: '你已經投過票了' };

	const ballot: VoteBallot = {
		odaterId: user.id,
		voterName: user.name,
		choice,
		timestamp: new Date().toISOString()
	};

	session.ballots.push(ballot);
	return { success: true };
}

/** 議長結束投票並計算結果 */
export function closeVoteSession(
	voteId: string,
	user: User
): { success: boolean; error?: string; passed?: boolean } {
	const session = getVoteSession(voteId);
	if (!session) return { success: false, error: '找不到此投票' };
	if (session.status !== 'open') return { success: false, error: '投票已結束' };

	// 計算結果
	const result = computeVoteResult(session.ballots, 'simple_majority');

	session.status = 'closed';
	session.closedAt = new Date().toISOString();
	session.closedBy = user.id;
	session.result = result;

	// 若通過，執行狀態轉移
	if (result.passed) {
		const proposal = getProposal(session.proposalId);
		if (proposal) {
			const transition = TRANSITIONS.find(
				(t) => t.from === proposal.state && t.label === session.transitionLabel
			);
			if (transition) {
				proposal.state = transition.to;
				proposal.updatedAt = new Date().toISOString();
			}
		}
	}

	return { success: true, passed: result.passed };
}
