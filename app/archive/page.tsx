import Link from "next/link";
import { PageHero } from "../components";
import { editionDateKey, editions, formatChineseDate } from "../content";

export const metadata = { title: "往期简报" };

export default function ArchivePage() {
  return <>
    <PageHero eyebrow="ARCHIVE" title="往期简报" description="按日期回看已经完成真实文献检索、AI精读和第二轮质量检查的正式简报。" />
    <section className="content-section"><div className="shell narrow" style={{maxWidth: "940px"}}>
      <div className="archive-toolbar"><strong>{editions.length ? `${editionDateKey(editions[0]).slice(0, 7)} 已发布简报` : "暂无正式简报"}</strong><span>{editions.length} 期</span></div>
      <div className="archive-list">{editions.map((edition, index) => { const date = editionDateKey(edition); const topics = [...new Set(edition.articles.map(article => article.category))].slice(0, 4).join(" · "); return <article className="archive-item" key={date}>
        <div className="archive-date"><strong>{formatChineseDate(edition.generatedAt)}</strong><span>{index === 0 ? "最新一期" : "历史简报"}</span></div>
        <div className="archive-meta"><h3>{edition.articles.length} 篇精选 · 候选 {edition.search.candidateCount} 篇</h3><p>{topics}</p></div>
        <Link className="archive-open" href={`/archive/${date}`}>查看 →</Link>
      </article>; })}</div>
      <div className="disclaimer">这里只保留已正式发布的简报。候选、Demo、失败或未通过质量检查的任务不会进入往期列表。</div>
    </div></section>
  </>;
}
