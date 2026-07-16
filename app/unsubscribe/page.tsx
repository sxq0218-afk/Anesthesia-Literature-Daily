"use client";

import { useState } from "react";
import Link from "next/link";

export default function UnsubscribePage() {
  const [done, setDone] = useState(false);
  if (process.env.NEXT_PUBLIC_DEPLOY_ENV === "production") {
    const address = process.env.NEXT_PUBLIC_SUBSCRIPTION_EMAIL;
    const href = address ? `mailto:${address}?subject=${encodeURIComponent("退订每日麻醉文献精读")}` : null;
    return <section className="success-wrap"><div className="success-card"><h1>退订每日简报</h1><p>请使用订阅邮箱向专用地址发送主题为“退订每日麻醉文献精读”的邮件，系统会停止后续发送。</p>{href ? <a className="button primary" href={href}>发送退订邮件</a> : <Link className="button ghost" href="/rss">订阅邮箱正在配置</Link>}</div></section>;
  }
  return <section className="success-wrap"><div className="success-card"><div className="eyebrow">EMAIL PREFERENCES</div>{done ? <><div className="success-icon">✓</div><h1>已完成退订</h1><p>这个邮箱将不再接收每日简报。感谢您曾经阅读，也欢迎随时回来。</p><Link className="button ghost" href="/">返回首页</Link></> : <><h1>退订每日简报</h1><p>请输入订阅邮箱确认退订。本阶段仅演示交互，不会修改或保存真实订阅数据。</p><form className="subscribe-form" onSubmit={e => {e.preventDefault(); setDone(true);}}><label htmlFor="unsubscribe-email" className="sr-only">订阅邮箱</label><input id="unsubscribe-email" required type="email" placeholder="name@example.com" /><button type="submit">确认退订</button></form><p><Link href="/" className="text-link">我想继续保留订阅</Link></p></>}</div></section>;
}
