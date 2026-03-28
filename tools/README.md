# 法規數位化管線（Digitization Pipeline）

本目錄包含法規數位化的完整工具鏈，將學生會法規從靜態 Word 文件轉化為結構化、版本控制的數位資產。

---

## 管線總覽

```
Word .docx
    │
    ▼  階段一：擷取（Extract）
Markdown .md  ←── 中介格式，人類可讀可編輯
    │
    ▼  階段二：驗證（Validate）
Issue 報告 → 人工校對 → 校對完成的 .md
    │
    ▼  階段三：轉換（Transform）
AKN XML .xml  ←── 最終格式，機器可讀，國際標準
    │
    ▼  階段四：入庫（Load）
Git push → Gitea main 分支（SSOT 建立）
```

這是經典 ETL（Extract → Transform → Load）架構，中間插入 Validation 形成 **EVTL** 管線。

---

## 階段一：擷取（Extract）

**工具**：`docx2md/parser.py`

**用途**：從整份法規錄 Word 檔案中，擷取並拆分為獨立的 Markdown 法規檔。

### 輸入

整份法規錄 `.docx`（一個大檔案包含 20+ 部法規）的純文字內容。

### 處理邏輯

| 步驟 | 說明 |
|------|------|
| 法規邊界偵測 | 靠標題比對（內建 22 部法規的完整標題清單）識別每部法規的起訖 |
| 結構解析 | 解析章（`##`）/ 條（`###`）/ 項 / 款 / 目的層級結構 |
| 中文數字轉換 | 「第二十三條」→ `### 第二十三條`（條號保留中文，供人類閱讀） |
| 修訂歷程提取 | 偵測日期格式與修訂描述，轉為 YAML 陣列 |
| Frontmatter 產生 | 每個 .md 檔頂部加入 `title`、`short_name`、`history` 等元資料 |

### 輸出

`laws/markdown/` 目錄下 22 個獨立的 `.md` 檔，格式範例：

```markdown
---
title: "淡江大學學生會法規標準規則"
short_name: "法規標準規則"
history:
  - date: "2024-06-17"
    description: "113.06.17第43屆學生議會大會修正通過"
---

# 淡江大學學生會法規標準規則

## 第一章 總則

### 第一條（立法依據）

本規則依淡江大學學生會組織章程訂定之。
```

### 已知限制

- Word 的軟換行（soft line break）會被保留為段落斷裂
- 分頁符號處的文字可能被切斷
- 條文中描述格式的文字（如「款冠以一、二、三等數字」）可能被誤判為列舉

這些問題由階段二的驗證流程處理。

### 執行頻率

**一次性**。初始入庫完成後，未來修法直接在系統內編輯 Markdown，不再經過 Word。

---

## 階段二：驗證（Validate）

**工具**：`reviewer/scanner.py` + `reviewer/server.py`

**用途**：自動掃描 Markdown 的結構問題，並提供 Web 介面供人工校對修正。

### 設計哲學

> Scanner 是**格式檢查**，不是語意檢查。它回答的核心問題是：
> **「這份 Markdown 的結構是否能被 `converter.py` 正確解析成 AKN XML？」**

| | Scanner（階段二） | AI 法規健檢（Phase 3） |
|---|---|---|
| 層級 | **語法 / 結構** | **語意 / 邏輯** |
| 問題範例 | 「第一條被斷成兩段」 | 「這條牴觸組織章程§12」 |
| 判斷依據 | 正則表達式、規則引擎 | LLM + 法規知識庫 |
| 能否全自動 | 100% 自動偵測 | 需要 AI 推理 |
| 阻擋層級 | 擋住 AKN 轉換 | 擋住 merge |

### 掃描規則

Scanner 內建 6 種規則引擎，逐行掃描每個 `.md` 檔：

| 規則 ID | 名稱 | 嚴重度 | 偵測邏輯 |
|---------|------|:------:|---------|
| `broken_line` | Word 斷行殘留 | Warning | 行尾非句末符號（。；！？」）且下一段為非標題文字 |
| `dup_article` | 重複條號 | Error | 同一 `### 第X條` 出現 > 1 次 |
| `orphan_text` | 孤立文字 | Error | 條文內容 < 15 字且不以句號結尾，疑似上一條的延續 |
| `mis_list` | 誤判列舉 | Error | 空的列舉項（如獨立的 `1. `），描述性文字被當作列舉 |
| `missing_art` | 條號跳號 | Warning | 條號序列不連續（跳號可能正常，也可能是漏條） |
| `suspicious_break` | 可疑斷行 | Warning | 段落中間出現不合理空行 |

### 未來可擴充的規則

