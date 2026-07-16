"use client";

import { useEffect } from "react";

export default function OutboundRedirect({ url }: { url: string }) {
  useEffect(() => { const timer = window.setTimeout(() => window.location.replace(url), 120); return () => window.clearTimeout(timer); }, [url]);
  return <section className="success-wrap"><div className="success-card"><div className="success-icon">↗</div><h1>正在打开原文</h1><p>您将离开本站并前往医学文献来源网站。外部网站的加载速度可能因网络环境而异，不影响本站精读内容阅读。</p><a className="button primary" href={url} rel="noopener noreferrer">未自动跳转？点此继续</a><p className="form-note">本站不绕过付费墙，不下载或分发版权保护PDF。</p></div></section>;
}
