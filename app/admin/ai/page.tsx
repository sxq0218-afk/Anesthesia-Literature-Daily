import { PageHero } from "../../components";
import AISettingsClient from "./AISettingsClient";

export const metadata = { title: "AI模型配置" };

export default function AISettingsPage() {
  if (process.env.DEPLOY_ENV === "production") return <><PageHero eyebrow="SYSTEM · READ ONLY" title="当前AI模型信息" description="公开网站不提供模型或密钥编辑功能。AI只在GitHub Actions后台任务中调用。" /><section className="content-section admin-section"><div className="shell narrow prose"><div className="admin-card"><h2>公开环境安全隔离</h2><p>服务商：{process.env.AI_PROVIDER || "由GitHub Variables配置"}</p><p>模型：{process.env.AI_MODEL || "由GitHub Variables配置"}</p><p>API Key只保存在GitHub Actions Secrets，不进入网页、前端JavaScript或公开JSON。管理员更换密钥时请在GitHub仓库的 Settings → Secrets and variables → Actions 中操作。</p></div></div></section></>;
  return <><PageHero eyebrow="ADMIN · AI SETTINGS" title="AI模型配置" description="全站只使用一个AI模型。在这里更换服务商、接口、模型与成本上限；文献分析业务无需修改。" /><section className="content-section admin-section"><div className="shell narrow-admin"><AISettingsClient /></div></section></>;
}
