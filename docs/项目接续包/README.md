# 每日麻醉文献精读：项目接续包

生成日期：2026-07-23

适用仓库：`sxq0218-afk/Anesthesia-Literature-Daily`
默认分支：`main`

## 这个接续包解决什么问题

本目录用于在以下情况下继续项目，而不依赖原聊天上下文：

- 新建一个Codex或ChatGPT对话；
- 当前聊天被压缩；
- 几个月后重新开发；
- 更换其他AI助手；
- 换电脑后重新克隆仓库；
- 交给另一位开发者维护。

接手者应先阅读本文件，再按需要阅读其余文件。不要要求用户重新讲述整个项目。

## 建议阅读顺序

1. [CURRENT_STATE.md](./CURRENT_STATE.md)：当前完成状态、线上运行情况和已知限制。
2. [ARCHITECTURE_AND_RULES.md](./ARCHITECTURE_AND_RULES.md)：系统架构、每日流程和全部文献筛选规则。
3. [CONFIGURATION.md](./CONFIGURATION.md)：配置文件、GitHub Secrets与Variables清单。
4. [OPERATIONS_RUNBOOK.md](./OPERATIONS_RUNBOOK.md)：本地运行、每日任务、测试、故障排查和回滚。
5. [RESUME_PROMPT.md](./RESUME_PROMPT.md)：可直接复制给新AI助手的接续提示词。
6. [MANIFEST.json](./MANIFEST.json)：方便程序或AI快速读取的机器可读摘要。

## 接手工作的第一原则

1. 先执行只读检查：`git status --short --branch`、`git log -5 --oneline`。
2. 阅读本接续包和当前代码，不能仅凭旧聊天记录判断现状。
3. 不重新创建项目，不更换已经工作的技术栈。
4. 不覆盖用户已有改动，不使用破坏性Git命令。
5. 不读取、输出或提交API Key。
6. Production中AI只在GitHub Actions运行，公开网页不能调用AI。
7. 真实文献必须来自PubMed、PMC、Crossref等合法来源，不抓取付费全文。
8. 摘要或全文没有提供的数字必须明确写“当前可获取内容未提供该数据”，不得推测。
9. 未通过AI分析、结构校验、质量检查和正式发布的文章不得写入永久推送历史。

## 快速确认项目是否健康

```bash
npm ci --ignore-scripts
npm run test:literature
npm run test:email
npm run test:deployment
npm run security:scan
npm run build:edgeone
```

生产构建成功时应生成静态页面；安全扫描必须为零泄漏。

## 重要文件入口

- 项目总说明：`README.md`
- 每日任务：`scripts/run-daily.mjs`
- 定时邮件：`.github/workflows/daily-email.yml`
- 文献检索：`src/literature/pubmed.mjs`
- 去重：`src/literature/dedupe.mjs`
- 评分：`src/literature/scoring.mjs`
- 选文：`src/literature/selection.mjs`
- 影响因子筛选：`src/literature/journal-metrics.mjs`
- AI统一入口：`src/llm/generate.mjs`
- AI结构化分析：`src/llm/analyze.mjs`
- AI质量检查：`src/llm/quality-control.mjs`
- Buttondown发送：`src/email/buttondown.mjs`
- 当前正式简报：`data/generated/daily.json`
- 永久去重历史：`data/state/pushed.json`
- Token统计：`data/usage/`及`data/ai/usage/`

## 安全说明

本接续包只记录变量名称、流程和操作方法，不包含任何真实密钥、邮箱授权码或完整敏感配置。接手者必须从GitHub Actions Secrets或管理员本人处获得必要权限。
