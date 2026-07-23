# 配置与密钥清单

## 非敏感配置文件

| 文件 | 用途 |
|---|---|
| `config/topics.json` | PubMed主题关键词及权重 |
| `config/journals.json` | 综合顶刊与麻醉核心期刊优先级 |
| `config/journal-metrics.json` | 影响因子门槛、年份、数值和来源 |
| `config/scoring.json` | 分数、时间窗口、候选数、每日篇数和研究构成 |
| `config/ai-providers.json` | AI供应商适配和默认模型 |
| `config/model-pricing.json` | 每百万Token价格 |
| `config/email-pricing.json` | 邮件费用估算 |
| `deployment/edgeone-makers.json` | EdgeOne构建参数 |

## GitHub Actions Secrets

只列名称，不记录值。

当前Buttondown生产邮件必需：

- `AI_API_KEY`
- `BUTTONDOWN_API_KEY`

可选：

- `NCBI_API_KEY`

腾讯云SES备用配置：

- `SUBSCRIBER_ENCRYPTION_KEY`
- `SUBSCRIPTION_INBOX_USER`
- `SUBSCRIPTION_INBOX_PASSWORD`
- `TENCENT_SECRET_ID`
- `TENCENT_SECRET_KEY`

规则：

- 密钥只能放Secrets，不能放Variables。
- 不得复制到README、接续包、HTML、JSON、日志或截图。
- 更换Key时在供应商侧先撤销旧Key，再更新同名Secret。

## GitHub Actions Variables

当前邮件生产关键变量：

| 名称 | 推荐值或说明 |
|---|---|
| `EMAIL_DELIVERY_ENABLED` | `true`才执行每日邮件 |
| `EMAIL_PROVIDER` | `buttondown` |
| `NEXT_PUBLIC_BUTTONDOWN_USERNAME` | 当前Buttondown用户名 |
| `BUTTONDOWN_SUBSCRIBER_LIMIT` | 小范围测试建议`100` |
| `NCBI_EMAIL` | 管理员真实联系邮箱 |
| `AI_PROVIDER` | 当前供应商，如`deepseek` |
| `AI_BASE_URL` | 当前模型API根地址 |
| `AI_MODEL` | 当前模型名称 |
| `AI_TEMPERATURE` | 建议`0.1` |
| `AI_MAX_TOKENS` | 当前默认`5000` |
| `AI_TIMEOUT` | 当前默认`90000` |
| `AI_RETRY_COUNT` | 当前默认`1` |
| `DAILY_ARTICLE_COUNT` | 最大`5` |
| `DAILY_CANDIDATE_LIMIT` | 当前默认`120` |
| `DAILY_AI_CALL_LIMIT` | 当前默认`30` |
| `DAILY_TOKEN_LIMIT` | 当前默认`500000` |
| `DAILY_MAX_INPUT_CHARS` | 当前默认`60000` |
| `SITE_URL` | 有长期公开站点后填写 |

检索30天和扩展180天目前保存在`config/scoring.json`，不需要GitHub Variable。

## 更换AI模型

1. 在GitHub仓库打开`Settings`。
2. 进入`Secrets and variables` → `Actions`。
3. 在Variables修改：
   - `AI_PROVIDER`
   - `AI_BASE_URL`
   - `AI_MODEL`
4. 如果API Key也变化，在Secrets更新`AI_API_KEY`。
5. 运行“AI连接测试”工作流。
6. 成功后再手动运行“每日文献邮件”。

业务模块不能直接调用某个供应商，必须继续使用`src/llm/generate.mjs`统一入口。

## 修改检索规则

- 时间窗口：`config/scoring.json`
  - `initialWindowDays`
  - `expandedWindowDays`
- 每日数量：`dailyLimit`或GitHub Variable `DAILY_ARTICLE_COUNT`
- 候选上限：`candidateLimit`或`DAILY_CANDIDATE_LIMIT`
- 关键词：`config/topics.json`
- 期刊优先级：`config/journals.json`
- 影响因子：`config/journal-metrics.json`
- 研究构成：`config/scoring.json`的`selectionPolicy`

改JSON时必须保持合法引号、逗号和括号，并运行`npm run test:literature`。
