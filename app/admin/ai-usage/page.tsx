import { notFound } from "next/navigation";
import { PageHero } from "../../components";
import AIUsageClient from "./AIUsageClient";

export const metadata = { title: "AI使用统计" };

export default function AIUsagePage() {
  if (process.env.DEPLOY_ENV === "production") notFound();
  return <><PageHero eyebrow="ADMIN · AI USAGE" title="AI使用统计" description="查看今日与本月调用次数、Token消耗、失败记录和预计费用。" /><section className="content-section admin-section"><div className="shell narrow-admin"><AIUsageClient /></div></section></>;
}
