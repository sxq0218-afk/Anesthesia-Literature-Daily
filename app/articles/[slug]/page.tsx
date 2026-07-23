import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allArticles } from "../../content";
import { EvidenceMeter } from "../../components";

export function generateStaticParams() { return allArticles.map(article => ({ slug: article.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = allArticles.find(item => item.slug === slug);
  return { title: article?.title || "文献精读", description: article?.conclusion };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = allArticles.find(item => item.slug === slug);
  if (!article) notFound();
  const index = allArticles.findIndex(item => item.slug === slug);
  const next = allArticles[(index + 1) % allArticles.length];
  const isReal = article.sourceType === "real";
  const missingData = "当前可获取内容未提供该数据。";
  const summaryMissingData = "当前摘要未提供该数据。";
  const displayFact = (value: string) => article.analysisBasis === "摘要分析" && value === missingData ? summaryMissingData : value;
  const resultFacts = [
    article.sampleSize ? `样本量：${article.sampleSize}` : null,
    article.primaryOutcome ? `主要终点：${article.primaryOutcome}` : null,
    ...(article.effectSize || []).map(value => `效应量：${displayFact(value)}`),
    ...(article.confidenceInterval || []).map(value => `置信区间：${displayFact(value)}`),
    ...(article.pValue || []).map(value => `P值：${displayFact(value)}`),
  ].filter(Boolean) as string[];

  return <>
    <header className="article-header"><div className="shell article-header-inner">
      <div className="article-breadcrumb"><Link href="/daily">今日简报</Link> / {article.category}</div>
      <div className="meta-line"><span className="category-pill">{article.category}</span><span>{article.journal}</span>{typeof article.journalMetric?.impactFactor === "number" && <span>影响因子 {article.journalMetric.impactFactor}{article.journalMetric.metricYear ? `（${article.journalMetric.metricYear}）` : ""}</span>}<span>{article.publishedDate || article.year}</span><span>精读约 {article.readingTime}</span></div>
      <h1>{article.title}</h1>
      <div className="article-original">{article.originalTitle}</div>
      <p className="citation">{article.authors}<br />{article.citation}{article.pmid && <> · PMID: {article.pmid}</>}{article.doi && <> · DOI: {article.doi}</>}</p>
      {isReal && <div className="source-actions">
        <a className="source-button primary-source" href={`/out/${article.pmid}/pubmed`} target="_blank" rel="noopener noreferrer">PubMed</a>
        {article.urls?.doi && <a className="source-button" href={`/out/${article.pmid}/doi`} target="_blank" rel="noopener noreferrer">DOI</a>}
        {article.urls?.publisher && <a className="source-button" href={`/out/${article.pmid}/publisher`} target="_blank" rel="noopener noreferrer">阅读原文</a>}
        {article.urls?.openFullText && <a className="source-button open-source" href={`/out/${article.pmid}/fulltext`} target="_blank" rel="noopener noreferrer">免费全文</a>}
      </div>}
      {isReal && <div className="basis-badge"><b>分析依据</b><span>{article.analysisBasis}</span>{article.qualityPassed && <em>第二轮质量检查通过</em>}</div>}
    </div></header>

    <div className="shell article-layout">
      <article className="article-body">
        <section id="conclusion"><h2>一句话结论</h2><div className="conclusion-panel"><b>BOTTOM LINE</b><p>{article.conclusion}</p></div></section>
        <section id="attention"><h2>为什么值得关注</h2><p className="lead-question">{article.whyItMatters || article.question}</p></section>
        <section id="background"><h2>研究背景</h2><p>{article.background || article.methods}</p></section>
        <section id="pico"><h2>PICO</h2><div className="study-grid">
          <div><span>P · 研究对象</span><strong>{article.pico?.population || article.study[1]?.value || missingData}</strong></div>
          <div><span>I · 干预</span><strong>{article.pico?.intervention || article.study[2]?.value || missingData}</strong></div>
          <div><span>C · 比较</span><strong>{article.pico?.comparison || missingData}</strong></div>
          <div><span>O · 主要结局</span><strong>{article.pico?.outcome || article.study[3]?.value || missingData}</strong></div>
        </div></section>
        <section id="design"><h2>研究设计</h2><p>{article.studyType || article.study[0]?.value}</p>{article.publicationTypes?.length ? <div className="tags">{article.publicationTypes.map(type => <span key={type}>{type}</span>)}</div> : null}</section>
        <section id="results"><h2>主要结果</h2>{resultFacts.length > 0 && <ul className="key-points">{resultFacts.map(point => <li key={point}>{point}</li>)}</ul>}<p>{article.results}</p>{article.adverseEvents && <p><strong>不良事件：</strong>{article.adverseEvents}</p>}</section>
        <section id="practice"><h2>临床麻醉启示</h2><p>{article.clinical}</p><ul className="standard">{article.practice.map(item => <li key={item}>{item}</li>)}</ul></section>
        <section id="limits"><h2>研究局限</h2><ul className="standard">{article.limitations.map(item => <li key={item}>{item}</li>)}</ul></section>
        <section id="assessment"><h2>AI评价</h2><div className="editor-note"><b>数据支持程度</b><p>{article.aiAssessment?.support || article.editor}</p>{article.aiAssessment?.overinterpretationRisk && <><b>过度解读风险</b><p>{article.aiAssessment.overinterpretationRisk}</p></>}</div></section>
        {isReal && <section id="source"><h2>原文入口与全文状态</h2><p>PMID：{article.pmid || "无"}<br />DOI：{article.doi || "PubMed未提供"}{typeof article.journalMetric?.impactFactor === "number" && <><br />期刊影响因子：{article.journalMetric.impactFactor}{article.journalMetric.metricYear ? `（${article.journalMetric.metricYear} JIF）` : ""}{article.journalMetric.verifiedAt ? `，核验于 ${article.journalMetric.verifiedAt}` : ""}{article.journalMetric.source && <> · <a href={article.journalMetric.source} target="_blank" rel="noopener noreferrer">核验来源</a></>}</>}</p>{article.urls?.openFullText ? <p>已在 PubMed Central 发现合法开放全文，可通过上方“免费全文”按钮访问。</p> : <div className="disclaimer">当前未发现开放全文，仅提供PubMed摘要和DOI入口。</div>}</section>}
        <div className="disclaimer">医学声明：本页用于医学教育与学术交流。AI精读不能替代完整原文阅读、机构规范或临床判断。</div>
      </article>
      <aside className="article-aside"><nav className="toc"><strong>本文目录</strong><a href="#conclusion">一句话结论</a><a href="#attention">为什么关注</a><a href="#background">研究背景</a><a href="#pico">PICO</a><a href="#design">研究设计</a><a href="#results">主要结果</a><a href="#practice">临床启示</a><a href="#limits">研究局限</a><a href="#assessment">AI评价</a>{isReal && <a href="#source">原文入口</a>}</nav><div><EvidenceMeter level={article.evidence} />{typeof article.score === "number" && <div className="score-card"><span>自动评分</span><strong>{article.score}</strong><small>/100</small></div>}<div className="next-article"><span>下一篇</span><Link href={`/articles/${next.slug}`}>{next.title} →</Link></div></div></aside>
    </div>
  </>;
}
