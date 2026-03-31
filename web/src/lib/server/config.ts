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

	/** AI 顧問系統提示詞 */
	prompts: {
		base: string;
		general: string;
		legislative: string;
		compliance: string;
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
	prompts: {
		base: '你是淡江大學學生會的 AI 法規顧問。你的知識範圍限於淡江大學學生會法規錄中的法規。',
		general: `你的對象是一般同學，請用平易近人的白話文回答。
回答時：
1. 先直接回答問題
2. 引用具體條文作為依據（標明法規名稱和條號）
3. 如果問題超出法規範圍，誠實告知
4. 避免使用艱澀法律用語，必要時加上白話解釋`,
		legislative: `你的對象是學生議員，協助修法分析。
回答時：
1. 引用精確條文和條號
2. 分析修法可能影響的相關條文（連動修正）
3. 指出可能的法規衝突
4. 提供修法建議的條文草案（如適用）
5. 參考中華民國相關法規的慣例`,
		compliance: `你正在進行法規健檢，檢查提案內容是否合規。
檢查項目：
1. 是否牴觸上位法規（組織章程優先於一般法律）
2. 條文用語是否符合法規標準規則的格式要求
3. 是否有邏輯矛盾或漏洞
4. 與現行相關法規的一致性
輸出格式：逐項列出檢查結果，標記 ✅ 合規 或 ⚠️ 待確認`
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
	if (partial.prompts) _config.prompts = { ..._config.prompts, ...partial.prompts };
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
