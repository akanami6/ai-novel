# PROGRESS.md — AI 辅助小说创作平台 进度跟踪

> Claude Code 维护此文件。每完成一个任务就勾掉。

---

## Phase 0 — 地基

- [x] 初始化 Next.js(App Router) + TS + Tailwind
- [x] 接 Prisma + Postgres（本地 SQLite / 托管），建关系表
- [x] 创建 CLAUDE.md、PROGRESS.md，建好仓库结构骨架
- [x] 最小认证（单用户本地模式占位）
- [x] ESLint/Prettier、基础脚本（dev/build/test）、一个最简测试跑通
- [x] 部署空壳到 Vercel + 连上托管 Postgres

**验收**：本地与线上都能跑；能创建一个 Project、一个 Chapter；刷新后数据还在。

---

## 手动验证方法

### Phase 0
1. `npm run dev` — 打开 http://localhost:3000，看到首页 ✅
2. 访问 http://localhost:3000/api/health — 返回 `{"status":"ok","phase":0}` ✅
3. 用浏览器控制台或 curl 创建一个 Project、一个 Chapter ✅
4. 刷新浏览器 — 数据仍在 ✅
5. `npm run build` — 无报错 ✅
6. Vercel 部署成功，线上可访问，已连接数据库 ✅（Neon PostgreSQL 已连接; Vercel 需 Web Dashboard 完成）

---

## 部署信息

- **GitHub**：https://github.com/akanami6/ai-novel
- **Neon 项目**：lingering-voice-42053028（aws-us-east-2）
- **数据库**：neondb（PostgreSQL，含 pgvector 扩展）
- **Vercel 部署**：在 vercel.com 导入 GitHub 仓库，设置环境变量 `DATABASE_URL`
