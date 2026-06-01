# PLAN.md — AI 辅助写小说平台 · 分阶段建造手册

> 这份文档是给 **Claude Code** 执行用的。把它放进一个空仓库的根目录，按下面《执行方式》一节，让 Claude Code 一个阶段一个阶段做，每个阶段做完都能跑、都能验收。人类（产品负责人）的职责是：在每个里程碑停下来，亲自用、做判断、决定要不要继续。

---

## 三条铁律（最重要，先读）

1. **先验证产品，再建引擎。** Phase 0–3 做完就是一个能用的产品，必须先拿去给真实写手用，确认那个"灵感追问"按钮真的有用，**再**动 Phase 4 以后的重型上下文引擎。不要在没人验证前先建百万字管线。
2. **一个引擎，三个界面。** 人物栏、大纲助手、灵感追问，本质是同一个"理解这本书"的引擎的三个出口。所有 AI 功能都走同一套"组装上下文 → 调模型"的管线，不要为每个功能各写一套。
3. **AI 是思维伙伴，不是代笔。** 产品的差异点在于"帮作者想清楚"而非"替作者写"。所有创意类 prompt 的默认姿态都是：基于作者已写的内容提问 / 给选项 / 查一致性，而**不**直接生成正文。除非作者显式要求续写。

---

## 技术选型（已替你定好，不要重新纠结）

- **语言/框架**：TypeScript + Next.js（App Router）全栈单体。
- **前端**：React + Tailwind CSS。富文本编辑器用 **TipTap**（基于 ProseMirror，能扛长文档、可扩展）。
- **后端**：Next.js Route Handlers / Server Actions（同一个代码库，单人 + Claude Code 维护最省心）。
- **数据库**：PostgreSQL + **pgvector** 扩展（关系数据和向量同一个库）。用 **Prisma** 做 ORM。托管选 Neon 或 Supabase（都原生支持 pgvector）。
- **认证**：Auth.js（NextAuth）。v0 可以先做"单用户本地模式"占位，别让登录挡住核心功能。
- **AI 模型**：见下面《模型与 Provider 策略》。默认接 **DeepSeek**（OpenAI 兼容接口），做成可切换。
- **后台任务**（Phase 5 才需要）：先用"数据库任务表 + worker"的轻方案；不够再上 Inngest 或 BullMQ。
- **部署**：Vercel + 托管 Postgres。
- **语言定位**：**通用版**，界面与 prompt 默认中文，但要同时扛住"几十万字网文长篇"和"十几万字严肃小说"两种规模 —— 即字数、分块、检索都不能假设篇幅短。暂不内置网文专属的"流派/爽点"模板（那是后续可选插件）。

---

## 仓库结构（建议，Phase 0 落地）

```
/app                      # Next.js 路由（页面 + API route handlers）
  /(editor)               # 写作主界面
  /api                    # 后端接口：/ai/inspire, /ai/character, /ai/outline ...
/components               # UI 组件（编辑器、侧边栏、卡片）
/lib
  /ai                     # 模型 provider 抽象 + prompt 模板 + 上下文组装
  /db                     # Prisma client、查询
  /retrieval              # 分块、embedding、混合检索（Phase 4）
  /summary                # 分层滚动摘要（Phase 4）
/prisma                   # schema.prisma、迁移
/prompts                  # 各功能的 prompt 模板（单独存放，便于迭代）
CLAUDE.md                 # 仓库规则（见下文，Phase 0 创建）
PLAN.md                   # 本文件
PROGRESS.md               # 进度勾选（Claude Code 维护）
```

---

## 数据模型（核心表，Phase 0 建关系部分，向量/摘要表 Phase 4 再加）

