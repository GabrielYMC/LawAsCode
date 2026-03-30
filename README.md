# LawAsCode

**淡江大學學生會數位法制平台**

將學生會法規從「Word 文件」轉變為「結構化資料」，以 Git 版本控制管理修法流程，並提供 AI 法規顧問。

## 功能總覽

### 法規瀏覽器（公開）

- 22 部現行法規、672 條條文，結構化呈現
- 依類型分組（章程/規則/辦法/條例）
- 章節摺疊展開、條文 eId 錨點定位
- 全文模糊搜尋（fuse.js）

### AI 法規顧問（公開）

採用 RAG（Retrieval-Augmented Generation）架構，從法規庫中檢索相關條文後交給 LLM 回答。

| 模式 | 對象 | 功能 |
|------|------|------|
| 法規諮詢 | 一般同學 | 用白話文回答法規問題 |
| 修法輔助 | 議員 | 條文分析、連動修正提醒 |
| 法規健檢 | 提案審查 | 檢查是否牴觸現行法規 |

開發階段使用 Mock LLM，可在管理員設定頁切換為 Ollama。

### 提案審議系統（需登入）

- **新增提案**：填寫修正條文（支援多條），提交後進入議事流程
- **修正前後對照表**：三欄格式，character-level diff 高亮
- **議事進度追蹤**：7 步進度條（提案→一讀→委員會→二讀→三讀→待公布→已公布）
- **狀態轉移**：根據角色顯示可執行操作，不合法操作系統直接拒絕
- **即時投票**：議員投票（贊成/反對/棄權）、議長結束投票、通過自動推進狀態

### 控制台（限議長/會長/秘書長）

- 待處理提案佇列（根據角色自動篩選）
- 一鍵執行狀態轉移或發起表決
- 全部提案概覽表格

### 認證與權限

| 角色 | 權限 |
|------|------|
| 一般學生 | 瀏覽法規、使用 AI 顧問 |
| 議員 | 提案、投票、委員會審查 |
| 秘書長 | 排入議程 |
| 議長 | 主持一讀至三讀、發起/結束表決 |
| 會長 | 公布施行 |

開發模式提供 7 個測試帳號，登入頁可切換。生產環境接 PocketBase SSO。

### 系統設定（限議長/會長）

集中管理 AI 模型、搜尋引擎、Gitea、PocketBase、議事流程等所有系統參數。

## 技術架構

```
┌─────────────┐     ┌──────────┐     ┌──────────┐
│  SvelteKit  │────▶│  Gitea   │     │  Ollama  │
│  (BFF)      │     │  (Git)   │     │  (LLM)   │
└──────┬──────┘     └──────────┘     └──────────┘
       │
       ▼
┌──────────────┐
│  PocketBase  │
│  (Auth/DB)   │
└──────────────┘
```

| 元件 | 技術 | 用途 |
|------|------|------|
| 前端/後端 | SvelteKit (Svelte 5) | BFF 模式，server routes 為唯一 API 閘道 |
| 法規版控 | Gitea | 法規存為 AKN XML，修法走 PR 流程 |
| 認證/資料庫 | PocketBase | 帳號管理、投票紀錄、審計日誌 |
| AI 模型 | Ollama (Gemma 3 12B) | 本地部署 LLM，不需外部 API |
| 法規格式 | Akoma Ntoso (AKN) | 國際法規 XML 標準 |
| 搜尋 | fuse.js / Embedding | 關鍵字搜尋，可升級為語意搜尋 |

## 設計原則

**核心精神：所有法規變更都追查得到權力的授予，無論什麼變更都會留下紀錄。**

| 原則 | 實作 |
|------|------|
| 唯一變更路徑 | 法規只能透過 PR merge 進入 main 分支 |
| 權力必須授予 | 每次操作 server 端驗證角色權限 |
| 變更必留紀錄 | Git + PR + PocketBase 三層審計 |
| 歷程不可竄改 | 禁止 force push，append-only 審計 |
| 系統即程序 | 狀態機強制執行議事程序 |

