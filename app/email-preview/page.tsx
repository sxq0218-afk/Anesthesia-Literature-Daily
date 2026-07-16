import { PageHero } from "../components";

export const metadata = { title: "每日邮件示例" };

export default function EmailPreviewPage() {
  return <><PageHero eyebrow="HTML EMAIL SAMPLE" title="每日邮件示例" description="下方是邮件客户端中的模拟效果。示例使用独立 HTML 文件，可直接在浏览器打开或交给后续邮件服务。" /><section className="content-section"><div className="shell" style={{maxWidth:"900px"}}><iframe className="email-frame" title="每日麻醉文献精读邮件示例" src="/email-example.html" /></div></section></>;
}
