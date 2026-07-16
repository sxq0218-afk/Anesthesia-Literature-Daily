# 每日麻醉文献精读（第三阶段测试站）

这是一个面向中国大陆小范围测试的麻醉学文献筛选与精读项目。在第二阶段真实 PubMed、PMC、Crossref、AI精读和质量检查基础上，第三阶段增加静态历史简报、RSS、GitHub Actions每日任务、EdgeOne Makers免费部署配置、公开/本地管理员隔离与安全扫描。

> 医学声明：内容只用于医学教育和学术交流，不能替代完整原文阅读、机构规范或临床判断。

## 完全不懂编程：如何打开查看

如果预览已经启动，在浏览器打开：

<http://localhost:3000>

如果没有打开，请在 Mac 的“终端”中依次粘贴下面两行，每行按一次回车：

```text
cd /Users/shiye/Documents/Anesthesia-Literature-Daily
npm run dev
```

看到 `Local: http://localhost:3000/` 后，用浏览器打开该地址。停止预览时，在终端同时按 `Control` 和 `C`。

如果3000端口已占用，终端会显示3001、3002等地址，请打开终端实际显示的链接。停止预览时，在终端同时按 `Control` 和 `C`。

## 免费公开部署教程

请按 [零基础部署教程](./docs/零基础部署教程.md) 从GitHub、Secrets、每日任务到腾讯云EdgeOne Makers逐步操作。真实运营商验收使用 [中国网络测试表](./docs/中国网络测试表.md)。

EdgeOne控制台填写：Node `22.17.1`，安装命令 `npm ci --ignore-scripts`，构建命令 `npm run build:edgeone`，输出目录 `out`，生产分支 `main`。参考配置见 `deployment/edgeone-makers.json`。

## 两种运行模式

### Demo 模式

没有 API Key 时仍可查看第一阶段模拟数据。把 `.env.local` 中的模式改成：

```text
LITERATURE_MODE=demo
```

### Production 模式

网页读取 `data/generated/daily.json` 中的真实运行结果：

```text
LITERATURE_MODE=production
```

完整生产任务要求配置一个AI模型及其 API Key。没有 Key 时可运行“真实元数据诊断”，但页面会明确标记“AI精读待生成”，不会伪造AI结论。

## 配置AI模型（推荐方法）

启动项目后打开：

```text
http://localhost:3000/admin/ai
```

如果终端显示的是 3001、3002 等其他端口，请把上面的端口改成终端显示的数字。

在“AI模型配置”页面可以选择 DeepSeek、Qwen、GLM、Kimi、MiniMax、腾讯混元、OpenAI、Claude 或 Gemini，并填写 Base URL、API Key、模型名称和每日成本上限。系统始终只使用当前选中的一个模型。

API Key 由仅监听本机的管理服务接收，使用 AES-256-GCM 加密后保存在 `data/private/`。网页只读取掩码，不会获得完整 Key；该目录已经加入 `.gitignore`。

如需使用环境变量，也可以复制 `.env.example` 为 `.env.local`，填写 `AI_API_KEY`、`AI_BASE_URL`、`AI_MODEL` 和 `AI_PROVIDER`。页面中保存的本地配置优先于环境变量。公开Production环境只从GitHub Secrets读取Key。

AI流程不是自由总结，而是：

1. 从摘要或合法 PMC 全文提取固定 JSON 字段
2. 根据结构化字段生成中文精读
3. 第二轮逐项检查标题、PMID、DOI、样本量、终点、效应方向、CI、P值、因果措辞、亚组和虚构信息
4. 检查失败时自动重写一次；仍失败则不发布该篇

## 配置 PubMed、PMC 和 Crossref

在 `.env.local` 中增加：

```text
NCBI_EMAIL=维护者的真实邮箱
NCBI_TOOL=anesthesia_literature_daily
NCBI_API_KEY=可选的NCBI密钥
CROSSREF_MAILTO=维护者的真实邮箱
```

- NCBI API Key 是可选项；没有 Key 时任务会保持低请求频率。
- PubMed、PMC 和 Crossref 数据接口本身不收费。
- `NCBI_EMAIL` 和 `CROSSREF_MAILTO` 用于遵守官方接口的“礼貌访问”规范。

