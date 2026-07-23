# 运行与维护手册

## 本地打开

```bash
cd /Users/shiye/Documents/Anesthesia-Literature-Daily
npm ci --ignore-scripts
npm run dev
```

浏览器打开终端显示的本地地址，通常为`http://localhost:3000`。

## Demo模式

`.env.local`：

```text
LITERATURE_MODE=demo
DEPLOY_ENV=local
```

Demo不能冒充真实生产结果。

## 真实元数据预检

```bash
npm run literature:fetch
```

作用：

- 使用真实PubMed；
- 不调用AI；
- 忽略正式历史以便诊断候选；
- 不正式发布；
- 不产生AI费用。

## 正式本地任务

确保`.env.local`已配置当前AI模型和Key：

```bash
npm run literature:daily
```

不要在终端命令中直接写API Key。

## 自动邮件任务

GitHub：

1. 打开仓库`Actions`。
2. 选择“每日文献邮件”。
3. 点击`Run workflow`可手动补运行。
4. 定时为UTC 00:37，即北京时间约08:37。
5. GitHub定时任务可能延迟，不能承诺精确到分钟。

成功摘要应显示：

- 内容状态`production`；
- 入选篇数；
-检索范围30天或扩展180天；
- 当前模型；
- 输入、输出和总Token；
- Buttondown投递状态。

`already-published`或`already-sent`表示重复运行保护生效，不应强行重发。

## 标准测试

```bash
npm run test:literature
npm run test:email
npm run test:deployment
npm run security:scan
npm run build:edgeone
```

预期：

- 所有测试通过；
- 安全扫描`findings=0`；
- 静态构建成功；
- 不出现API Key、Authorization或Bearer泄漏。

## Token与费用

- Actions任务摘要：查看本次调用次数、输入Token、输出Token和总Token。
- 本地管理页面：`/admin/ai-usage`。
- 静态月度汇总：`data/usage/YYYY-MM.json`。
- 详细AI统计：`data/ai/usage/`。
- API未提供usage时必须标记为估算。

## 历史去重检查

文件：`data/state/pushed.json`

- 正式记录应为`status=published`。
- 不能手工把candidate或failed写入此文件。
- 标题、PMID和DOI用于跨天去重。
- 如果要重新推荐一篇正式发布过的文章，必须由管理员明确决定并记录原因，不能随意删除历史。

## 常见故障

### PubMed失败

- 自动重试后仍失败：不发布新一期。
- 保留上一期正常内容。
- 检查NCBI状态、`NCBI_EMAIL`及网络。

### 30天或半年不足

- 30天不足会自动扩展到180天。
- 半年仍不足时少发。
- 不降低影响因子或评分门槛凑数。

### AI Key或模型错误

- Actions应明确显示认证、模型不存在、余额或格式错误。
- 不发布不完整简报。
- 修正Secrets/Variables后手动重跑。

### Buttondown失败

- 检查账户是否仍可发送。
- 检查`BUTTONDOWN_API_KEY`、权限和`EMAIL_DELIVERY_ENABLED`。
- 不能用Demo结果冒充发送成功。

### Git push提示publickey错误

当前远程可能是SSH格式：

```text
git@github.com:sxq0218-afk/Anesthesia-Literature-Daily.git
```

解决方法任选其一：

- 给本机配置有仓库权限的SSH Key；
- 安装并登录GitHub CLI；
- 改用已认证HTTPS；
- 使用已登录GitHub网页编辑或上传。

在确认远程状态前禁止强制推送。

### 构建器提示端口权限

本地受限沙盒可能阻止Turbopack临时绑定端口。应在正常终端或经过授权的环境重新运行`npm run build:edgeone`，不能把该沙盒限制误判成代码错误。

## 回滚

1. 在GitHub打开提交历史。
2. 找到最后一个正常提交。
3. 优先使用`Revert`产生新的反向提交。
4. 不使用`git reset --hard`覆盖他人工作。
5. EdgeOne自动部署失败时保留上一版部署。

## 每月维护

- 查看AI费用和Token趋势；
- 检查GitHub Actions免费额度；
- 检查Buttondown订阅人数；
- 检查EdgeOne是否出现付费资源；
- 新版JIF发布后更新影响因子配置；
- 抽查精读数字与原摘要是否一致；
- 查看Actions失败记录和安全扫描。
