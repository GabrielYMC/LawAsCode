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

	/** 展示模式 */
	demo: {
		enabled: boolean; // 允許用 DEV 角色卡片登入（即使 PocketBase 已啟用）
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
	},
	demo: {
		enabled: true
	}
};

/**
 * 從環境變數載入設定覆蓋
 * 部署時設環境變數即可，不需進 admin 頁手動改
 *
 * 支援的環境變數：
 *   LAC_LLM_PROVIDER=ollama|mock
 *   LAC_LLM_BASE_URL=http://localhost:11434
 *   LAC_LLM_MODEL=gemma3:12b
 *   LAC_LLM_TEMPERATURE=0.3
 *   LAC_LLM_MAX_TOKENS=1024
 *   LAC_SEARCH_THRESHOLD=0.5
 *   LAC_SEARCH_MAX_RESULTS=5
 *   LAC_GITEA_ENABLED=true|false
 *   LAC_GITEA_BASE_URL=http://localhost:3000
 *   LAC_GITEA_OWNER=student-association
 *   LAC_GITEA_REPO=laws
 *   LAC_GITEA_TOKEN=xxx
 *   LAC_PB_ENABLED=true|false
 *   LAC_PB_BASE_URL=http://localhost:8090
 *   LAC_DEMO_ENABLED=true|false
 */
function loadEnvOverrides(config: SystemConfig): SystemConfig {
	const env = process.env;

	// LLM
	if (env.LAC_LLM_PROVIDER === 'ollama' || env.LAC_LLM_PROVIDER === 'mock') {
		config.llm.provider = env.LAC_LLM_PROVIDER;
	}
	if (env.LAC_LLM_BASE_URL) config.llm.baseUrl = env.LAC_LLM_BASE_URL;
	if (env.LAC_LLM_MODEL) config.llm.model = env.LAC_LLM_MODEL;
	if (env.LAC_LLM_TEMPERATURE) config.llm.temperature = parseFloat(env.LAC_LLM_TEMPERATURE);
	if (env.LAC_LLM_MAX_TOKENS) config.llm.maxTokens = parseInt(env.LAC_LLM_MAX_TOKENS);

	// Search
	if (env.LAC_SEARCH_THRESHOLD) config.search.threshold = parseFloat(env.LAC_SEARCH_THRESHOLD);
	if (env.LAC_SEARCH_MAX_RESULTS) config.search.maxResults = parseInt(env.LAC_SEARCH_MAX_RESULTS);

	// Gitea
	if (env.LAC_GITEA_ENABLED) config.gitea.enabled = env.LAC_GITEA_ENABLED === 'true';
	if (env.LAC_GITEA_BASE_URL) config.gitea.baseUrl = env.LAC_GITEA_BASE_URL;
	if (env.LAC_GITEA_OWNER) config.gitea.owner = env.LAC_GITEA_OWNER;
	if (env.LAC_GITEA_REPO) config.gitea.repo = env.LAC_GITEA_REPO;
	if (env.LAC_GITEA_TOKEN) config.gitea.token = env.LAC_GITEA_TOKEN;

	// PocketBase
	if (env.LAC_PB_ENABLED) config.pocketbase.enabled = env.LAC_PB_ENABLED === 'true';
	if (env.LAC_PB_BASE_URL) config.pocketbase.baseUrl = env.LAC_PB_BASE_URL;

	// Demo
	if (env.LAC_DEMO_ENABLED) config.demo.enabled = env.LAC_DEMO_ENABLED === 'true';

	return config;
}

/** 執行期設定（記憶體中，重啟後重置為預設值 + 環境變數覆蓋） */
let _config: SystemConfig = loadEnvOverrides(structuredClone(DEFAULT_CONFIG));

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
	if (partial.demo) _config.demo = { ..._config.demo, ...partial.demo };
	return _config;
}

/** 重置為預設值 */
export function resetConfig(): SystemConfig {
	_config = structuredClone(DEFAULT_CONFIG);
	return _config;
}
