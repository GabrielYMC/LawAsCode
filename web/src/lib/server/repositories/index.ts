/**
 * Repository 工廠
 * 根據設定選擇實作
 *
 * - fs：讀取本地 laws/ 目錄（開發用）
 * - gitea：呼叫 Gitea REST API（生產環境）
 */

import { resolve } from 'path';
import type { LawRepository } from './types.js';
import { FilesystemLawRepository } from './filesystem.js';
import { GiteaLawRepository } from './gitea.js';
import { getConfig } from '$lib/server/config.js';

let instance: LawRepository | null = null;
let lastSource: string | null = null;

export function getLawRepository(): LawRepository {
	// 根據設定決定使用哪個 repository
	const config = getConfig();
	const source = config.gitea.enabled ? 'gitea' : 'fs';

	// 若 source 切換了，重建 instance
	if (instance && lastSource === source) return instance;

	switch (source) {
		case 'fs': {
			// 法規目錄在專案根目錄的 laws/
			const lawsRoot = resolve(process.cwd(), '..', 'laws');
			instance = new FilesystemLawRepository(lawsRoot);
			break;
		}
		case 'gitea': {
			instance = new GiteaLawRepository();
			break;
		}
		default:
			throw new Error(`Unknown LAW_SOURCE: ${source}`);
	}

	lastSource = source;
	return instance;
}
