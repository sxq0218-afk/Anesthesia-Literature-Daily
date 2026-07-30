# 每日麻醉文献精读

一个可自行部署的开源麻醉学文献筛选、AI 精读与邮件推送项目。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.13-339933.svg)](./package.json)

项目每天从 PubMed 检索麻醉学相关文献，经过期刊影响因子、专业相关性、研究类型、历史去重和质量评分筛选后，选择最多 5 篇文献进行中文深度解读，并通过 Buttondown 发送完整邮件。

开源仓库：<https://github.com/sxq0218-afk/Anesthesia-Literature-Daily>

> 医学声明：本项目仅用于医学教育、科研辅助和学术交流，不能替代完整原文阅读、机构规范或临床判断。AI 输出可能存在错误，重要结论必须回看原文。

## 核心能力

- PubMed E-utilities 真实检索，PMC 合法开放全文识别，Crossref DOI 补充。
- 优先最近 30 天，不足时依次扩展至 180 天和 360 天。
- 期刊影响因子必须严格大于 5；未知、未配置或指标过旧的期刊默认排除。
- 目标构成为 4 篇临床证据加 1 篇基础研究，不跨类别凑数。
- 系统评价、Meta 分析、指南和共识均计入临床证据。
- 合格文献优先按影响因子降序选择，再比较综合质量、证据质量和发表日期。
- PMID、DOI、标题相似度和正式推送历史多重去重。
- AI 完成结构化提取、摘要全文中文翻译、统计方法简介、精读 V2 和第二轮事实核查。
- 邮件展示完整最终内容；同一期重复运行不会重复调用 AI 或重复发信。
- 每天北京时间约 07:00 由 GitHub Actions 自动执行，也支持手动运行。
- 静态网页、往期简报和 RSS 可选部署；邮件推送不依赖自有域名。

## 选文规则

```text
PubMed 候选
  → 正式历史去重
  → 期刊影响因子 > 5
  → 麻醉专业相关性与质量评分
  → 30 天 / 180 天 / 360 天逐级扩展
  → 临床与基础分别按影响因子排序
  → 4 篇临床证据 + 1 篇基础研究
  → AI 精读、摘要翻译与事实检查
  → 先保存正式期次，再发送完整邮件
```

360 天内仍不能组成目标结构时允许少发，但不会降低标准、跨类别补位或使用低质量文献凑数。

## 下载后如何配置

完整图文步骤见 [开源配置指南](./docs/开源配置指南.md)。下面是最短可运行路径。

### 1. 准备环境

- Git
- Node.js 22.13 或更高版本，推荐 `22.17.1`
- 一个 OpenAI 兼容格式的 AI API（默认示例为 DeepSeek）
- 一个真实联系邮箱，用于遵守 NCBI 和 Crossref 接口规范
- 如需邮件推送：Buttondown 账号及 API Key

### 2. 下载并安装

```bash
git clone https://github.com/sxq0218-afk/Anesthesia-Literature-Daily.git
cd Anesthesia-Literature-Daily
npm ci --ignore-scripts
cp .env.example .env.local
```

### 3. 配置本地环境

打开 `.env.local`，至少填写：

```dotenv
LITERATURE_MODE=production
DEPLOY_ENV=local

AI_PROVIDER=deepseek
AI_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-chat
AI_API_KEY=填写你自己的AI密钥

NCBI_EMAIL=填写你的真实联系邮箱
CROSSREF_MAILTO=填写你的真实联系邮箱
```

`NCBI_API_KEY` 是可选项。不要把填有真实密钥的 `.env.local` 提交到 GitHub；该文件已被 `.gitignore` 排除。

### 4. 先做无 AI 预检

```bash
npm run literature:fetch
```

这一步使用真实 PubMed 元数据，但不调用 AI、不发邮件。

### 5. 运行完整任务

```bash
npm run literature:daily
npm run publication:prepare
```

本地查看：

```bash
npm run dev
```

浏览器打开终端显示的地址，通常为 <http://localhost:3000>。

## 配置每天自动邮件

在你自己的 GitHub 仓库中进入：

`Settings → Secrets and variables → Actions`

### Secrets

| 名称 | 是否必需 | 用途 |
|---|---:|---|
| `AI_API_KEY` | 是 | 当前 AI 服务商密钥 |
| `BUTTONDOWN_API_KEY` | 发送邮件时是 | Buttondown API 密钥 |
| `NCBI_API_KEY` | 否 | 提高 NCBI 请求额度 |

### Variables

