# LawAsCode 工作日誌

---

## 2026-03-28

### 專案初始化與計畫撰寫

**時間**：2026-03-28 起始

- 初始化 Git 倉庫，連結至 GitHub `GabrielYMC/LawAsCode`（已設為 private）
- 詳讀《淡江大學學生會法規錄（民113）》全文（3000+ 段落、20 部法規 + 2 釋字）
- 與專案負責人進行兩輪需求訪談，確認：
  - 目標受眾：成果展評審 → 後續實作
  - 技術限制：單人開發、Linux 主機（16GB RAM + 3080Ti）、已有 PocketBase + Ollama
  - AKN 為硬需求、Markdown 為中介格式
  - 使用者不需懂 Git，系統以學生會用語呈現
- 撰寫完整計畫書 `PLAN.md`，涵蓋：
  - 問題分析（五大痛點）
  - 四大轉型方向（法規資料化、行政自動化、權力權限化、介面AI化）
  - 系統架構（Gitea + PocketBase + SvelteKit + Ollama）
  - 議事流程映射（PR + Label 狀態機 = 一讀→二讀→三讀→公布）
  - AKN 結構設計與轉換策略
  - AI 法規顧問三模式架構
  - 四階段實施計畫
- 製作 `demo-diff.html`：修正條文對照表的現代 Web diff 介面示範

**Commit**: `86f9509` — docs: add project plan and web diff demo

---

### 計畫書修訂（四項調整）

**時間**：2026-03-28

根據回饋修訂 `PLAN.md`：

1. **新增議長角色**：從法規錄提取 8 項議長職權（組織章程§20-22、職權行使辦法§5-6），建立完整權限矩陣，新增「議長控制台」頁面，狀態機標示各階段權責角色
2. **AI 顧問擴展為三模式**：一般諮詢（面向學生）、修法輔助（面向議員/法規委員會）、法規健檢（提案時自動觸發）；知識庫加入中華民國相關行政法規
3. **開源工具優先策略**：Indigo (Laws.Africa)、LIME (Univ. of Bologna)、OASIS Schema，自建僅限中文法規解析器與 MD→AKN 轉換器
4. **修正條文對照表**：傳統三欄 PDF + 現代 Web diff 雙格式，含 AI 健檢結果與內嵌討論串

---

### Phase 1 執行：基礎建設

**時間**：2026-03-28

#### 完成項目

| 任務 | 產出 | 狀態 |
|------|------|------|
| Gitea 部署設定 | `deploy/docker-compose.yml` + `deploy/README.md` | 完成（待部署至 Linux） |
| Word→Markdown 解析器 | `tools/docx2md/parser.py` | 完成 |
| Markdown→AKN 轉換器 | `tools/md2akn/converter.py` | 完成 |
| 法規解析 | `laws/markdown/` 22 個 .md 檔 | 完成（待人工校對） |
| AKN 轉換 | `laws/akn/` 22 個 .xml 檔 | 完成（待校對後重新產生） |

#### 解析結果統計

| 法規 | 章 | 條 |
|------|:--:|:--:|
| 組織章程 | 8 | 51 |
| 法規標準規則 | 6 | 27 |
| 公文字號條例 | 0 | 8 |
| 會長繼任及代理辦法 | 0 | 11 |
| 行政中心組織規則 | 0 | 14 |
| 選舉委員會組織規則 | 3 | 14 |
| 選舉罷免辦法 | 7 | 115 |
| 會費收退費辦法 | 0 | 21 |
| 預算辦法 | 6 | 54 |
| 決算辦法 | 4 | 35 |
| 學生議會組織規則 | 5 | 48 |
| 學生議會職權行使辦法 | 14 | 81 |
| 學生議會議員行為規範辦法 | 7 | 26 |
| 學生議會秘書處處務施行細則 | 0 | 13 |
| 學生議會辦公室管理細則 | 0 | 10 |
| 學生議會會議旁聽細則 | 0 | 9 |
| 學生議會議事準則 | 9 | 62 |
| 學生評議會組織規則 | 0 | 14 |
| 學生評議會審理案件辦法 | 6 | 51 |
| 臺灣學生聯合會章程施行法 | 0 | 9 |
| 學生評議會釋字第1號 | — | — |
| 學生評議會釋字第2號 | — | — |

#### 已知待校對問題

- 法規標準規則：第一條修訂歷程遺漏（原 Word 排版異常）
- 職權行使辦法 L23-27：「依...組織規則第二條訂定之」跨行切斷，誤判為兩個條文
- 部分條文有 Word 原始斷行殘留（如「無\n效文件」）
- 法規標準規則第十條：「款冠以一、二、三等數字」被誤判為列舉款項

**Commit**: `dea0ebe` — feat: add docx2md parser, md2akn converter, and initial law files

#### 待辦（需負責人動作）

- [ ] 使用校對工具校對 `laws/markdown/`（見下方）
- [ ] 在 Linux 伺服器執行 `cd deploy && docker compose up -d` 部署 Gitea

---

### 法規校對工具

**時間**：2026-03-28

開發 `tools/reviewer/` — 專為法規 Markdown 校對最佳化的 Web 工具。

#### 功能

- **自動掃描器** (`scanner.py`)：偵測 6 種常見轉換問題
  - Word 斷行殘留（句子在非句末符號處斷開）
  - 重複條號（同一條號出現兩次）
  - 孤立文字（疑似上一條的延續被誤判為獨立條文）
  - 誤判列舉（描述性文字被當作列舉項）
  - 條號跳號（條號序列有缺漏）
  - 可疑斷行（段落中間的多餘空行）
