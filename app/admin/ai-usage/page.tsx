import { PageHero } from "../../components";
import AIUsageClient from "./AIUsageClient";

export const metadata = { title: "AI使用统计" };

export default function AIUsagePage() {
  if (process.env.DEPLOY_ENV === "production") return <><PageHero eyebrow="SYSTEM · ADMIN ONLY" title="AI使用统计" description="公开网站不展示成本或详细调用记录。" /><section className="content-section"><div className="shell narrow prose"><div className="admin-card"><h2>管理员查看方式</h2><p>请在GitHub仓库的 Actions 中打开最近一次“每日文献自动更新”，查看任务摘要；也可以在本地启动管理员页面查看逐次Token记录。公开站点只展示文献内容，不公开API配置与费用明细。</p></div></div></section></>;
  return <><PageHero eyebrow="ADMIN · AI USAGE" title="AI使用统计" description="查看今日与本月调用次数、Token消耗、失败记录和预计费用。" /><section className="content-section admin-section"><div className="shell narrow-admin"><AIUsageClient /></div></section></>;
}