| 名称 | 推荐值 | 说明 |
|---|---|---|
| `EMAIL_DELIVERY_ENABLED` | `true` | 确认配置完成后才开启 |
| `AI_PROVIDER` | `deepseek` | 当前 AI 服务商 |
| `AI_BASE_URL` | `https://api.deepseek.com` | API 地址 |
| `AI_MODEL` | `deepseek-chat` | 模型名称 |
| `AI_TEMPERATURE` | `0.1` | 降低随机性 |
| `AI_TIMEOUT` | `90000` | 单次调用超时，毫秒 |
| `AI_RETRY_COUNT` | `1` | AI 失败重试次数 |
| `NCBI_EMAIL` | 你的真实邮箱 | NCBI 与 Crossref 联系方式 |
| `NEXT_PUBLIC_BUTTONDOWN_USERNAME` | 你的 Buttondown 用户名 | 订阅入口 |
| `BUTTONDOWN_SUBSCRIBER_LIMIT` | `100` | 免费测试阶段的保护上限 |
| `DAILY_ARTICLE_COUNT` | `5` | 每日最多篇数 |
| `DAILY_MAX_CANDIDATES` | `2000` | 候选池异常保护上限 |
| `DAILY_CANDIDATE_PAGE_SIZE` | `200` | PubMed 分页大小 |
| `DAILY_JOURNAL_AUDIT_LIMIT` | `300` | 未配置期刊审计上限 |
| `PUBMED_FETCH_BATCH_SIZE` | `150` | PubMed 详情批次 |
| `DAILY_AI_CALL_LIMIT` | `50` | 每日 AI 调用保护 |
| `DAILY_TOKEN_LIMIT` | `500000` | 每日 Token 保护 |
| `DAILY_MAX_INPUT_CHARS` | `60000` | 单篇输入长度保护 |
| `SITE_URL` | 可选正式 HTTPS 地址 | 部署网站和 RSS 时使用 |

工作流文件为 [`.github/workflows/daily-email.yml`](./.github/workflows/daily-email.yml)，默认每天 UTC 23:00，即北京时间约 07:00 执行。GitHub Actions 可能因平台排队延迟数分钟。

第一次开启前建议：

1. 保持 `EMAIL_DELIVERY_ENABLED=false`。
2. 在 Actions 中手动运行一次“每日文献邮件”。
3. 确认配置检查、测试、文献生成、构建和安全扫描都成功。
4. 检查 Buttondown 测试账户和订阅者。
5. 最后再把 `EMAIL_DELIVERY_ENABLED` 改为 `true`。

## 邮件配置

当前推荐 Buttondown，因为无需自有域名即可完成订阅、退订和 API 发送：

1. 注册 Buttondown。
2. 创建 newsletter 并记录用户名。
3. 在 API Keys 页面生成独立密钥。
4. 将密钥放入 GitHub Secret `BUTTONDOWN_API_KEY`。
5. 将用户名放入 Variable `NEXT_PUBLIC_BUTTONDOWN_USERNAME`。

详细步骤见 [Buttondown 邮件订阅配置教程](./docs/Buttondown邮件订阅配置教程.md)。

## 可选部署网页

项目支持 Next.js 静态导出：

```bash
npm run build:edgeone
```

推荐构建配置：

| 配置 | 值 |
|---|---|
| Node.js | `22.17.1` |
| 安装命令 | `npm ci --ignore-scripts` |
| 构建命令 | `npm run build:edgeone` |
| 输出目录 | `out` |
| 生产分支 | `main` |

网站不是邮件推送的前置条件。没有稳定公开域名时，不要把临时预览地址写入 `SITE_URL`。

## 测试与安全检查

```bash
npm run test:literature
npm run test:email
npm run test:deployment
npm run lint
npm run security:scan
npm run build:edgeone
npm audit --omit=dev --omit=optional
```

密钥保护原则：

- 生产密钥只放 GitHub Actions Secrets。
- 本地密钥只放被忽略的 `.env.local` 或 `data/private/`。
- 公开网页不能读取 AI 或邮件密钥。
- 正式内容通过验证并提交成功后才调用邮件服务。
- Buttondown 写请求不会盲目重试，并按期次主题检查重复邮件。

安全问题请阅读 [SECURITY.md](./SECURITY.md)。

## 常用配置文件

- [`config/topics.json`](./config/topics.json)：麻醉学主题和检索关键词
- [`config/journals.json`](./config/journals.json)：期刊名单和层级
- [`config/journal-metrics.json`](./config/journal-metrics.json)：影响因子、年份及来源
- [`config/scoring.json`](./config/scoring.json)：评分、候选规模和每日构成
- [`config/ai-providers.json`](./config/ai-providers.json)：AI 服务商适配
- [`config/model-pricing.json`](./config/model-pricing.json)：Token 费用估算
- [`src/literature/statistics.mjs`](./src/literature/statistics.mjs)：统计方法通俗解释

## 项目结构

```text
app/                         Next.js 页面
config/                      检索、期刊、评分和模型配置
data/generated/              当前及历史简报
data/state/                  正式推送去重历史
email-templates/             邮件模板
scripts/run-daily.mjs        每日任务入口
scripts/send-daily-buttondown.mjs
src/literature/              检索、筛选、分类、评分和存储
src/llm/                     AI 适配、结构化精读和质量检查
.github/workflows/           自动任务
docs/                        部署、邮件和维护文档
```

## 成本

PubMed、PMC 和 Crossref 接口本身免费。主要潜在成本是 AI API；GitHub Actions、Buttondown 和静态托管是否免费，以各服务商当前政策和你的使用量为准。项目内置每日调用次数、Token 和订阅人数保护，但仍应定期检查账单。

## 参与贡献

欢迎提交 Issue 和 Pull Request。特别欢迎：

- 新版期刊影响因子及权威来源更新
- 麻醉学主题词与研究分类优化
- 统计方法解释完善
- AI 事实核查、医学边界和中文表达改进
- 邮件兼容性、部署文档和自动测试

提交前请至少运行与改动相关的测试，并确保 `npm run security:scan` 通过。不要在 Issue、日志、截图或提交中包含任何真实 API Key、邮箱授权码或订阅者信息。

## License

[MIT](./LICENSE)
