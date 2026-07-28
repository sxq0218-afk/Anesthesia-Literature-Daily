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
  const deep = article.deepDive;
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
  const listOrMissing = (items?: string[]) => items?.length ? items : [missingData];

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
        <section id="base"><h2>01｜基本信息</h2><p><strong>期刊：</strong>{article.journal}<br /><strong>发表日期：</strong>{article.publishedDate || article.year}<br /><strong>研究类型：</strong>{article.studyType}<br /><strong>作者：</strong>{article.authors}<br /><strong>分析依据：</strong>{article.analysisBasis}</p></section>
        <section id="conclusion"><h2>02｜一句话结论</h2><div className="conclusion-panel"><b>BOTTOM LINE</b><p>{article.conclusion}</p></div></section>
        <section id="attention"><h2>03｜为什么值得关注</h2><p className="lead-question">{article.whyItMatters || article.question}</p></section>
        <section id="key-points"><h2>04｜关键要点</h2><ul className="key-points">{listOrMissing(article.keyPoints).map(item => <li key={item}>{item}</li>)}</ul></section>
        <section id="translation"><h2>05｜英文摘要全文中文翻译</h2>{article.abstractTranslation?.sections?.length
          ? article.abstractTranslation.sections.map((section, sectionIndex) => <div key={`${section.heading || "section"}-${sectionIndex}`}>{section.heading && <h3>{section.heading}</h3>}<p>{section.text}</p></div>)
          : <p>{article.abstractTranslation?.fullText || missingData}</p>}<div className="disclaimer">{article.abstractTranslation?.translatorNote || "AI辅助翻译，请以英文原摘要为准。"}</div></section>
        <section id="original-abstract"><h2>06｜英文原摘要</h2><p lang="en">{article.abstract || "PubMed当前未提供英文摘要。"}</p></section>
        <section id="design"><h2>07｜研究设计与PICO</h2><p><strong>研究背景：</strong>{article.background || article.methods}</p><p><strong>研究设计：</strong>{article.studyType || article.study[0]?.value}</p><div className="study-grid">
          <div><span>P · 研究对象</span><strong>{article.pico?.population || article.study[1]?.value || missingData}</strong></div>
          <div><span>I · 干预</span><strong>{article.pico?.intervention || article.study[2]?.value || missingData}</strong></div>
          <div><span>C · 比较</span><strong>{article.pico?.comparison || missingData}</strong></div>
          <div><span>O · 主要结局</span><strong>{article.pico?.outcome || article.study[3]?.value || missingData}</strong></div>
        </div>{article.publicationTypes?.length ? <div className="tags">{article.publicationTypes.map(type => <span key={type}>{type}</span>)}</div> : null}</section>
        <section id="methodology"><h2>08｜研究方法详解</h2>{deep?.methodology ? <div className="editor-note">
          <b>研究问题</b><p>{deep.methodology.researchQuestion}</p>
          <b>设计是否匹配</b><p>{deep.methodology.designFit}</p>
          <b>纳入与排除</b><p>{deep.methodology.eligibility}</p>
          <b>随机化 / 分配隐藏 / 盲法</b><p>{deep.methodology.randomization}；{deep.methodology.allocationConcealment}；{deep.methodology.blinding}</p>
          <b>样本量、随访与分析集</b><p>{deep.methodology.sampleSizePlanning}；{deep.methodology.followUp}；{deep.methodology.analysisPopulation}</p>
          <b>缺失数据</b><p>{deep.methodology.missingData}</p>
          <b>方法学优势</b><ul className="standard">{listOrMissing(deep.methodology.strengths).map(item => <li key={item}>{item}</li>)}</ul>
          <b>方法学关注点</b><ul className="standard">{listOrMissing(deep.methodology.concerns).map(item => <li key={item}>{item}</li>)}</ul>
        </div> : <p>{missingData}</p>}</section>
        <section id="statistics"><h2>09｜统计方法简介</h2>{deep?.statistics?.methods?.length
          ? deep.statistics.methods.map(method => <div className="editor-note" key={`${method.referenceId || ""}-${method.name}`}><b>{method.name}</b><p>{method.standardExplanation}</p><b>本研究用途</b><p>{method.purposeInStudy}</p><b>结果与解读</b><p>{method.reportedResult}；{method.interpretation}</p>{method.cautions.length > 0 && <ul className="standard">{method.cautions.map(item => <li key={item}>{item}</li>)}</ul>}</div>)
          : <p>当前可获取材料未明确报告可展开解释的统计方法。</p>}
          {deep?.statistics && <div className="editor-note"><b>调整变量</b><p>{deep.statistics.adjustedVariables}</p><b>多重比较</b><p>{deep.statistics.multiplicity}</p><b>亚组分析</b><p>{deep.statistics.subgroupAnalysis}</p></div>}
        </section>
        <section id="results"><h2>10｜详细结果</h2>{resultFacts.length > 0 && <ul className="key-points">{resultFacts.map(point => <li key={point}>{point}</li>)}</ul>}<p>{deep?.outcomeAnalysis.primary || article.results}</p>{deep?.outcomeAnalysis && <div className="editor-note"><b>次要结局</b><ul className="standard">{listOrMissing(deep.outcomeAnalysis.secondary).map(item => <li key={item}>{item}</li>)}</ul><b>安全性</b><p>{deep.outcomeAnalysis.safety}</p><b>绝对效应与相对效应</b><p>{deep.outcomeAnalysis.absoluteVsRelative}</p><b>亚组、交互作用与敏感性分析</b><p>{deep.outcomeAnalysis.subgroupAndInteraction}；{deep.outcomeAnalysis.sensitivity}</p></div>}{article.adverseEvents && <p><strong>不良事件：</strong>{article.adverseEvents}</p>}</section>
        <section id="significance"><h2>11｜统计学意义与临床意义</h2><p>{deep?.statistics?.clinicalVsStatisticalSignificance || missingData}</p></section>
        <section id="appraisal"><h2>12｜优势、局限与偏倚风险</h2>{deep?.criticalAppraisal ? <><b>主要优势</b><ul className="standard">{listOrMissing(deep.criticalAppraisal.strengths).map(item => <li key={item}>{item}</li>)}</ul><b>主要局限</b><ul className="standard">{listOrMissing(deep.criticalAppraisal.limitations).map(item => <li key={item}>{item}</li>)}</ul><b>偏倚风险</b><ul className="standard">{listOrMissing(deep.criticalAppraisal.biasRisks).map(item => <li key={item}>{item}</li>)}</ul><p><strong>证据可信度：</strong>{deep.criticalAppraisal.certainty}</p><p><strong>结论与数据是否匹配：</strong>{deep.criticalAppraisal.conclusionAlignment}</p><p><strong>因果边界：</strong>{deep.criticalAppraisal.causalBoundary}</p></> : <ul className="standard">{listOrMissing(article.limitations).map(item => <li key={item}>{item}</li>)}</ul>}</section>
        <section id="applicability"><h2>13｜适用与不适用范围</h2><b>适用范围</b><ul className="standard">{listOrMissing(deep?.clinicalTranslation?.applicability).map(item => <li key={item}>{item}</li>)}</ul><b>不可直接外推</b><ul className="standard">{listOrMissing(deep?.clinicalTranslation?.nonApplicability).map(item => <li key={item}>{item}</li>)}</ul></section>
        <section id="practice-change"><h2>14｜是否改变当前实践</h2><p>{deep?.clinicalTranslation?.practiceChange || article.clinical || missingData}</p></section>
        <section id="action-boundary"><h2>15｜当前可以做什么、不能得出什么</h2><b>当前可以做什么</b><ul className="standard">{listOrMissing(deep?.clinicalTranslation?.canDoNow || article.practice).map(item => <li key={item}>{item}</li>)}</ul><b>当前不能据此得出什么</b><ul className="standard">{listOrMissing(deep?.clinicalTranslation?.cannotConclude).map(item => <li key={item}>{item}</li>)}</ul></section>
        <section id="evidence-gaps"><h2>16｜证据缺口</h2><ul className="standard">{listOrMissing(deep?.clinicalTranslation?.evidenceGaps).map(item => <li key={item}>{item}</li>)}</ul></section>
        <section id="impact-factor"><h2>17｜期刊影响因子</h2><p>期刊：{article.journal}<br />影响因子：{typeof article.journalMetric?.impactFactor === "number" ? article.journalMetric.impactFactor : "未核验"}{article.journalMetric?.metricYear ? `（${article.journalMetric.metricYear} JIF）` : ""}{article.journalMetric?.verifiedAt ? `，核验于 ${article.journalMetric.verifiedAt}` : ""}{article.journalMetric?.source && <> · <a href={article.journalMetric.source} target="_blank" rel="noopener noreferrer">核验来源</a></>}</p></section>
        <section id="source"><h2>18｜文献标识与原文入口</h2><p>PMID：{article.pmid || "无"}<br />DOI：{article.doi || "PubMed未提供"}</p>{isReal && <div className="source-actions"><a className="source-button primary-source" href={`/out/${article.pmid}/pubmed`} target="_blank" rel="noopener noreferrer">PubMed</a>{article.urls?.doi && <a className="source-button" href={`/out/${article.pmid}/doi`} target="_blank" rel="noopener noreferrer">DOI</a>}{article.urls?.publisher && <a className="source-button" href={`/out/${article.pmid}/publisher`} target="_blank" rel="noopener noreferrer">出版社原文</a>}{article.urls?.openFullText && <a className="source-button open-source" href={`/out/${article.pmid}/fulltext`} target="_blank" rel="noopener noreferrer">合法免费全文</a>}</div>}{isReal && !article.urls?.openFullText && <div className="disclaimer">当前未发现开放全文，仅提供PubMed摘要和DOI入口。</div>}</section>
        <div className="disclaimer">医学声明：本页用于医学教育与学术交流。AI精读不能替代完整原文阅读、机构规范或临床判断。</div>
      </article>
      <aside className="article-aside"><nav className="toc"><strong>18项精读目录</strong><a href="#base">01 基本信息</a><a href="#conclusion">02 一句话结论</a><a href="#attention">03 为什么关注</a><a href="#key-points">04 关键要点</a><a href="#translation">05 摘要翻译</a><a href="#original-abstract">06 英文摘要</a><a href="#design">07 设计与PICO</a><a href="#methodology">08 研究方法</a><a href="#statistics">09 统计方法</a><a href="#results">10 详细结果</a><a href="#significance">11 两类意义</a><a href="#appraisal">12 批判性评价</a><a href="#applicability">13 适用范围</a><a href="#practice-change">14 实践改变</a><a href="#action-boundary">15 行动与边界</a><a href="#evidence-gaps">16 证据缺口</a><a href="#impact-factor">17 影响因子</a><a href="#source">18 原文入口</a></nav><div><EvidenceMeter level={article.evidence} />{typeof article.score === "number" && <div className="score-card"><span>自动评分</span><strong>{article.score}</strong><small>/100</small></div>}<div className="next-article"><span>下一篇</span><Link href={`/articles/${next.slug}`}>{next.title} →</Link></div></div></aside>
    </div>
  </>;
}