```prisma
model User    { id String @id @default(cuid()); email String? @unique; projects Project[] }

model Project {
  id String @id @default(cuid())
  userId String
  title String
  synopsis String?        // 一句话/一段设定，灵感与大纲都会用到
  targetWords Int?        // 计划总字数
  chapters Chapter[]
  bibleEntries BibleEntry[]
  plotThreads PlotThread[]
  createdAt DateTime @default(now())
}

model Chapter {
  id String @id @default(cuid())
  projectId String
  index Int               // 章序号，用于排序和"≤当前章"过滤
  title String
  goal String?            // 这一章要做什么（大纲助手用）
  content String          // 正文（富文本序列化）
  wordCount Int @default(0)
  summary ChapterSummary? // Phase 4
  updatedAt DateTime @updatedAt
}

model BibleEntry {            // 故事档案：人物/地点/物品/势力/世界规则
  id String @id @default(cuid())
  projectId String
  kind String               // 'character' | 'location' | 'item' | 'faction' | 'rule'
  name String
  aliases String[]          // 别名/外号/头衔，给"出现统计"和检索用
  attributes Json           // 结构化属性：性格、外貌、目标、关系、已知信息...
  isMajor Boolean @default(false)
}

model PlotThread {           // 伏笔/支线：埋点 → 回收
  id String @id @default(cuid())
  projectId String
  name String
  status String             // 'open' | 'resolved'
  plantedChapter Int?
  payoffChapter Int?
  notes String?
}

// ↓↓↓ Phase 4 引入 ↓↓↓
model ChapterSummary { id String @id; chapterId String @unique; text String; sourceHash String /* 标脏用 */ }
model Chunk {
  id String @id @default(cuid())
  projectId String
  chapterIndex Int
  position Int
  text String
  embedding Unsupported("vector(1024)")?   // 维度按所选 embedding 模型改
  metadata Json                            // 出场人物、地点、视角、时间线标记
  sourceHash String
}
model AiInteraction { id String @id @default(cuid()); projectId String; feature String; model String; inputTokens Int; outputTokens Int; createdAt DateTime @default(now()) } // 成本统计
```

---

## 模型与 Provider 策略（默认 DeepSeek）

**抽象层**：在 `/lib/ai/provider.ts` 定义一个统一接口 `complete({ system, messages, model, json? })`，底层默认接 DeepSeek（OpenAI 兼容，`baseURL = https://api.deepseek.com`，可直接用 openai SDK）。把模型 ID 和 key 全放环境变量与一个 `models.ts` 配置里，**不要在业务代码里硬编码模型名**，将来要加 Claude/Qwen 只改 provider 层。

**两档路由（同一家 DeepSeek 内部就能分）**：
- **机械档**：摘要、设定抽取、分类、出现统计辅助、铺底草稿 → `deepseek-chat`。绝大多数调用走这里。
- **推理档**：一致性深度核查、复杂大纲推演这类需要逐步推理的 → `deepseek-reasoner`（更贵更慢，**按需**用，不要默认）。
- 创意类（灵感追问等）默认 `deepseek-chat` 即可。

> 模型 ID（`deepseek-chat` / `deepseek-reasoner`）和接口细节以 DeepSeek 官方文档为准：https://api-docs.deepseek.com 。DeepSeek 提供**上下文硬盘缓存**，命中后输入大幅降价——务必把"稳定的系统提示 + 故事档案"放在每次请求的**前缀固定位置**以提高命中率。

**Embeddings（DeepSeek 不提供，需单独选一家）**：Phase 4 再定，要求**中文表现强**。候选：BGE-M3（开源、可自托管、多语言）或托管的中文 embedding（如通义 DashScope text-embedding 系列）。Phase 4 第一件事就是拿你自己的样章做小基准测试再定，并据此设定 `vector(N)` 维度。

**成本杠杆（建造时一直记着，按杠杆大小排）**：① 召回而非塞满（只送相关的几千 token）；② 两档路由；③ 三层缓存（上下文前缀缓存 / 结果缓存按 `sourceHash+任务` 哈希 / embedding 只重嵌入改动块）；④ 一切增量；⑤ 懒+异步+批处理；⑥ 商业模式消化（BYOK 或订阅积分，Phase 6）。每次模型调用都写一条 `AiInteraction` 记 token，方便后面算账。

---

## CLAUDE.md（Phase 0 把下面这段原样写进仓库根目录）

```markdown
# 仓库规则（Claude Code 必读）

- 按 PLAN.md 一次只做**一个 Phase**。该 Phase 全部任务完成且通过其"验收标准"前，不开始下一个。
- 每完成一个任务：本地把 app 跑起来确认无报错 → 跑相关测试 → `git commit`（清晰的中文/英文 message）→ 在 PROGRESS.md 勾掉该项。
- 不擅自更换 PLAN.md 里已定的技术选型；要加新依赖先在 PROGRESS.md 里记一行原因。
- 所有 AI 创意类功能默认"提问/给选项/查一致性"，绝不擅自生成小说正文，除非接口被显式要求续写。
- AI prompt 一律放 /prompts 下单独文件，方便迭代；模型 ID 只在 /lib/ai/models.ts 配置，不散落在业务代码。
- 涉及 Anthropic/DeepSeek 接口或模型 ID 的具体写法，以官方文档为准，不靠记忆猜：DeepSeek https://api-docs.deepseek.com ，Claude https://docs.claude.com 。
- 每个 Phase 结束在 PROGRESS.md 写一句"如何手动验证这一段"，留给人类验收。
- 写前端时追求干净、专注、不通用化的设计（写作工具，少干扰、重排版），不要套默认的 AI 生成感模板。
```

---

## 执行方式（给 Claude Code 的循环）

