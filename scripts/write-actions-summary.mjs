import fs from "node:fs";
import path from "node:path";

const summaryFile = process.env.GITHUB_STEP_SUMMARY;
if (!summaryFile) process.exit(0);
const publicSummary = path.join(process.cwd(), "data/logs/latest-public-summary.json");
let content = "## 每日麻醉文献任务\n\n";
try {
  const item = JSON.parse(fs.readFileSync(publicSummary, "utf8"));
  content += `- 状态：${item.status}\n- 日期：${item.date}\n- 入选：${item.articleCount}篇\n- 候选：${item.candidateCount}篇\n- 检索范围：${item.actualDays}天${item.expanded ? "（已扩展）" : ""}\n- 模型：${item.model}\n- Token：${item.totalTokens}（API返回）\n- 费用：按配置价格估算，请在本地管理页或data/usage查看\n`;
} catch {
  content += "- 本次任务未生成可发布摘要；请查看失败步骤。上一期网站不会被覆盖。\n";
}
content += "\n> 摘要不包含API Key、Authorization头或其他敏感配置。\n";
try {
  const email = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/logs/latest-email-summary.json"), "utf8"));
  content += `\n## 邮件推送\n\n- 状态：${email.status}\n- 已发送：${email.sent}封\n- 失败：${email.failed}封\n- 预计费用：¥${email.estimatedCostCny}（未扣除免费额度）\n`;
} catch {
  content += "\n## 邮件推送\n\n- 未启用，或本次尚未生成发送摘要。\n";
}
fs.appendFileSync(summaryFile, content, "utf8");
