# LawAsCode 部署紀錄

這份文件記錄了把 LawAsCode 從開發環境部署到 Linux 生產主機的完整過程，包括遇到的問題和解決方式。

---

## 主機環境

| 項目 | 規格 |
|------|------|
| 主機 | x570saorusmaster（桌機當伺服器） |
| OS | Ubuntu Linux |
| CPU/RAM | AMD + 16GB |
| GPU | NVIDIA RTX 3080 Ti (12GB VRAM) |
| Node.js | v20.20.0 |
| 網路 | Tailscale VPN (`100.89.244.57`) + Cloudflare Tunnel |

## 服務架構

```
使用者（瀏覽器）
    │
    ├── https://law.ouroboros.dpdns.org  ← Cloudflare Tunnel（外網）
    │       │
    │       ▼
    │   SvelteKit (node build)  ← 綁 100.89.244.57:5173（Tailscale IP）
    │       │
    │       ├── Ollama API (100.89.244.57:11434) ← AI 模型
    │       │       └── gemma3:12b（Gemma 3 12B 參數）
    │       │
    │       └── PocketBase (100.89.244.57:8090) ← 使用者帳號/認證
    │               └── https://pb.ouroboros.dpdns.org ← PB Admin UI
    │
    └── Tailscale 內網直連 (100.89.244.57:5173)（開發用）
```

### 為什麼綁 Tailscale IP？

SvelteKit 只監聽 `100.89.244.57`（Tailscale 虛擬 IP），不監聽 `0.0.0.0` 或 `192.168.0.199`（實體 LAN IP）。這表示：

- 外網只能透過 Cloudflare Tunnel 連入（有 HTTPS + DDoS 防護）
- Tailscale 裝置可以直連（開發/管理用）
- 同一個 LAN 的其他電腦掃 port 也連不到（因為沒綁那個 IP）

---

## 部署步驟

### Step 1：Clone 程式碼

```bash
cd ~
git clone https://github.com/GabrielYMC/LawAsCode.git
cd LawAsCode/LawAsCode/web
npm install
```

> **注意**：clone 下來的目錄結構是 `~/LawAsCode/LawAsCode/`（多包了一層），所有操作都在內層的 `LawAsCode` 裡面。

### Step 2：確認 Ollama 和 PocketBase 狀態

Ollama 和 PocketBase 都綁在 Tailscale IP，不是 localhost。

```bash
# Ollama（AI 模型）
systemctl status ollama
# 應該顯示 active (running)

# PocketBase（帳號系統）
ss -tlnp | grep 8090
# 應該看到 100.89.244.57:8090
```

Ollama 綁定地址在 `/etc/systemd/system/ollama.service.d/environment.conf`：
```
[Service]
Environment="OLLAMA_HOST=100.89.244.57:11434"
```

所以程式碼裡不能用 `localhost:11434`，要用 `100.89.244.57:11434`。

### Step 3：初始化 PocketBase

PocketBase 是帳號系統。我們需要建立三個「Collection」（可以想成資料庫的表格）：

1. **users**：使用者帳號（PB 內建，我們加了 `role` 欄位）
2. **lac_sessions**：登入後的 session 紀錄（誰在什麼時候登入的）
3. **lac_audit_log**：操作日誌（誰做了什麼事）

> 加 `lac_` 前綴是因為這台 PB 可能有其他專案在用，避免名字衝突。

#### 3-1. 取得 Admin Token

PocketBase 的管理員帳號叫「Superuser」。先用 API 登入取得 token（就像拿到一把鑰匙）：

```bash
PB=http://100.89.244.57:8090

curl -s -X POST "$PB/api/collections/_superusers/auth-with-password" \
  -H "Content-Type: application/json" \
  -d '{"identity": "你的admin信箱", "password": "你的admin密碼"}'
```

回傳的 JSON 裡會有一個 `token` 欄位，把它存起來：

```bash
TOKEN="eyJhbGci..."  # 貼上面回傳的 token
```

#### 3-2. 建立 lac_sessions collection

