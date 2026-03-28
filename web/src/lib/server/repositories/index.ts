/**
 * Repository 工廠
 * 根據環境變數選擇實作
 */

import { resolve } from 'path';
import type { LawRepository } from './types.js';
import { FilesystemLawRepository } from './filesystem.js';

let instance: LawRepository | null = null;

export function getLawRepository(): LawRepository {
	if (instance) return instance;

	const source = process.env.LAW_SOURCE || 'fs';

	switch (source) {
		case 'fs': {
			// 法規目錄在專案根目錄的 laws/
			const lawsRoot = resolve(process.cwd(), '..', 'laws');
			instance = new FilesystemLawRepository(lawsRoot);
			break;
		}
		case 'gitea': {
			// TODO: Phase 2b — GiteaLawRepository
			throw new Error('Gitea repository not yet implemented');
		}
		default:
			throw new Error(`Unknown LAW_SOURCE: ${source}`);
	}

	return instance;
}