## 如何运行每日文献任务

配置好当前AI模型后运行：

```text
npm run literature:daily
```

任务会自动完成：

1. 检索最近 24 小时
2. 不足 5 篇、无法组成“4 篇临床研究＋1 篇基础研究”，或优先期刊不足 3 篇时扩展到 7 天
3. 按 PMID、DOI 和标题相似度去重
4. 排除已经推送过的文章
5. 国际医学顶刊和麻醉学核心顶刊优先，再按评分选出 4 篇临床研究和 1 篇基础研究；数量不足时才用其他高相关文献补位
6. 验证 DOI、识别 PMC 全文
7. 通过统一 `generateAI()` 接口调用当前模型完成提取、生成、复核
8. 更新网页数据、往期简报和RSS
9. 保存本次运行记录、Token汇总和已推送历史

只测试真实数据接口、不调用AI：

```text
npm run literature:fetch
```

检查去重、评分和 AI 流程编排：

```text
npm run test:literature
```

准备历史简报和RSS：

```text
npm run publication:prepare
```

生成EdgeOne静态站点并扫描敏感信息：

```text
npm run build:edgeone
npm run test:deployment
npm run security:scan
```

## 可修改配置

- `config/topics.json`：关注领域和检索关键词
- `config/journals.json`：国际医学顶刊、麻醉学核心顶刊和期刊评分
- `config/scoring.json`：五类分数权重、去重阈值、候选数、每日篇数和“4 临床＋1 基础”选文比例
- `config/ai-providers.json`：可选AI服务商、接口格式和默认模型
- `config/model-pricing.json`：各模型每百万Token价格，成本估算不写死在程序中
- `.env.local`：运行模式及服务密钥

这些内容都不写死在页面或任务代码中。

## 数据文件

- `data/generated/daily.json`：网页当前读取的每日结果
- `data/generated/YYYY-MM-DD.json`：每期正式历史数据
- `data/generated/editions.json`：历史页面索引
- `public/rss.xml`：标准RSS 2.0
- `data/usage/YYYY-MM.json`：可提交的月度Token与估算费用汇总
- `data/state/pushed.json`：已经推送过的 PMID、DOI 和标题
- `data/runs/`：每次任务的完整运行快照和诊断信息
- `data/ai/usage/`：按月保存的调用次数、Token和预计费用记录
- `data/logs/ai-errors.jsonl`：不包含提示词和Key的AI错误日志
- `data/private/`：本地加密AI配置和加密主密钥，不会提交到仓库

写入每日结果时采用临时文件后原子替换，避免任务中断造成网页数据损坏。

## 项目结构

```text
app/                      现有网页与真实数据展示
config/                   关键词、期刊和评分配置
data/generated/           当前网页数据
data/state/               去重和推送历史
data/runs/                每次运行记录
scripts/run-daily.mjs     每日任务入口
src/literature/           PubMed、PMC、Crossref、去重、评分、研究类型分类、选文和存储
src/llm/                  统一generateAI、供应商适配、加密配置、统计、提示词和质量检查
app/admin/ai/             AI模型配置页面
app/admin/ai-usage/       Token与成本统计页面
scripts/admin-api.mjs     仅监听127.0.0.1的本地管理接口
```

## 费用估算

PubMed、PMC 和 Crossref 接口免费。AI费用取决于当前模型、摘要/全文长度以及是否触发重新生成。“AI使用统计”页面按 `config/model-pricing.json` 估算人民币费用；供应商调价后只需修改该配置文件。估算结果仅用于预算，最终账单以服务商控制台为准。

## 当前不包含

本阶段不包含用户注册、登录、邮件群发、微信、小程序、支付、收藏、社区或个性化推荐。第一阶段订阅页面仅在本地开发模式保留为界面原型，公开站点改为RSS入口，不保存邮箱。

## 费用结论

不需要购买服务器。目标架构只使用GitHub标准运行器的免费额度和EdgeOne Makers免费版，不启用付费增值项；AI API调用是唯一预期费用。免费政策可能调整，管理员仍需按教程每月检查腾讯云与GitHub控制台。