| 規則 | 適用階段 | 說明 |
|------|---------|------|
| 引用條文存在性 | Phase 2 | 「依第X條」→ 第X條真的存在嗎？ |
| 用語一致性 | Phase 2 | 同一份法規中「學生會」vs「本會」是否統一 |
| AKN schema 預驗證 | Phase 2 | 轉換前先確認結構可產生合法 XML |
| 母子法位階檢查 | Phase 3 | 命令是否牴觸授權母法 |

### 觸發時機

Scanner 在不同階段以不同方式觸發，同一套規則引擎服務整個生命週期：

| 時機 | 觸發方式 | 目的 | 實作方式 |
|------|---------|------|---------|
| **初始入庫** | 手動執行 `python scanner.py` | 清理 Word 轉換錯誤 | CLI 輸出報告 |
| **編輯即時** | Web UI 每次儲存時呼叫 | 即時回饋結構錯誤 | API `PUT /api/file/` 自動觸發 |
| **PR 建立/更新** | Gitea Webhook | 完整品質報告 | Gitea Actions → scanner |
| **Merge 前** | CI 必須通過 | 最終品質閘門 | 錯誤 > 0 則阻擋 merge |

### Web 校對介面

啟動方式：

```bash
cd tools/reviewer
python server.py
# 瀏覽器自動開啟 http://localhost:5588
```

#### 介面結構

```
┌──────────────────────────────────────────────────────────┐
│  📜 法規校對工具           檔案 22  待校對 22  問題 137  │
├────────────┬──────────────────────┬───────────────────────┤
│ 法規列表    │  CodeMirror 編輯器   │  問題列表             │
│            │                      │                       │
│ ❌ 選舉罷免 │  1  ---              │  ⚠ L43  斷行          │
│ ❌ 決算辦法 │  2  title: "..."     │  「行政部」之後斷行    │
│ ❌ 會費收退 │  3  ---              │  💡 合併為：...       │
│ ⚠ 公文字號 │  4                   │  [標記已處理] [跳到]   │
│ 📄 辦公室  │  5  # 法規標準規則   │                       │
│            │  ...                 │  ❌ L60  誤判列舉      │
│            │  問題行 高亮顯示     │  ...                   │
├────────────┴──────────────────────┴───────────────────────┤
│  Ctrl+S 儲存   Ctrl+↓ 下一問題   Ctrl+↑ 上一問題         │
└──────────────────────────────────────────────────────────┘
```

#### 操作流程

1. 左側點選法規（依錯誤數排序，最嚴重的在最上面）
2. 中間編輯器自動載入，問題行以紅/黃底色高亮
3. 右側問題列表顯示具體描述與修正建議
4. 編輯修正 → `Ctrl+S` 儲存 → 自動重新掃描
5. 逐一「標記已處理」或直接「校對完成」
6. 校對完成後自動跳到下一個待校對檔案

#### 校對狀態追蹤

校對進度儲存於 `tools/reviewer/review_status.json`：

```json
{
  "法規標準規則.md": {
    "reviewed": true,
    "reviewed_at": "2026-03-28T15:30:00",
    "resolved_issues": ["43:broken_line", "60:mis_list", "72:broken_line"]
  }
}
```

#### API 端點

| 方法 | 路徑 | 說明 |
|------|------|------|
| `GET` | `/api/scan` | 掃描所有檔案，回傳問題列表與校對狀態 |
| `GET` | `/api/file/<filename>` | 讀取單一檔案內容 |
| `PUT` | `/api/file/<filename>` | 儲存檔案並重新掃描 |
| `POST` | `/api/resolve` | 標記單一問題為已解決 |
| `POST` | `/api/review/<filename>` | 標記檔案為校對完成 |
| `DELETE` | `/api/review/<filename>` | 取消校對完成標記 |

---

## 階段三：轉換（Transform）

**工具**：`md2akn/converter.py`

**用途**：將校對完成的 Markdown 轉換為符合 Akoma Ntoso 3.0 國際標準的 XML。

### 輸入

校對完成、結構正確的 `.md` 檔。

### 處理邏輯

| 步驟 | 說明 |
|------|------|
| Frontmatter 解析 | YAML → FRBRWork / FRBRExpression / FRBRManifestation 生命週期元資料 |
| 章節解析 | `##` → `<chapter>`，`###` → `<article>` |
| 段落結構 | 段落 → `<paragraph>`，列舉 → `<list><item>` |
| eId 產生 | 為每個元素賦予唯一身分證，如 `art_9__para_2__list_1__item_3` |
| 修訂歷程 | `history` → `<lifecycle><eventRef>` |
| XML 驗證 | 確保輸出符合 AKN 3.0 namespace |

### 輸出

`laws/akn/` 目錄下對應的 `.xml` 檔，格式範例：

