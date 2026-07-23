# 新对话接续提示词

把下面整段复制给新的Codex、ChatGPT或其他AI助手。

---

请继续维护当前工作目录中的“每日麻醉文献精读（Anesthesia Literature Daily）”项目。

不要重新创建项目，不要更换已经正常工作的技术栈，不要破坏现有PubMed检索、PMC/Crossref补充、文献评分、AI精读、质量检查、Buttondown邮件、Token统计、历史简报、RSS和网页界面。

开始任何修改前必须：

1. 阅读：
   - `docs/项目接续包/README.md`
   - `docs/项目接续包/CURRENT_STATE.md`
   - `docs/项目接续包/ARCHITECTURE_AND_RULES.md`
   - `docs/项目接续包/CONFIGURATION.md`
   - `docs/项目接续包/OPERATIONS_RUNBOOK.md`
2. 运行`git status --short --branch`和`git log -5 --oneline`。
3. 检查当前代码和配置，以仓库现状为准，不仅依赖本提示词。
4. 保留用户已有改动，不使用破坏性Git操作。
5. 不读取、展示、记录或提交任何API Key。

当前核心规则：

- 优先检索最近30天，条件不足时扩展到最近180天。
- 扩展后近30天文献仍优先。
- 每日最多5篇，目标为4篇临床研究和1篇麻醉相关基础研究。
- 国际医学顶刊和麻醉核心期刊优先。
- 期刊影响因子必须严格大于5；未知或未配置期刊排除。
- 评分至少45且专业相关性大于0。
- PMID、DOI和标题相似度去重。
- 已正式发布或发送的文献永久排除。
- candidate、Demo、failed或未正式发布记录不进入永久排除历史。
- 最近半年仍不足5篇时允许少发，不能降低质量凑数。
- AI必须先结构化提取，再生成中文精读，再做第二轮事实检查。
- 原文没有的数据必须写“当前可获取内容未提供该数据”，禁止猜测。
- 只有完成分析、校验、生成和正式发布才能写入published历史。

当前主要自动任务：

- `.github/workflows/daily-email.yml`
- 每天UTC 00:37，即北京时间约08:37。
- Buttondown是当前主要邮件渠道。
- Production AI Key只允许放GitHub Actions Secrets。

完成新任务后必须：

- 运行与风险相称的自动测试；
- 运行`npm run security:scan`；
- 涉及页面或构建时运行`npm run build:edgeone`；
- 清楚区分“本地完成”“已推送GitHub”“线上已运行”；
- 未真实完成的项目明确标记未完成，不得虚构。

请先用简短语言说明你从接续包中理解到的当前状态和本次计划，再开始工作。

---