对每个 Phase：**读该 Phase → 实现任务清单 → 跑起来确认 → 逐条对照验收标准 → commit → 更新 PROGRESS.md → 进入下一个**。
建议的启动指令（人类对 Claude Code 说）：

> "读 PLAN.md 和 CLAUDE.md。先创建 CLAUDE.md 和 PROGRESS.md，然后开始执行 Phase 0，做完停下来让我验收。"

之后每次就说："继续下一个 Phase"或"修一下 Phase X 验收里没过的那条"。

---

## Phase 0 — 地基

**目标**：仓库、技术栈、最小可部署骨架就位。

- [ ] 初始化 Next.js(App Router) + TS + Tailwind
- [ ] 接 Prisma + Postgres（本地 + 托管），建上面"关系部分"的表
- [ ] 创建 CLAUDE.md、PROGRESS.md，建好仓库结构骨架
- [ ] 最小认证（或单用户本地模式占位）
- [ ] ESLint/Prettier、基础脚本（dev/build/test）、一个最简测试跑通
- [ ] 部署一个空壳到 Vercel + 连上托管 Postgres

**验收**：本地与线上都能跑；能创建一个 Project、一个 Chapter；刷新后数据还在。

## Phase 1 — 编辑器 + 手稿模型（产品的心脏）

**目标**：一个真正好用的写作界面。

- [ ] TipTap 编辑器，自动保存（防抖），离线/失败重试
- [ ] 左侧文档树：书 → 章（可拖动排序），章间切换不丢内容
- [ ] **中文字数统计**（按 CJK 字符计），实时显示单章 + 全书字数、对计划字数的进度
- [ ] 章节的 `title` / `goal` 可编辑；Project 的 `synopsis` / `targetWords` 可编辑
- [ ] 专注写作模式（隐藏侧栏、舒适排版）

**验收**：能连续写一部多章小说，自动保存可靠，章节自由切换，字数与进度实时准确。

## Phase 2 — v0 灵感追问（差异点，最先验证）

**目标**：把核心产品假设跑通——卡文时点一下，得到"针对这个故事"的好问题。

- [ ] 故事档案的**手动** UI：人物/世界观卡片（对应 BibleEntry，先手动填）
- [ ] 上下文组装 v0：`synopsis` + 相关 BibleEntry + 当前章正文（或光标前 N 段）拼成有上限的上下文
- [ ] `/api/ai/inspire`：调模型，用附录里的"灵感追问 system prompt"
- [ ] 编辑器里的"灵感"按钮：在光标处触发，把返回的问题渲染成卡片，可一键把某条记成笔记
- [ ] 写一条 AiInteraction 记 token

**验收**：在一段真实草稿上点"灵感"，得到 2–4 个**具体到本故事**的问题（不是"接下来会怎样"这种废话），且 AI 没有擅自替你写正文。**这一关过了，才证明产品成立。**

## Phase 3 — v0 人物栏 + 大纲助手（复用同一套上下文）

**目标**：补齐另外两个出口，得到一个完整可用的 v0。

- [ ] **人物栏**：输入角色名 → 基于 `name + aliases` 做出现次数**近似**统计（明确标注"近似"，因为代词/省略主语会漏数）；对主要角色给 AI 性格小结 + 一致性提示（用附录"人物一致性 prompt"）
- [ ] **大纲助手**：基于 `synopsis + 各章 goal + targetWords + 已写内容`，对当前章给：目标是否达成、与大纲偏差、**节奏判断**（字数进度 vs 剧情进度）、3 条针对性建议（用附录"章节建议 prompt"，不代写）
- [ ] 这两个接口共用 Phase 2 的上下文组装逻辑

**验收**：在真实草稿上，人物栏和大纲助手给出的都是有上下文依据、能直接用的反馈。

> 🚩 **里程碑：此处停下，把 v0 交给真实写手用一段时间，再决定是否继续。**

## Phase 4 — v1 检索引擎（当手稿变长、v0 扛不住时）

**目标**：让三个功能在几十万字手稿上仍然准确、快、便宜，且不剧透。

- [ ] 分块 + 打元数据（章序号、位置、出场人物、地点、视角、时间线标记），写入 Chunk 表
- [ ] 选定 embedding 模型（先用样章做基准测试，定维度），pgvector 建索引
- [ ] **混合检索**：语义(向量) + 结构过滤(**只取 ≤ 当前章** + 指定角色/地点) + 就近(前一两场默认带上) + 关键词(兜生僻专名)
- [ ] **分层滚动摘要**：场景→章节→全书梗概，每层有上限，**增量生成**（只总结新章再更新汇总）
- [ ] 把 Phase 2/3 的三个 AI 功能改造成"用检索出的有界上下文"，而不是整章塞进去

