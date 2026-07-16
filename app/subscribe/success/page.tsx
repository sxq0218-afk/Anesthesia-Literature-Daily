import Link from "next/link";

export const metadata = { title: "订阅成功" };

export default function SubscribeSuccessPage() {
  if (process.env.DEPLOY_ENV === "production") return <section className="success-wrap"><div className="success-card"><h1>公开测试阶段未启用邮件订阅</h1><p>没有邮箱被保存或发送。请使用RSS获取更新。</p><Link href="/rss" className="button primary">前往RSS说明</Link></div></section>;
  return <section className="success-wrap"><div className="success-card"><div className="success-icon">✓</div><div className="eyebrow">SUBSCRIPTION CONFIRMED</div><h1>订阅成功</h1><p>欢迎加入每日麻醉文献精读。下一期简报将在工作日早上 8:00 送达。<br />这是界面演示，当前没有保存地址，也不会真实发送邮件。</p><Link href="/daily" className="button primary">先读今日简报</Link><p><Link href="/unsubscribe" className="text-link">查看退订页面</Link></p></div></section>;
}
