import { ArticleCard, PageHero } from "./components";
import { analysisCounts, formatChineseDate, searchWindowText, type DailyRun } from "./content";

export default function EditionView({ run, archive = false }: { run: DailyRun; archive?: boolean }) {
  const counts = analysisCounts(run);
  const journalImpact = run.search.journalImpactFactor;
  const sourceLabel = `${run.llm?.provider || "AI"} ${run.llm?.model || ""}`.trim();
  return <>
    <PageHero eyebrow={`${archive ? "ARCHIVED BRIEFING" : "DAILY BRIEFING"} · ${sourceLabel.toUpperCase()}`} title={archive ? `${formatChineseDate(run.generatedAt)}麻醉文献简报` : "今日麻醉文献简报"} description={`${formatChineseDate(run.generatedAt)}。本期发布 ${run.articles.length} 篇经过自动去重、评分、结构化精读和第二轮事实检查的真实麻醉学相关文献。${searchWindowText(run)}`} />
    <section className="content-section"><div className="shell two-column">
      <div>
        <div className="issue-line"><span>检索与筛选状态</span><span>候选 {run.search.candidateCount} 篇 · 入选 {run.articles.length} 篇</span></div>
        <p className="brief-intro">{searchWindowText(run)}。所有候选先通过专业相关性、证据质量和最低综合评分，再分别选择影响因子最高的4篇临床证据与1篇基础研究。{journalImpact ? `期刊影响因子必须严格大于 ${journalImpact.threshold}，未收录或无法核验影响因子的期刊不进入正式推荐。` : ""}扩展至半年仍不足目标构成时允许少发，不跨类别补位、不使用无关文献凑数；已正式发布的文献不会重复推荐。</p>
        <div className="daily-list">{run.articles.map(article => <ArticleCard key={article.slug} article={article} />)}</div>
        <div className="disclaimer">医学声明：本期内容由真实PubMed元数据和当前统一AI模型生成并通过第二轮质量检查，仅供医学教育与学术交流，不能替代完整原文、机构规范或临床判断。</div>
      </div>
      <aside className="surface-card side-card"><div className="eyebrow">EDITION STATUS</div><h3>本期数据状态</h3><dl className="status-list">
        <div><dt>来源</dt><dd>PubMed / PMC / Crossref</dd></div>
        <div><dt>检索日期</dt><dd>{run.search.from?.slice(0, 10)} 至 {run.search.to?.slice(0, 10)}</dd></div>
        <div><dt>检索范围</dt><dd>过去 {run.search.actualDays} 天</dd></div>
        <div><dt>自动扩展</dt><dd>{run.search.expanded ? "是" : "否"}</dd></div>
        <div><dt>候选文献</dt><dd>{run.search.candidateCount} 篇</dd></div>
        {journalImpact && <div><dt>影响因子筛选</dt><dd>{journalImpact.eligibleCount} 篇合格 / {journalImpact.excludedCount} 篇排除</dd></div>}
        <div><dt>正式入选</dt><dd>{run.articles.length} 篇</dd></div>
        <div><dt>开放全文分析</dt><dd>{counts.fullText} 篇</dd></div>
        <div><dt>摘要分析</dt><dd>{counts.abstract} 篇</dd></div>
        <div><dt>重复排除</dt><dd>{run.search.duplicateCount || 0} 篇</dd></div>
        <div><dt>AI状态</dt><dd>已完成并复核</dd></div>
      </dl></aside>
    </div></section>
  </>;
}
