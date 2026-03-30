#!/bin/bash
#
# PocketBase 初始化腳本
# 建立 LawAsCode 所需的 collections 和初始管理員帳號
#
# 使用方式：
#   1. 確保 PocketBase 已啟動（預設 http://localhost:8090）
#   2. 在 PocketBase Admin UI 建立第一個 admin 帳號
#   3. 執行此腳本：
#      PB_URL=http://localhost:8090 PB_ADMIN_EMAIL=admin@example.com PB_ADMIN_PASSWORD=yourpassword bash deploy/pocketbase-setup.sh
#
# 環境變數：
#   PB_URL          - PocketBase 位址（預設 http://localhost:8090）
#   PB_ADMIN_EMAIL  - Admin 帳號 email
#   PB_ADMIN_PASSWORD - Admin 帳號密碼

set -euo pipefail

PB_URL="${PB_URL:-http://localhost:8090}"

if [ -z "${PB_ADMIN_EMAIL:-}" ] || [ -z "${PB_ADMIN_PASSWORD:-}" ]; then
    echo "錯誤：請設定 PB_ADMIN_EMAIL 和 PB_ADMIN_PASSWORD 環境變數"
    echo ""
    echo "範例："
    echo "  PB_ADMIN_EMAIL=admin@lac.tw PB_ADMIN_PASSWORD=secret123 bash $0"
    exit 1
fi

echo "=== LawAsCode PocketBase 初始化 ==="
echo "PocketBase URL: $PB_URL"
echo ""

# ── 取得 Admin Token ──

echo "[1/5] 取得 Admin Token..."
AUTH_RESPONSE=$(curl -s -X POST "$PB_URL/api/admins/auth-with-password" \
    -H "Content-Type: application/json" \
    -d "{\"identity\": \"$PB_ADMIN_EMAIL\", \"password\": \"$PB_ADMIN_PASSWORD\"}")

ADMIN_TOKEN=$(echo "$AUTH_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])" 2>/dev/null)

if [ -z "$ADMIN_TOKEN" ]; then
    echo "❌ 無法取得 Admin Token，請確認帳號密碼正確"
    echo "回應：$AUTH_RESPONSE"
    exit 1
fi
echo "✅ Admin Token 取得成功"

# ── Helper：建立 Collection ──

create_collection() {
    local name="$1"
    local schema="$2"

    echo "  建立 collection: $name"
    local response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$PB_URL/api/collections" \
        -H "Content-Type: application/json" \
        -H "Authorization: $ADMIN_TOKEN" \
        -d "$schema")

    if [ "$response" = "200" ]; then
        echo "  ✅ $name 建立成功"
    elif [ "$response" = "400" ]; then
        echo "  ⚠️  $name 可能已存在，跳過"
    else
        echo "  ❌ $name 建立失敗 (HTTP $response)"
    fi
}

# ── 建立 Users Collection (Auth 類型) ──

echo ""
echo "[2/5] 建立 users collection (auth)..."
create_collection "users" '{
    "name": "users",
    "type": "auth",
    "schema": [
        {
            "name": "name",
            "type": "text",
            "required": true,
            "options": { "min": 1, "max": 100 }
        },
        {
            "name": "role",
            "type": "select",
            "required": true,
            "options": {
                "values": ["president", "speaker", "legislator", "secretary_general", "secretariat", "student"],
                "maxSelect": 1
            }
        },
        {
            "name": "studentId",
            "type": "text",
            "required": false,
            "options": { "min": 0, "max": 20 }
        }
    ],
    "options": {
        "allowEmailAuth": true,
        "allowUsernameAuth": false,
        "requireEmail": true,
        "minPasswordLength": 8
    }
}'

# ── 建立 Sessions Collection ──

echo ""
echo "[3/5] 建立 sessions collection..."
create_collection "sessions" '{
    "name": "sessions",
    "type": "base",
    "schema": [
        {
            "name": "userId",
            "type": "relation",
            "required": true,
            "options": {
                "collectionId": "users",
                "cascadeDelete": true,
                "maxSelect": 1
            }
        },
        {
            "name": "token",
            "type": "text",
            "required": true,
            "options": { "min": 32, "max": 128 }
        },
        {
            "name": "expiresAt",
            "type": "date",
            "required": true,
            "options": {}
        }
    ],
    "indexes": [
        "CREATE UNIQUE INDEX idx_session_token ON sessions (token)",
        "CREATE INDEX idx_session_expires ON sessions (expiresAt)"
    ]
}'

# ── 建立 Audit Log Collection ──

echo ""
echo "[4/5] 建立 audit_log collection..."
create_collection "audit_log" '{
    "name": "audit_log",
    "type": "base",
    "schema": [
        {
            "name": "userId",
            "type": "relation",
            "required": true,
            "options": {
                "collectionId": "users",
                "cascadeDelete": false,
                "maxSelect": 1
            }
        },
        {
            "name": "action",
            "type": "text",
            "required": true,
            "options": { "min": 1, "max": 50 }
        },
        {
            "name": "target",
            "type": "text",
            "required": false,
            "options": { "min": 0, "max": 200 }
        },
        {
            "name": "detail",
            "type": "json",
            "required": false,
            "options": {}
        }
    ],
    "indexes": [
        "CREATE INDEX idx_audit_user ON audit_log (userId)",
        "CREATE INDEX idx_audit_action ON audit_log (action)"
    ]
}'

# ── 建立初始使用者 ──

echo ""
echo "[5/5] 建立初始使用者帳號..."

create_user() {
    local email="$1"
    local password="$2"
    local name="$3"
    local role="$4"

    local response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$PB_URL/api/collections/users/records" \
        -H "Content-Type: application/json" \
        -H "Authorization: $ADMIN_TOKEN" \
        -d "{
            \"email\": \"$email\",
            \"password\": \"$password\",
            \"passwordConfirm\": \"$password\",
            \"name\": \"$name\",
            \"role\": \"$role\",
            \"emailVisibility\": true
        }")

    if [ "$response" = "200" ]; then
        echo "  ✅ $name ($role) - $email"
    elif [ "$response" = "400" ]; then
        echo "  ⚠️  $name 可能已存在，跳過"
    else
        echo "  ❌ $name 建立失敗 (HTTP $response)"
    fi
}

# 預設帳號（密碼請在建立後修改！）
DEFAULT_PW="LacDemo2026!"

create_user "speaker@lac.tw"     "$DEFAULT_PW" "王議長" "speaker"
create_user "president@lac.tw"   "$DEFAULT_PW" "李會長" "president"
create_user "legislator@lac.tw"  "$DEFAULT_PW" "張議員" "legislator"
create_user "secretary@lac.tw"   "$DEFAULT_PW" "陳秘書長" "secretary_general"
create_user "staff@lac.tw"       "$DEFAULT_PW" "林幹事" "secretariat"
create_user "student@lac.tw"     "$DEFAULT_PW" "趙同學" "student"

echo ""
echo "=== 初始化完成 ==="
echo ""
echo "初始帳號密碼皆為：$DEFAULT_PW"
echo "⚠️  請立即登入 PocketBase Admin UI 修改密碼！"
echo ""
echo "下一步："
echo "  1. 在 SvelteKit 設定環境變數啟用 PocketBase："
echo "     LAC_PB_ENABLED=true LAC_PB_BASE_URL=$PB_URL npm run dev"
echo "  2. 或在 /admin 設定頁手動開啟 PocketBase 整合"
echo ""