```bash
curl -s -X POST "$PB/api/collections" \
  -H "Content-Type: application/json" \
  -H "Authorization: $TOKEN" \
  -d '{
    "name": "lac_sessions",
    "type": "base",
    "fields": [
      {"name": "userId", "type": "text", "required": true},
      {"name": "token", "type": "text", "required": true},
      {"name": "expiresAt", "type": "date", "required": true}
    ]
  }'
```

#### 3-3. 建立 lac_audit_log collection

```bash
curl -s -X POST "$PB/api/collections" \
  -H "Content-Type: application/json" \
  -H "Authorization: $TOKEN" \
  -d '{
    "name": "lac_audit_log",
    "type": "base",
    "fields": [
      {"name": "userId", "type": "text", "required": true},
      {"name": "action", "type": "text", "required": true},
      {"name": "target", "type": "text", "required": false},
      {"name": "detail", "type": "json", "required": false}
    ]
  }'
```

#### 3-4. 設定 users 的 role 欄位

PB 內建的 `users` collection 有一個 `role` 欄位，但預設只有 `admin` 和 `user` 兩個選項。我們需要改成我們的六個角色。

在 PB Admin UI（`https://pb.ouroboros.dpdns.org/_/`）操作：

1. 左側選 **users** → 點齒輪 → 展開 `role` 欄位
2. 清除原本的 `admin`、`user`
3. 加入：`president`、`speaker`、`legislator`、`secretary_general`、`secretariat`、`student`
4. Max select 改成 `1`
5. Save

#### 3-5. 設定 API Rules

PB v0.23+ 預設把所有 API 鎖死（只有 Superuser 能用）。我們的程式需要能讀寫這些 collection，所以要解鎖。

在 PB Admin UI 裡，每個 collection 進去 → API Rules tab，把規則改成空字串（空白 = 允許所有人）：

| Collection | List/Search | View | Create | Update | Delete |
|---|---|---|---|---|---|
| **users** | 空白 | 空白 | 鎖住 | `id = @request.auth.id` | 鎖住 |
| **lac_sessions** | 空白 | 空白 | 空白 | 鎖住 | 空白 |
| **lac_audit_log** | 鎖住 | 鎖住 | 空白 | 鎖住 | 鎖住 |

> 這樣安全嗎？可以，因為 PB 本身只綁在 Tailscale IP，外部無法直接連到。

#### 3-6. 建立初始帳號

```bash
PW='LacDemo2026x'

curl -s -X POST "$PB/api/collections/users/records" \
  -H "Content-Type: application/json" \
  -H "Authorization: $TOKEN" \
  -d '{"email":"speaker@lac.tw","password":"'"$PW"'","passwordConfirm":"'"$PW"'","name":"王議長","role":"speaker","emailVisibility":true}'

# 類似指令重複建立 president, legislator, secretary_general, secretariat, student
```

建立的帳號：

| Email | 角色 | 密碼 |
|-------|------|------|
| speaker@lac.tw | 議長 | LacDemo2026x |
| president@lac.tw | 會長 | LacDemo2026x |
| legislator@lac.tw | 議員 | LacDemo2026x |
| secretary@lac.tw | 秘書長 | LacDemo2026x |
| staff@lac.tw | 幹事 | LacDemo2026x |
| student@lac.tw | 學生 | LacDemo2026x |

### Step 4：Build 並啟動

開發用 `npm run dev`，正式上線用 `npm run build` + `node build`：

```bash
cd ~/LawAsCode/LawAsCode/web
npm run build  # 編譯成正式版（速度更快、體積更小）
```

### Step 5：設定 systemd 服務

把 LawAsCode 註冊為系統服務，這樣它會：
- 開機自動啟動
- 崩潰時自動重啟
- 可以用 `systemctl` 指令管理

