import { notFound } from "next/navigation";
import { allArticles } from "../../../content";
import OutboundRedirect from "../../OutboundRedirect";

const targetMap = { pubmed: "pubmed", doi: "doi", publisher: "publisher", fulltext: "openFullText" } as const;

export function generateStaticParams() {
  return allArticles.flatMap(article => Object.entries(targetMap).filter(([, key]) => article.urls?.[key]).map(([target]) => ({ pmid: String(article.pmid), target })));
}

export default async function OutboundPage({ params }: { params: Promise<{ pmid: string; target: string }> }) {
  const { pmid, target } = await params;
  const article = allArticles.find(item => String(item.pmid) === pmid);
  const key = targetMap[target as keyof typeof targetMap];
  const url = key && article?.urls?.[key];
  if (!url || !/^https:\/\//i.test(url)) notFound();
  return <OutboundRedirect url={url} />;
}
