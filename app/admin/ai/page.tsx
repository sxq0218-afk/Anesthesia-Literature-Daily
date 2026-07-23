import { notFound } from "next/navigation";
import { PageHero } from "../../components";
import AISettingsClient from "./AISettingsClient";

export const metadata = { title: "AI模型配置" };

export default function AISettingsPage() {
  if (process.env.DEPLOY_ENV === "production") notFound();
  return <><PageHero eyebrow="ADMIN · AI SETTINGS" title="AI模型配置" description="全站只使用一个AI模型。在这里更换服务商、接口、模型与成本上限；文献分析业务无需修改。" /><section className="content-section admin-section"><div className="shell narrow-admin"><AISettingsClient /></div></section></>;
}