```bash
sudo tee /etc/systemd/system/lawascoode.service << 'EOF'
[Unit]
Description=LawAsCode Web Service
After=network-online.target ollama.service
Wants=network-online.target

[Service]
Type=simple
User=chenyenming
WorkingDirectory=/home/chenyenming/LawAsCode/LawAsCode/web
Environment=HOST=100.89.244.57
Environment=PORT=5173
Environment=LAC_LLM_PROVIDER=ollama
Environment=LAC_LLM_BASE_URL=http://100.89.244.57:11434
Environment=LAC_LLM_MODEL=gemma3:12b
Environment=LAC_PB_ENABLED=true
Environment=LAC_PB_BASE_URL=http://100.89.244.57:8090
ExecStart=/usr/bin/node build
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable lawascoode   # 開機自動啟動
sudo systemctl start lawascoode    # 現在啟動
```

### Step 6：設定 Cloudflare Tunnel

在 Cloudflare Zero Trust Dashboard 加一條路由：

```
law.ouroboros.dpdns.org → http://100.89.244.57:5173
```

這樣外部使用者就能透過 `https://law.ouroboros.dpdns.org` 存取系統。

---

## 日常操作指令

```bash
# 啟動服務
sudo systemctl start lawascoode

# 停止服務
sudo systemctl stop lawascoode

# 重啟服務（改了設定或更新程式碼後用）
sudo systemctl restart lawascoode

# 看服務狀態
systemctl status lawascoode

# 看即時 log（Ctrl+C 離開）
journalctl -u lawascoode -f

# 看最近 50 行 log
journalctl -u lawascoode -n 50
```

## 更新程式碼

```bash
cd ~/LawAsCode/LawAsCode
git pull
cd web
npm install        # 如果有新套件的話
npm run build      # 重新編譯
sudo systemctl restart lawascoode  # 重啟服務載入新版
```

---

## 部署過程中遇到的問題

### 1. Ollama / PocketBase 的 localhost 連不上

**問題**：`curl http://localhost:11434` 沒反應。
**原因**：Ollama 和 PB 都綁在 Tailscale IP（`100.89.244.57`），不是 `localhost`（`127.0.0.1`）。
**解法**：所有連線都改用 `http://100.89.244.57:11434` 和 `http://100.89.244.57:8090`。

### 2. PocketBase Admin API 路徑不同

**問題**：初始化腳本的 `/api/admins/auth-with-password` 卡住。
**原因**：我們的 PB 是 v0.23+，Admin 端點改成了 `/api/collections/_superusers/auth-with-password`。
**解法**：改用新版端點。

### 3. role 欄位的選項是空的

**問題**：建立使用者帳號時 `"Invalid value speaker"`。
**原因**：`users` collection 的 `role` 欄位是其他專案建的，只有 `admin` 和 `user` 兩個選項。
**解法**：在 PB Admin UI 手動修改 role 欄位，加入六個角色值。

### 4. PB API Rules 全鎖

**問題**：登入成功但頁面顯示未登入，點功能會被踢回登入頁。
**原因**：PB v0.23+ 預設 API Rules 是 null（全部拒絕），程式從 server 端查 session 時被 PB 擋掉。
**解法**：在 PB Admin UI 把 `users`、`lac_sessions`、`lac_audit_log` 的 API Rules 設成空字串（允許存取）。

### 5. crypto.randomUUID 不能用

**問題**：點 AI 顧問的範例問題沒反應，Console 報 `crypto.randomUUID is not a function`。
**原因**：`crypto.randomUUID()` 只在 HTTPS（安全環境）下可用，我們用 HTTP 連線所以沒有這個 API。
**解法**：加上 fallback `crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)`。

### 6. Svelte 5 的 context="module" 棄用

**問題**：AI 顧問頁面的 `formatMarkdown` 函數可能無法正確執行。
**原因**：Svelte 5 棄用了 `<script context="module">`，改用 `<script module>`。
**解法**：把 `formatMarkdown` 移到主要的 `<script>` 區塊內。

### 7. bash 的驚嘆號問題

**問題**：建立帳號的密碼 `LacDemo2026!` 被 bash 的 history expansion 吃掉。
**原因**：bash 中 `!` 有特殊意義（呼叫歷史指令）。
**解法**：密碼改成不含 `!` 的 `LacDemo2026x`，或用單引號包住。
