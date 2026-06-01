# 仓库规则（Claude Code 必读）

- 按 PLAN.md 一次只做**一个 Phase**。该 Phase 全部任务完成且通过其"验收标准"前，不开始下一个。
- 每完成一个任务：本地把 app 跑起来确认无报错 → 跑相关测试 → `git commit`（清晰的中文/英文 message）→ 在 PROGRESS.md 勾掉该项。
- 不擅自更换 PLAN.md 里已定的技术选型；要加新依赖先在 PROGRESS.md 里记一行原因。
- 所有 AI 创意类功能默认"提问/给选项/查一致性"，绝不擅自生成小说正文，除非接口被显式要求续写。
- AI prompt 一律放 /prompts 下单独文件，方便迭代；模型 ID 只在 /lib/ai/models.ts 配置，不散落在业务代码。
- 涉及 Anthropic/DeepSeek 接口或模型 ID 的具体写法，以官方文档为准，不靠记忆猜：DeepSeek https://api-docs.deepseek.com ，Claude https://docs.claude.com 。
- 每个 Phase 结束在 PROGRESS.md 写一句"如何手动验证这一段"，留给人类验收。
- 写前端时追求干净、专注、不通用化的设计（写作工具，少干扰、重排版），不要套默认的 AI 生成感模板。
