import { SubscribeForm } from "../components";
import Link from "next/link";

export const metadata = { title: "免费订阅" };

export default function SubscribePage() {
  if (process.env.DEPLOY_ENV === "production") {
    const username = process.env.NEXT_PUBLIC_BUTTONDOWN_USERNAME;
    if (username) return <section className="subscribe-page"><div className="shell subscribe-layout">
      <div className="subscribe-copy"><div className="eyebrow">BUTTONDOWN · DOUBLE OPT-IN</div><h1>每天自动收到<br />麻醉文献精读</h1><p>提交邮箱后，Buttondown会发送确认邮件。只有点击确认后才会正式订阅，每封邮件都提供退订入口。</p><ul className="benefit-list"><li><b>01</b><span>每天最多5篇真实麻醉学文献</span></li><li><b>02</b><span>中文结构化精读与关键统计结果</span></li><li><b>03</b><span>PubMed、DOI及合法全文入口</span></li><li><b>04</b><span>不建立账户，可随时退订</span></li></ul></div>
      <div className="subscribe-panel"><h2>免费订阅</h2><p>我们只使用邮箱发送每日简报和必要的订阅确认。</p><form action={`https://buttondown.com/api/emails/embed-subscribe/${encodeURIComponent(username)}`} method="post" className="subscribe-form"><label htmlFor="buttondown-email" className="sr-only">邮箱地址</label><input id="buttondown-email" type="email" name="email" required placeholder="请输入您的邮箱" /><input type="hidden" name="embed" value="1" /><button type="submit">发送确认邮件</button></form><div className="form-note">订阅和退订由Buttondown处理。提交即表示您同意将邮箱提供给Buttondown用于本简报投递。</div><p><a href={`https://buttondown.com/${encodeURIComponent(username)}`} target="_blank" rel="noopener noreferrer" className="text-link">打开Buttondown订阅页</a></p></div>
    </div></section>;
    const address = process.env.NEXT_PUBLIC_SUBSCRIPTION_EMAIL;
    const subscribeHref = address ? `mailto:${address}?subject=${encodeURIComponent("订阅每日麻醉文献精读")}` : null;
    return <section className="success-wrap"><div className="success-card"><div className="eyebrow">DOUBLE OPT-IN EMAIL</div><h1>通过邮件订阅每日简报</h1><p>点击下方按钮后发送邮件。系统会先向您发送确认邮件；只有再次确认后，才会把每日正式简报发送到该邮箱。</p>{subscribeHref ? <a href={subscribeHref} className="button primary">发送订阅邮件</a> : <p className="form-note">订阅邮箱正在配置中，暂时请使用 RSS。</p>}<p>退订时，只需向同一地址发送主题为“退订每日麻醉文献精读”的邮件。邮箱地址会加密保存，不会出现在公开网页或日志中。</p><Link href="/rss" className="text-link">也可以使用RSS订阅</Link></div></section>;
  }
  return <section className="subscribe-page"><div className="shell subscribe-layout">
    <div className="subscribe-copy"><div className="eyebrow">FREE WEEKDAY BRIEFING</div><h1>每天 15 分钟，<br />跟上麻醉学新证据</h1><p>不是文献标题的堆砌，而是可以带进科室讨论的结构化精读。每个工作日早上，准时送达。</p>
      <ul className="benefit-list"><li><b>01</b><span>5 篇经过筛选的重要新研究</span></li><li><b>02</b><span>中文结构化摘要与关键统计结果</span></li><li><b>03</b><span>证据可信度、局限性与临床启示</span></li><li><b>04</b><span>无广告、无推广，可随时退订</span></li></ul>
    </div>
    <div className="subscribe-panel"><h2>订阅每日简报</h2><p>填写邮箱即可预览完整流程。本阶段不会真实发送邮件。</p><SubscribeForm /><div className="form-note">点击“免费订阅”即表示您同意接收模拟订阅确认。本原型不会保存或上传您的邮箱地址。</div><div className="sample-mail"><a href="/email-preview">预览 HTML 每日邮件 →</a></div></div>
  </div></section>;
}
