import generated from "../data/generated/daily.json";
import editionData from "../data/generated/editions.json";
import { articles as demoArticles, type Article } from "./data";

type SearchInfo = {
  initialDays: number;
  actualDays: number;
  expanded: boolean;
  expansionReason?: string | null;
  from: string | null;
  to: string | null;
  candidateCount: number;
  unseenCount?: number;
  duplicateCount?: number;
  priorityCandidateCount?: number;
  selectionSummary?: { clinical: number; basic: number; other: number; priorityJournals: number };
  compositionSatisfied?: boolean;
  journalImpactFactor?: {
    threshold: number;
    comparison: string;
    candidateCount: number;
    eligibleCount: number;
    excludedCount: number;
    excludedByReason?: Record<string, number>;
  };
};

export type DailyRun = {
  generatedAt: string | null;
  mode: string;
  search: SearchInfo;
  llm?: { provider: string | null; model: string | null; usage: { promptTokens: number; completionTokens: number; totalTokens: number } };
  articles: Article[];
};

const generatedRun = generated as unknown as DailyRun;
const useProduction = process.env.LITERATURE_MODE === "production" && generatedRun.articles.length > 0;

export const dailyRun: DailyRun = useProduction ? generatedRun : {
  generatedAt: null,
  mode: "demo",
  search: { initialDays: 1, actualDays: 1, expanded: false, from: null, to: null, candidateCount: demoArticles.length },
  llm: { provider: null, model: null, usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } },
  articles: demoArticles.map(article => ({ ...article, sourceType: "demo" as const, analysisBasis: "第一阶段模拟内容" })),
};

export const articles = dailyRun.articles;
const storedEditions = (editionData as unknown as { editions?: DailyRun[] }).editions || [];
export const editions = storedEditions.filter(edition => edition.mode === "production" && edition.articles?.length);
export const allArticles = [...dailyRun.articles, ...editions.flatMap(edition => edition.articles)].filter((article, index, list) => list.findIndex(item => item.slug === article.slug) === index);

export function editionDateKey(run: DailyRun) {
  if (!run.generatedAt) return "demo";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(run.generatedAt));
}

export function analysisCounts(run: DailyRun) {
  const fullText = run.articles.filter(article => article.analysisBasis?.includes("开放全文")).length;
  return { fullText, abstract: run.articles.length - fullText };
}

export function formatChineseDate(value: string | null) {
  if (!value) return "演示日期";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "long", day: "numeric" }).format(date);
}

export function searchWindowText(run = dailyRun) {
  if (run.mode === "demo") return "模拟数据模式";
  return run.search.expanded
    ? `最近${run.search.initialDays}天未满足数量或4篇临床证据加1篇基础研究的构成，已扩展至过去${run.search.actualDays}天，并在完整合格候选池中按影响因子优先选择`
    : `检索最近${run.search.initialDays}天发表的新文献`;
}
