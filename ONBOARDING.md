# LawAsCode 導入指引

本文件引導一個學生自治組織從零開始導入 LawAsCode 系統。

> **文件狀態**：開發中，隨功能完成持續更新。

---

## 導入前準備

### 你需要準備的東西

| 項目 | 說明 |
|------|------|
| 法規原始檔 | 所有現行法規的 Word (.docx) 或 PDF 檔案 |
| 一台 Linux 主機 | 建議 8GB+ RAM，可運行 Docker |
| 域名（選配） | 如 `law.your-org.tw`，沒有也可以用 IP |
| 組織成員名單 | 含角色（會長、議長、議員、秘書處等） |

### 系統需求

| 元件 | 最低需求 | 建議 |
|------|---------|------|
| OS | Ubuntu 20.04+ | Ubuntu 22.04 LTS |
| RAM | 8 GB | 16 GB（含 AI 功能） |
| GPU | 無 | NVIDIA GPU 6GB+（AI 法規顧問） |
| Docker | Docker Engine 24+ | Docker + Docker Compose v2 |
| Python | 3.10+ | 3.12+ |

---

## Phase 1：法規數位化

### 步驟 1.1：擷取（Extract）

將所有法規從 Word 檔轉換為結構化 Markdown。

```bash
# 安裝依賴
pip install python-docx pyyaml

# 準備原始檔案
# 將法規錄 .docx 放入專案根目錄

# 執行解析器
cd tools/docx2md
python parser.py /path/to/法規錄.docx
# 產出 → laws/markdown/*.md
```

**注意**：`parser.py` 目前針對淡江大學學生會法規錄的格式撰寫。其他組織需要：
- 修改 `KNOWN_LAWS` 清單（你的法規標題列表）
- 可能需要調整章/條的正則表達式
- 如果法規分散在多個 Word 檔，需調整邊界偵測邏輯

<!-- TODO: 提供通用化的 parser 設定檔機制 -->

### 步驟 1.2：驗證（Validate）

自動掃描轉換問題，人工校對修正。

```bash
# 安裝依賴
pip install flask

# 先跑一次掃描，了解問題規模
cd tools/reviewer
python scanner.py

# 啟動校對介面
python server.py
# 瀏覽器開啟 http://localhost:5588
```

校對要點：
- **Error（紅色）優先**：重複條號、孤立文字是結構性問題，必須修正
- **Warning（黃色）次之**：Word 斷行通常需要修正，條號跳號則需確認是否為刪除條文保留條次
- 每個問題附有修正建議，參考但不盲從（建議是機械式字串拼接，不保證語意正確）
- 校對完成的檔案會記錄狀態，可中斷後繼續

### 步驟 1.3：轉換（Transform）

將校對完成的 Markdown 轉換為 Akoma Ntoso XML。

```bash
# 安裝依賴
pip install lxml pyyaml

# 執行轉換
cd tools/md2akn
python converter.py
# 產出 → laws/akn/*.xml
```

### 步驟 1.4：入庫（Load）

部署 Gitea 並推送法規。

```bash
# 在 Linux 主機上：
cd deploy
docker compose up -d

# 瀏覽器開啟 http://<your-server>:3000
# 1. 建立管理員帳號
# 2. 建立組織（如 "student-union"）
# 3. 建立倉庫 "laws"

# 推送法規
cd laws
git init
git remote add origin http://<your-server>:3000/student-union/laws.git
git add markdown/ akn/
git commit -m "feat: initial law corpus"
git push -u origin main
```

設定 branch protection：
- `main` 分支需要 PR review 才能合併
- 僅會長帳號有 merge 權限

<!-- TODO: 提供 Gitea 設定自動化腳本 -->

---

## Phase 2：議事流程數位化

<!-- TODO: Phase 2 完成後補充 -->

### 步驟 2.1：建立使用者帳號與角色

在系統中建立所有成員帳號，指定角色：

| 角色 | 人數 | 系統權限 |
|------|------|---------|
| 會長 | 1 | merge to main（公布施行） |
| 議長 | 1 | 管理 PR label（排案、推進讀會） |
| 議員 | ~10 | 建立 PR（提案）、Review（審查）、投票 |
| 秘書長 | 1 | 排案、label 管理、會議紀錄 |
| 秘書處 | ~5 | 文件管理、通知發送 |
| 一般學生 | 不限 | 唯讀瀏覽、AI 諮詢 |

### 步驟 2.2：部署 Web 應用

```bash
# TODO: 補充 SvelteKit 應用部署步驟
```

### 步驟 2.3：設定議事流程

系統內建的 Label 狀態機：

```
提案 → 一讀 → 委員會審查 → 二讀 → 三讀 → 待公布 → 已公布
```

每個階段的推進權限與動作需與組織的議事規則對齊。

<!-- TODO: 提供狀態機設定介面或設定檔 -->

---

## Phase 3：AI 法規顧問

<!-- TODO: Phase 3 完成後補充 -->

### 步驟 3.1：部署 AI 服務

```bash
# 確認 Ollama 已安裝並運行
ollama pull gemma3:12b

# TODO: 補充 RAG 系統部署步驟
```

### 步驟 3.2：匯入外部法規

將中華民國相關行政法規匯入知識庫，作為合規檢查的參照：

- 大學法
- 行政程序法
- 其他適用法規

<!-- TODO: 提供外部法規匯入工具 -->

---

## Phase 4：開源與公開

<!-- TODO: Phase 4 完成後補充 -->

### 其他組織如何 Fork 使用

```bash
# 1. Fork 本專案
# 2. 修改 parser.py 中的法規標題清單
# 3. 放入你的法規 Word 檔
# 4. 跑一次完整 EVTL 管線
# 5. 部署到你的主機
```

---

## 完整 EVTL 管線一鍵執行

以下指令可從頭執行整條管線：

```bash
# TODO: 完成後提供一鍵腳本
# python tools/pipeline.py --input 法規錄.docx --deploy
```

預期流程：
1. Word → Markdown（自動）
2. 掃描問題報告（自動，輸出到 terminal）
3. 如有 Error → 開啟校對工具，等待人工處理
4. 校對完成 → Markdown → AKN XML（自動）
5. 推送至 Gitea（自動）

---

## 常見問題

### Q：我的法規不在一個大 Word 檔裡，而是每部法規一個檔案

A：目前 parser.py 假設所有法規在同一個文件中。多檔案支援待開發。

<!-- TODO: 支援多檔案輸入 -->

### Q：我的組織不用「章/條/項/款/目」的結構

A：目前 parser.py 針對中華民國法規體例設計。如果你的組織用不同結構（如「條/點/目」），需要修改正則表達式。

### Q：沒有 GPU 可以用 AI 功能嗎？

A：可以，但速度較慢。Ollama 支援 CPU 推理，建議使用較小的模型（如 Gemma 2B）。有 GPU 則建議 12B 以上的模型。

### Q：可以用 GitHub 取代 Gitea 嗎？

A：技術上可以，API 大致相容。但自架 Gitea 的優勢是：完全控制資料、不受 GitHub 政策變更影響、可自訂 webhook 邏輯。
