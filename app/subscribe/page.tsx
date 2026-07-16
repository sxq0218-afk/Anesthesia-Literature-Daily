import { SubscribeForm } from "../components";
import Link from "next/link";

export const metadata = { title: "免费订阅" };

export default function SubscribePage() {
  if (process.env.DEPLOY_ENV === "production") return <section className="success-wrap"><div className="success-card"><div className="eyebrow">RSS AVAILABLE</div><h1>公开测试阶段不提供邮件订阅</h1><p>本站暂不保存邮箱或发送邮件。您可以通过开放的RSS地址获取每日正式更新，无需注册或提交个人信息。</p><Link href="/rss" className="button primary">查看RSS订阅方法</Link></div></section>;
  return <section className="subscribe-page"><div className="shell subscribe-layout">
    <div className="subscribe-copy"><div className="eyebrow">FREE WEEKDAY BRIEFING</div><h1>每天 15 分钟，<br />跟上麻醉学新证据</h1><p>不是文献标题的堆砌，而是可以带进科室讨论的结构化精读。每个工作日早上，准时送达。</p>
      <ul className="benefit-list"><li><b>01</b><span>5 篇经过筛选的重要新研究</span></li><li><b>02</b><span>中文结构化摘要与关键统计结果</span></li><li><b>03</b><span>证据可信度、局限性与临床启示</span></li><li><b>04</b><span>无广告、无推广，可随时退订</span></li></ul>
    </div>
    <div className="subscribe-panel"><h2>订阅每日简报</h2><p>填写邮箱即可预览完整流程。本阶段不会真实发送邮件。</p><SubscribeForm /><div className="form-note">点击“免费订阅”即表示您同意接收模拟订阅确认。本原型不会保存或上传您的邮箱地址。</div><div className="sample-mail"><a href="/email-preview">预览 HTML 每日邮件 →</a></div></div>
  </div></section>;
}
