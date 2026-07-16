import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { editionDateKey, editions, formatChineseDate } from "../../content";
import EditionView from "../../edition-view";

export function generateStaticParams() { return editions.map(edition => ({ date: editionDateKey(edition) })); }

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const { date } = await params;
  const edition = editions.find(item => editionDateKey(item) === date);
  return { title: edition ? `${formatChineseDate(edition.generatedAt)}简报` : "历史简报", description: edition ? `本期精选${edition.articles.length}篇真实麻醉学文献。` : undefined };
}

export default async function ArchiveEditionPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const edition = editions.find(item => editionDateKey(item) === date);
  if (!edition) notFound();
  return <EditionView run={edition} archive />;
}