**验收**：在一份 10 万字以上的手稿上，三个功能依然准且快；给当前章找素材时**绝不**召回后文（无剧透/矛盾）；单次调用的 token 量被控制住。

## Phase 5 — v2 维护、成本、规模

**目标**：能长期养一本大书，成本可控。

- [ ] **AI 抽取故事档案 + 人工确认**：读新/改章节，产出对档案的增改建议（JSON），作者看 diff 收/不收（用附录"档案抽取 prompt"）
- [ ] **改稿同步**（最难的一块）：给每条派生数据（摘要、抽取项）记依赖的 chunk；chunk 一变标脏，用到时才**懒重算**
- [ ] **模型路由**落地（机械档/推理档），**三层缓存**（前缀/结果/embedding）
- [ ] **后台任务队列** + 批处理：支持**导入存量长篇**（一次性建档 + 嵌入），不卡前台
- [ ] 成本看板：按 AiInteraction 汇总用量

**验收**：导入一本现成长篇能自动建好档案与摘要；回头改早期某章，下游摘要/设定会随之更新而不矛盾；能看到 token 用量；路由与缓存生效。

## Phase 6 — 打磨与产品化

**目标**：陌生人能自己注册、上手、写完。

- [ ] 新手引导、空状态、错误处理、接口限流、基础可观测性（日志/告警）
- [ ] 设计打磨（编辑器排版、暗色模式、移动端基本可用）
- [ ] 导出（Markdown / docx），数据备份
- [ ] 计费与额度（若商业化）：**BYOK** 或 订阅+积分
- [ ] 无障碍与性能（长文档虚拟滚动等）

**验收**：一个没看过文档的人能注册并顺畅写作；线上稳定、成本可预测。

---

## 附录：关键 Prompt 模板（放 /prompts 下，持续迭代）

### A. 灵感追问（最重要，产品的灵魂）

System：
```
你是一个小说创作的思维伙伴，不是代笔。作者写到某处卡住了。你的任务是基于他【已经写下和设定的内容】，提出能推动他自己想清楚的问题，而不是替他写正文。

规则：
1. 只依据下面提供的上下文（已写正文、设定、摘要），不要引入上下文里没有的设定。如果某个关键点上下文根本没交代，就把"这一点还没定"本身变成一个问题。
2. 提出 2–4 个问题，聚焦于作者已建立的设定会带来、但还没处理的连锁后果、矛盾或留白（世界观逻辑、人物动机、利害关系、因果链）。问题必须具体到这个故事，禁止"接下来会发生什么"这类放之四海皆准的空话。
3. 之后可以另给 1–2 条可选的展开"方向"作为备选，每条一句话，不展开成正文。
4. 不写任何小说正文、对白或段落，不替作者做决定。
5. 语气像一个懂行、克制的编辑，简洁。

输出：先 2–4 个编号问题；如有方向，再用"或许可以往这些方向想："列 1–2 条一句话方向。
```
User（由后端组装）：依次提供 `作品设定/synopsis`、`相关故事档案条目`、`前文摘要`、`光标前的正文片段`、以及作者可选的补充提示。

### B. 人物一致性核查

System 要点：给定该角色的**设定（canonical）**与**其出场的若干片段或摘要**，找出：性格/语气漂移、外貌或设定前后矛盾、"在某时间点该不该知道某信息"的时间线错误。输出一份不一致清单，每条**注明所在章节**并标"可能是有意 / 疑似写崩"。**不改写正文**。

### C. 章节建议 / 节奏

System 要点：给定 `synopsis`、`各章 goal`、`targetWords`、`已写章节摘要` 和 `当前章目标`，输出：当前章目标是否达成、与大纲的偏差、节奏判断（**字数进度 vs 剧情进度**，如"已用 60% 字数但剧情才 30%"）、以及 3 条针对性建议。**不代写正文**。

### D. 故事档案抽取（v2）

System 要点：给定 `一章新/改的正文` 与 `当前故事档案`，输出**严格 JSON**：对档案的增改建议（新实体、属性更新、角色新获知的信息、新开/回收的伏笔），每条附**出处**（章节/位置），供作者确认。只输出 JSON，不要解释性文字。

---

## 风险与决策点（一直盯着）

- **改稿同步是最难的工程点**（Phase 5）。低估它，产品会"越写越失忆"。
- **embedding 中文选型**别拍脑袋，Phase 4 用自己的样章基准测试后再定。
- **别过度建设**：Phase 0–3 没经过真实写手验证前，不要投入 Phase 4+。
- **成本**：每次调用都记 token；上线前先把路由+缓存做到位，否则重度用户会烧钱。
- **隐私**：作者的稿子是高度敏感资产，存储与第三方模型调用都要明确告知与最小化。
