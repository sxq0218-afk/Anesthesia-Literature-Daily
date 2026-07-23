import fs from "node:fs";
import path from "node:path";

const summaryFile = process.env.GITHUB_STEP_SUMMARY;
if (!summaryFile) process.exit(0);
let content = "## 每日麻醉文献邮件任务\n\n";
try {
  const edition = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/generated/daily.json"), "utf8"));
  content += `- 内容状态：${edition.mode}\n- 生成时间：${edition.generatedAt}\n- 入选：${edition.articles?.length || 0}篇\n- 检索范围：${edition.search?.actualDays || "未知"}天${edition.search?.expanded ? "（已扩展）" : ""}\n- 模型：${edition.llm?.model || "未知"}\n- AI调用：${edition.llm?.usage?.calls ?? "旧期次未记录"}次\n- 输入Token：${edition.llm?.usage?.promptTokens || 0}\n- 输出Token：${edition.llm?.usage?.completionTokens || 0}\n- 总Token：${edition.llm?.usage?.totalTokens || 0}\n`;
} catch {
  content += "- 未生成新的可用简报；请查看失败步骤。\n";
}
try {
  const email = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/logs/latest-email-summary.json"), "utf8"));
  content += `\n## Buttondown投递\n\n- 状态：${email.status}\n- 期次：${email.editionId}\n- 已确认订阅者：${email.activeSubscribers ?? "等待远端统计"}\n- 预计费用：¥${email.estimatedCostCny ?? 0}\n`;
} catch {
  content += "\n## Buttondown投递\n\n- 本次没有生成投递摘要。\n";
}
content += "\n> 摘要不包含邮箱地址、API Key或Authorization头。\n";
fs.appendFileSync(summaryFile, content, "utf8");
