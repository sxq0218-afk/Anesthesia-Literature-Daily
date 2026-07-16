import Link from "next/link";
import { ArticleCard } from "./components";
import { articles, dailyRun, formatChineseDate, searchWindowText } from "./content";

export default function Home() {
  const lead = articles[0];
  const editionDate = formatChineseDate(dailyRun.generatedAt);
  return <>
    <section className="home-hero">
      <div className="shell hero-grid">
        <div className="hero-copy">
          <div className="hero-kicker"><span>{dailyRun.mode === "demo" ? "演示模式" : "真实数据"}</span> {editionDate} · {searchWindowText()}</div>
          <h1>重要麻醉证据，<br /><em>每天读透一点。</em></h1>
          <p>从海量新研究中精选 5 篇，用中文拆解研究设计、核心结果与临床意义。让阅读回归证据，让决策更有依据。</p>
          <div className="hero-actions"><Link href="/daily" className="button primary">阅读今日简报</Link><Link href="/about" className="button ghost">了解数据流程</Link></div>
          <div className="trust-row"><span>✓ PubMed真实数据</span><span>✓ PMID与DOI可追溯</span><span>✓ 只提供合法全文入口</span></div>
        </div>
        <div className="hero-paper">
          <div className="paper-top"><span>今日最高评分文献</span><span>{lead.publishedDate || editionDate}</span></div>
          <div className="paper-number">01</div>
          <div className="paper-journal">{lead.journal} · {lead.category}</div>
          <h2>{lead.title}</h2>
          <p>{lead.whyItMatters || lead.question}</p>
          <div className="paper-result"><span>{lead.analysisStatus === "ai_complete" ? "AI精读结论" : "当前数据状态"}</span><strong>{lead.keyPoints[0] || lead.conclusion}</strong></div>
          <Link href={`/articles/${lead.slug}`}>查看完整精读 →</Link>
        </div>
      </div>
    </section>

    <section className="home-summary shell">
      <div className="section-heading"><div><div className="eyebrow">TODAY'S BRIEFING</div><h2>今日精选 {articles.length} 篇</h2><p>{dailyRun.mode === "demo" ? "当前为第一阶段模拟数据" : `来自PubMed真实检索 · ${searchWindowText()}`}</p></div><Link href="/daily" className="text-link">查看完整简报 →</Link></div>
      <div className="articles-stack">{articles.map((article, index) => <ArticleCard key={article.slug} article={article} featured={index === 0} />)}</div>
    </section>

    <section className="method-section"><div className="shell"><div className="eyebrow light">OUR METHOD</div><h2>一篇精读，回答四个问题</h2><div className="method-grid">
      <div><b>01</b><h3>为什么值得读？</h3><p>判断研究是否触及真实临床问题，而不只看期刊影响力。</p></div>
      <div><b>02</b><h3>研究可靠吗？</h3><p>拆解设计、偏倚、统计与外部有效性，给出证据可信度。</p></div>
      <div><b>03</b><h3>结果有多大？</h3><p>同时呈现相对效应与绝对效应，避免被单一数字误导。</p></div>
      <div><b>04</b><h3>明天怎么用？</h3><p>把结论放回适用人群、风险边界与实际工作流程。</p></div>
    </div></div></section>

    <section className="subscribe-band"><div className="shell subscribe-band-inner"><div><div className="eyebrow">RSS · OPEN STANDARD</div><h2>用 RSS 获取每日更新</h2><p>无需注册，不收集邮箱；在您自己的阅读器中查看最新简报。</p></div><div className="rss-actions"><a className="button primary" href="/rss.xml">打开 RSS 地址</a><Link className="button ghost" href="/rss">查看中文教程</Link></div></div></section>
  </>;
}