- **Web 校對介面** (`server.py` + `templates/index.html`)
  - 左側：法規列表，依錯誤數排序，顯示校對狀態
  - 中間：CodeMirror Markdown 編輯器，問題行高亮
  - 右側：問題列表，附修正建議，可一鍵跳轉
  - 快捷鍵：`Ctrl+S` 儲存、`Ctrl+↓/↑` 跳轉問題
  - 校對完成後自動跳到下一個待校對檔案

#### 掃描結果

首次掃描：22 個檔案，發現 **137 個問題**（69 錯誤 / 68 警告）

| 法規 | 錯誤 | 警告 | 合計 |
|------|:----:|:----:|:----:|
| 選舉罷免辦法 | 30 | 10 | 40 |
| 決算辦法 | 7 | 5 | 12 |
| 會費收退費辦法 | 6 | 4 | 10 |
| 預算辦法 | 5 | 4 | 9 |
| 學生議會職權行使辦法 | 4 | 4 | 8 |
| 其他 17 部法規 | 17 | 41 | 58 |

#### 啟動方式

```bash
cd tools/reviewer
python server.py
# 瀏覽器自動開啟 http://localhost:5588
```

---

### 數位化管線文件化

**時間**：2026-03-28

撰寫 `tools/README.md`，完整記錄法規數位化管線（EVTL）：

- **管線定義**：擷取（Extract）→ 驗證（Validate）→ 轉換（Transform）→ 入庫（Load）
- **四階段工具對應**：`parser.py` → `scanner.py` + `reviewer` → `converter.py` → Git push
- **Scanner 定位**：格式檢查（語法/結構層），確保 Markdown 可正確轉換為 AKN XML；與 Phase 3 的 AI 法規健檢（語意/邏輯層）明確區分
- **掃描觸發時機**：初始入庫（CLI）→ 編輯即時（API）→ PR 建立（Webhook）→ Merge 前（CI）
- **API 端點文件**、**eId 命名規範**、**目錄結構**、**依賴套件**皆完整記錄
- **日常修法管線**：描述 Phase 2 後 Scanner 如何從一次性工具轉變為持續品質閘門

---

### 導入指引文件

**時間**：2026-03-28

撰寫 `ONBOARDING.md`，作為其他組織導入 LawAsCode 的操作手冊：

- Phase 1 完整步驟（擷取→驗證→轉換→入庫），含指令與注意事項
- Phase 2-4 骨架（`<!-- TODO -->` 標記待補充段落）
- 角色權限表、系統需求表
- 常見問題（多檔案輸入、不同法規體例、無 GPU、GitHub vs Gitea）
- 預留一鍵管線腳本 `tools/pipeline.py` 的規劃

**文件狀態**：骨架完成，隨開發進度持續補充。

---

### 決策：跳過人工校對，進入 Phase 2

**時間**：2026-03-28

Phase 1 的人工校對步驟暫時跳過。理由：
- 現有 22 份 MD + AKN 作為開發樣本資料已足夠
- UI、API、Git 流程的開發不依賴法規內容 100% 正確
- 全部開發完成後再做一次完整 EVTL 管線（Word → 校對 → AKN → Gitea）

---

### Phase 2 Sprint 1：法規瀏覽器

**時間**：2026-03-28

#### 架構決策

- **BFF 模式**：SvelteKit server routes 作為中間層，前端只跟自己的 server 溝通
- **Repository 抽象**：`FilesystemLawRepository`（本地開發）/ `GiteaLawRepository`（生產），環境變數 `LAW_SOURCE` 切換
- **AKN 在 Server 端解析**：XML → JSON（`fast-xml-parser`），瀏覽器不碰 XML
- **搜尋引擎**：`fuse.js` 全文模糊搜尋（22 部法規夠輕量）
- **Mock Auth**：開發用角色切換器，不需 PocketBase

#### 完成項目

| 任務 | 產出 | 狀態 |
|------|------|------|
| SvelteKit 專案初始化 | `web/` | 完成 |
| 型別系統 | `law.ts`、`user.ts`、`workflow.ts` | 完成 |
| AKN XML 解析器 | `$lib/server/akn/parser.ts` | 完成（26 條正確解析驗證） |
| Repository 抽象層 | `filesystem.ts` + `types.ts` + `index.ts` | 完成 |
| 首頁儀表板 | `/` — 22 部法規、672 條條文統計 | 完成 |
| 法規列表 | `/laws` — 按類型分組（章程/規則/辦法/條例/其他） | 完成 |
| 法規詳情 | `/laws/[slug]` — 章節摺疊、條文展開、修訂歷程、eId anchor | 完成 |
| 全文搜尋 | `/search?q=` — fuse.js 索引所有條文 | 完成 |
| 提案頁佔位 | `/proposals` — Phase 2b 開發中提示 | 完成 |
| 議事狀態機定義 | `workflow.ts` — 9 個合法狀態轉移，含法規依據 | 完成 |

#### 技術棧

| 元件 | 技術 |
|------|------|
| 框架 | SvelteKit (Svelte 5 runes) |
| XML 解析 | fast-xml-parser |
| 搜尋 | fuse.js |
| 樣式 | CSS custom properties (GitHub Dark 風格) |
| 開發埠 | http://localhost:5173 |

#### Bug fixes

- **AKN URI 解析修正**：`extractMeta` 原本取 URI 最後一段（`main`），修正為取 `act` 之後的段落（法規名稱）
- **Vite HMR overlay 關閉**：專案路徑含 `[pr]` 方括號導致 `decodeURI` 失敗，關閉 overlay 避免干擾
- **章節預設展開**：修正 `$effect` 在 SSR 中不執行的問題，改為初始化時直接展開所有章節
