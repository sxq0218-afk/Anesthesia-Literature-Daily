"use client";

import Link from "next/link";
import { useState } from "react";
import type { Article } from "./data";

export function Header({ publicSite = false, emailSubscription = false }: { publicSite?: boolean; emailSubscription?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="header-inner shell">
        <Link href="/" className="brand" aria-label="每日麻醉文献精读首页" onClick={() => setOpen(false)}>
          <span className="brand-mark">A</span>
          <span><strong>每日麻醉文献精读</strong><small>ANESTHESIA LITERATURE DAILY</small></span>
        </Link>
        <button className="menu-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="打开导航">{open ? "关闭" : "菜单"}</button>
        <nav className={open ? "main-nav open" : "main-nav"} aria-label="主导航">
          <Link href="/daily" onClick={() => setOpen(false)}>今日简报</Link>
          <Link href="/archive" onClick={() => setOpen(false)}>往期简报</Link>
          <Link href="/rss" onClick={() => setOpen(false)}>RSS</Link>
          {publicSite && emailSubscription && <Link href="/subscribe" onClick={() => setOpen(false)}>邮件订阅</Link>}
          <Link href="/about" onClick={() => setOpen(false)}>关于</Link>
          {!publicSite && <Link href="/admin/ai" onClick={() => setOpen(false)}>AI配置</Link>}
          {!publicSite && <Link href="/subscribe" className="nav-cta" onClick={() => setOpen(false)}>订阅原型</Link>}
        </nav>
      </div>
    </header>
  );
}

export function Footer({ publicSite = false, emailSubscription = false }: { publicSite?: boolean; emailSubscription?: boolean }) {
  return (
    <footer className="site-footer">
      <div className="shell footer-grid">
        <div><div className="footer-brand">每日麻醉文献精读</div><p>让重要证据，更快抵达临床。</p></div>
        <div className="footer-links"><Link href="/daily">今日简报</Link><Link href="/archive">往期简报</Link>{(!publicSite || emailSubscription) && <Link href="/subscribe">邮件订阅</Link>}<Link href="/rss">RSS订阅</Link><Link href="/about">关于</Link><Link href="/privacy">隐私说明</Link>{!publicSite && <><Link href="/email-preview">邮件示例</Link><Link href="/admin/ai">AI模型配置</Link><Link href="/admin/ai-usage">AI使用统计</Link></>}</div>
        <div className="footer-note">本项目内容仅供医学教育与学术交流，不能替代临床判断。</div>
      </div>
      <div className="shell copyright">© 2026 每日麻醉文献精读 · 真实文献测试站</div>
    </footer>
  );
}

export function PageHero({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <section className="page-hero"><div className="shell"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div></section>;
}

export function ArticleCard({ article, featured = false }: { article: Article; featured?: boolean }) {
  return (
    <article className={featured ? "article-card featured" : "article-card"}>
      <div className="card-index">{article.number}</div>
      <div className="card-content">
        <div className="meta-line"><span className="category-pill">{article.category}</span><span>{article.journal}</span>{article.publishedDate && <span>{article.publishedDate}</span>}<span>精读约 {article.readingTime}</span></div>
        <h3><Link href={`/articles/${article.slug}`}>{article.title}</Link></h3>
        <p className="original-title">{article.originalTitle}</p>
        <div className="clinical-box"><span>临床结论</span><p>{article.conclusion}</p></div>
        {article.sourceType === "real" && <div className="data-provenance"><span>{article.analysisBasis}</span>{typeof article.score === "number" && <b>自动评分 {article.score}/100</b>}</div>}
        <div className="card-bottom"><div className="tags">{article.tags.slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}</div><Link className="read-link" href={`/articles/${article.slug}`}>阅读全文 <span>→</span></Link></div>
      </div>
    </article>
  );
}

export function SubscribeForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  function submit(e: React.FormEvent) {
    e.preventDefault();
    window.location.href = `/subscribe/success?email=${encodeURIComponent(email || "reader@example.com")}`;
  }
  return <form className={compact ? "subscribe-form compact" : "subscribe-form"} onSubmit={submit}>
    <label htmlFor={compact ? "email-compact" : "email-main"} className="sr-only">邮箱地址</label>
    <input id={compact ? "email-compact" : "email-main"} type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="请输入您的邮箱" />
    <button type="submit">免费订阅</button>
  </form>;
}

export function EvidenceMeter({ level }: { level: string }) {
  const score = level === "高" ? 4 : level.includes("偏高") ? 3 : 2;
  return <div className="evidence-meter" aria-label={`证据可信度 ${level}`}><span>{level}</span><div>{[1,2,3,4].map(n => <i key={n} className={n <= score ? "on" : ""} />)}</div></div>;
}
