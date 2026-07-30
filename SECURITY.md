# Security Policy

## Reporting a vulnerability

请不要在公开 Issue、Discussion、日志或截图中提交 API Key、邮箱授权码、订阅者地址或可利用的漏洞细节。

发现安全问题时，请通过 GitHub 仓库维护者资料中提供的私下联系方式报告，并包含：

- 受影响的文件或功能；
- 可复现的最小步骤；
- 可能的影响；
- 建议的修复方向。

在维护者确认并发布修复前，请不要公开利用细节。

## Secret handling

- 生产密钥只能放在 GitHub Actions Secrets。
- 本地密钥只能放在 `.env.local` 或 `data/private/`。
- `.env.local`、`data/private/`、`data/ai/`、`data/runs/` 和完整运行日志均不得提交。
- Pull Request、Issue、测试夹具和截图只能使用明显的虚构占位符。
- 怀疑密钥泄漏时，应立即在服务商控制台撤销并重新生成；仅删除 GitHub 当前文件不能清除历史。

## Supported version

安全修复仅保证应用到默认分支 `main` 的最新版本。
