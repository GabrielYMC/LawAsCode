# Gitea 部署指南

## 快速啟動

```bash
cd deploy
docker compose up -d
```

首次啟動後訪問 `http://localhost:3000`，完成初始設定：
1. 建立管理員帳號
2. 建立 `lawascode` 組織
3. 在組織下建立 `laws` 倉庫

## 設定 branch 保護規則

在 `laws` 倉庫設定中：
- Settings → Branches → Add Branch Protection Rule
- Branch name pattern: `main`
- 勾選 "Require pull request reviews before merging"
- 勾選 "Restrict push" → 僅允許管理員（會長帳號）

## 連接埠

| 服務 | 連接埠 |
|------|--------|
| Gitea Web/API | 3000 |
| Gitea SSH | 2222 |

## 與既有服務共存

如果 3000 port 已被佔用，修改 `docker-compose.yml` 中的 ports mapping，例如改為 `3001:3000`。