## 專案結構

```
LawAsCode/
├── laws/                    # 法規資料
│   ├── markdown/            # 22 部法規 Markdown 版
│   └── akn/                 # 22 部法規 AKN XML 版
├── web/                     # SvelteKit 應用程式
│   └── src/
│       ├── lib/
│       │   ├── server/      # 伺服器端模組
│       │   │   ├── advisor/ # AI 顧問（search + llm）
│       │   │   ├── auth/    # 認證與路由守衛
│       │   │   ├── akn/     # AKN XML 解析器
│       │   │   ├── proposals/ # 提案服務層
│       │   │   ├── repositories/ # 法規資料存取層
│       │   │   └── config.ts # 集中設定管理
│       │   └── types/       # TypeScript 型別定義
│       └── routes/          # 頁面路由
│           ├── admin/       # 系統設定頁
│           ├── advisor/     # AI 顧問
│           ├── api/         # API 端點
│           ├── dashboard/   # 控制台
│           ├── laws/        # 法規瀏覽
│           ├── login/       # 登入
│           ├── proposals/   # 提案審議
│           └── search/      # 全文搜尋
├── tools/                   # 轉換工具
│   ├── docx2md/             # Word → Markdown
│   ├── md2akn/              # Markdown → AKN XML
│   └── reviewer/            # 轉換品質審查
├── deploy/                  # 部署設定
│   └── docker-compose.yml   # Gitea 容器
├── PLAN.md                  # 完整計畫書
├── WORKLOG.md               # 開發日誌
└── LICENSE                  # MIT License
```

## 快速開始

### 環境需求

- Node.js 20+
- npm 或 pnpm

### 安裝與啟動

```bash
# 1. Clone 專案
git clone https://github.com/GabrielYMC/LawAsCode.git
cd LawAsCode

# 2. 安裝依賴
cd web
npm install

# 3. 啟動開發伺服器
npm run dev
```

開啟 http://localhost:5173，即可瀏覽法規與使用 AI 顧問。

開發模式下登入頁提供 7 個測試帳號，選擇角色即可體驗完整議事流程。

### 生產環境部署

生產環境需額外部署以下服務：

```bash
# 啟動 Gitea（法規版本控制）
cd deploy
docker compose up -d

# 啟動 Ollama（AI 模型，需 GPU）
ollama serve
ollama pull gemma3:12b
```

在管理員設定頁（/admin）設定各服務的連線位址與 Token。

## EVTL 轉換管線

將 Word 法規文件轉換為結構化資料的四步驟管線：

```
Word (.docx) → Markdown (.md) → AKN XML (.xml) → Gitea (Git)
   Extract        Transform         Load           Version
```

| 步驟 | 工具 | 說明 |
|------|------|------|
| Extract | `tools/docx2md/` | Python mammoth 解析 Word，產出 Markdown |
| Transform | `tools/md2akn/` | Python 正規表達式解析 MD 結構，產出 AKN XML |
| Verify | `tools/reviewer/` | 人工校對 + AI 輔助審查轉換品質 |
| Load | Gitea API | 匯入法規至 Git 倉庫，建立版本歷史 |

## 給其他學生會

本專案設計為可 fork 使用。你需要：

1. **Fork 本專案**，刪除 `laws/` 目錄下的淡江大學法規
2. **準備你的法規 Word 檔**，放入 `tools/docx2md/input/`
3. **執行 EVTL 管線**，將法規轉為 AKN XML
4. **修改設定**：在 `/admin` 設定頁調整 Gitea/PocketBase 位址
5. **部署**：Docker Compose 啟動 Gitea + PocketBase + Ollama

系統使用的術語（議長、會長、議員等）可依各校學生會組織調整 `user.ts` 中的角色定義。

## 授權

MIT License — 詳見 [LICENSE](LICENSE)
