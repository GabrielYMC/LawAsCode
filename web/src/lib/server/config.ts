/**
 * 系統設定集中管理
 * 所有可調整的系統參數都在這裡定義
 * 管理員設定頁面讀寫此設定
 */

export interface SystemConfig {
	/** Ollama / LLM 設定 */
	llm: {
		provider: 'mock' | 'ollama';
		baseUrl: string;
		model: string;
		temperature: number;
		maxTokens: number;
	};

	/** 法規搜尋設定 */
	search: {
		provider: 'fuse' | 'embedding';
		threshold: number;
		maxResults: number;
	};

	/** Gitea 設定 */
	gitea: {
		enabled: boolean;
		baseUrl: string;
		owner: string;
		repo: string;
		token: string;
	};

	/** PocketBase 設定 */
	pocketbase: {
		enabled: boolean;
		baseUrl: string;
	};

	/** 議事設定 */
	legislative: {
		promulgationDeadlineDays: number; // 會長公布期限（天）
		autoPromulgation: boolean; // 逾期自動公布
	};
}

/** 預設設定 */
const DEFAULT_CONFIG: SystemConfig = {
	llm: {
		provider: 'mock',
		baseUrl: 'http://localhost:11434',
		model: 'gemma3:12b',
		temperature: 0.3,
		maxTokens: 1024
	},
	search: {
		provider: 'fuse',
		threshold: 0.5,
		maxResults: 5
	},
	gitea: {
		enabled: false,
		baseUrl: 'http://localhost:3000',
		owner: 'student-association',
		repo: 'laws',
		token: ''
	},
	pocketbase: {
		enabled: false,
		baseUrl: 'http://localhost:8090'
	},
	legislative: {
		promulgationDeadlineDays: 14,
		autoPromulgation: true
	}
};

/** 執行期設定（記憶體中，重啟後重置為預設值） */
let _config: SystemConfig = structuredClone(DEFAULT_CONFIG);

/** 取得目前設定 */
export function getConfig(): SystemConfig {
	return _config;
}

/** 更新設定（部分更新） */
export function updateConfig(partial: Partial<SystemConfig>): SystemConfig {
	if (partial.llm) _config.llm = { ..._config.llm, ...partial.llm };
	if (partial.search) _config.search = { ..._config.search, ...partial.search };
	if (partial.gitea) _config.gitea = { ..._config.gitea, ...partial.gitea };
	if (partial.pocketbase) _config.pocketbase = { ..._config.pocketbase, ...partial.pocketbase };
	if (partial.legislative) _config.legislative = { ..._config.legislative, ...partial.legislative };
	return _config;
}

/** 重置為預設值 */
export function resetConfig(): SystemConfig {
	_config = structuredClone(DEFAULT_CONFIG);
	return _config;
}
