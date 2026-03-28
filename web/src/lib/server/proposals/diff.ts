/**
 * 條文差異比對引擎
 * 基於 character-level diff，為法規條文最佳化
 */

import { diffChars } from 'diff';
import type { DiffSegment, ComparisonRow, Amendment } from '$lib/types/proposal.js';

/** 計算兩段文字的 character-level diff */
export function computeDiff(
	oldText: string,
	newText: string
): { oldSegments: DiffSegment[]; newSegments: DiffSegment[] } {
	const changes = diffChars(oldText, newText);

	const oldSegments: DiffSegment[] = [];
	const newSegments: DiffSegment[] = [];

	for (const change of changes) {
		if (change.added) {
			newSegments.push({ type: 'insert', text: change.value });
		} else if (change.removed) {
			oldSegments.push({ type: 'delete', text: change.value });
		} else {
			oldSegments.push({ type: 'equal', text: change.value });
			newSegments.push({ type: 'equal', text: change.value });
		}
	}

	return { oldSegments, newSegments };
}

/** 從修正案列表產生修正前後對照表 */
export function buildComparisonTable(amendments: Amendment[]): ComparisonRow[] {
	return amendments.map((a) => ({
		articleNum: a.articleNum,
		amendmentType: a.type,
		oldText: a.oldText,
		newText: a.newText,
		reason: a.reason,
		diff: computeDiff(a.oldText, a.newText)
	}));
}
