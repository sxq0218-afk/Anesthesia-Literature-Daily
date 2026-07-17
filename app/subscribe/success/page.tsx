import Link from "next/link";

export const metadata = { title: "订阅成功" };

export default function SubscribeSuccessPage() {
  if (process.env.DEPLOY_ENV === "production") return <section className="success-wrap"><div className="success-card"><h1>请检查您的邮箱</h1><p>如果已经提交订阅，请打开Buttondown发送的确认邮件并点击确认。未确认的地址不会收到每日简报。</p><Link href="/daily" className="button primary">先读今日简报</Link></div></section>;
  return <section className="success-wrap"><div className="success-card"><div className="success-icon">✓</div><div className="eyebrow">SUBSCRIPTION CONFIRMED</div><h1>订阅成功</h1><p>欢迎加入每日麻醉文献精读。下一期简报将在工作日早上 8:00 送达。<br />这是界面演示，当前没有保存地址，也不会真实发送邮件。</p><Link href="/daily" className="button primary">先读今日简报</Link><p><Link href="/unsubscribe" className="text-link">查看退订页面</Link></p></div></section>;
}