```xml
<akomaNtoso xmlns="http://docs.oasis-open.org/legaldocml/ns/akn/3.0">
  <act name="法規標準規則">
    <meta>
      <identification source="#lawascode">
        <FRBRWork>
          <FRBRthis value="/akn/tw-tku-sa/act/法規標準規則/main"/>
          ...
        </FRBRWork>
      </identification>
      <lifecycle source="#lawascode">
        <eventRef eId="evt_1" date="2024-06-17" type="amendment"
                  source="#src_1"/>
      </lifecycle>
    </meta>
    <body>
      <chapter eId="chp_1">
        <num>第一章</num>
        <heading>總則</heading>
        <article eId="art_1">
          <num>第一條</num>
          <heading>立法依據</heading>
          <paragraph eId="art_1__para_1">
            <content>
              <p>本規則依淡江大學學生會組織章程訂定之。</p>
            </content>
          </paragraph>
        </article>
      </chapter>
    </body>
  </act>
</akomaNtoso>
```

### eId 命名規範

eId 遵循 Akoma Ntoso 的階層命名慣例，雙底線分隔層級：

| 元素 | eId 格式 | 範例 |
|------|---------|------|
| 章 | `chp_{n}` | `chp_1` |
| 條 | `art_{n}` | `art_9` |
| 項 | `art_{n}__para_{m}` | `art_9__para_2` |
| 款（列舉） | `...para_{m}__list_1__item_{k}` | `art_9__para_2__list_1__item_3` |

### 批次執行

```bash
cd tools/md2akn
python converter.py              # 轉換所有 laws/markdown/*.md
python converter.py --file 法規標準規則.md  # 轉換單一檔案
```

---

## 階段四：入庫（Load）

**工具**：Git + Gitea

**用途**：將校對完成的 Markdown 與轉換完成的 AKN XML 推送至 Gitea，建立 SSOT。

### 入庫步驟

```bash
# 1. 部署 Gitea（一次性）
cd deploy && docker compose up -d

# 2. 在 Gitea 建立組織與 repo（一次性）
#    組織：lawascode
#    倉庫：laws

# 3. 推送法規
cd laws
git init
git remote add origin http://<server>:3000/lawascode/laws.git
git add markdown/ akn/
git commit -m "feat: initial law corpus (22 laws, AKN XML)"
git push -u origin main

# 4. 設定 branch protection（一次性）
#    main 分支：需 PR review、僅會長帳號可 merge
```

### 入庫後的目錄結構

```
laws/
├── markdown/          # 中介格式（人類編輯用）
│   ├── 組織章程.md
│   ├── 法規標準規則.md
│   └── ...（22 個檔案）
└── akn/               # 最終格式（機器處理用）
    ├── 組織章程.xml
    ├── 法規標準規則.xml
    └── ...（22 個檔案）
```

入庫完成後，此 repo 即為**唯一真實來源（SSOT）**，所有後續修法都在此 repo 上以 PR 流程進行。

---

## 目錄結構

```
tools/
├── README.md              ← 本文件
├── docx2md/
│   └── parser.py          ← 階段一：擷取
├── reviewer/
│   ├── scanner.py         ← 階段二：自動掃描引擎
│   ├── server.py          ← 階段二：Web 校對伺服器
│   ├── review_status.json ← 校對進度追蹤（自動產生）
│   └── templates/
│       └── index.html     ← 校對介面前端
└── md2akn/
    └── converter.py       ← 階段三：轉換
```

---

## 日常修法管線（Phase 2 以後）

初始入庫完成後，管線轉變為日常修法流程：

```
議員在 Web UI 提案修法
    │
    ▼  自動建立 Git branch + PR
編輯 Markdown（Web 編輯器）
    │
    ├──▶ Scanner 即時觸發（每次儲存）
    │      → 結構問題即時回饋給編輯者
    │
    ├──▶ AI 法規健檢（PR 建立/更新時）
    │      → 母子法衝突、用語一致性、外部法規牴觸
    │
    ▼  一讀 → 委員會 → 二讀 → 三讀
PR 通過表決
    │
    ├──▶ CI 最終驗證（merge 前自動執行）
    │      → scanner 零錯誤 + AKN schema 驗證 + diff 產生
    │
    ▼  會長按「公布施行」
Merge to main
    │
    ├──▶ 自動產生 AKN XML（post-merge hook）
    ├──▶ 自動產生公布施行命令 PDF
    ├──▶ 自動產生修正前後對照表
    └──▶ RAG 知識庫更新（重新 embedding）
```

---

## 依賴套件

| 套件 | 用途 | 安裝 |
|------|------|------|
| `flask` | Reviewer Web 伺服器 | `pip install flask` |
| `lxml` | AKN XML 產生 | `pip install lxml` |
| `pyyaml` | YAML frontmatter 解析 | `pip install pyyaml` |
| `python-docx` | Word 文件讀取（階段一） | `pip install python-docx` |
