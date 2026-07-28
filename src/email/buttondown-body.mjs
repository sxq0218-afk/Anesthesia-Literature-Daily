function escapeHtml(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function value(input, fallback = "当前可获取内容未提供该数据。") {
  if (Array.isArray(input)) return input.length ? input.join("；") : fallback;
  return String(input || fallback).trim();
}

function externalLink(url, label) {
  if (!url) return "";
  return `<a href="${escapeHtml(url)}" style="color:#0b5f9e;text-decoration:underline">${escapeHtml(label)}</a>`;
}

function paragraph(input, fallback) {
  return escapeHtml(value(input, fallback)).replaceAll("\n", "<br>");
}

function list(items, fallback = "当前可获取内容未提供该数据。") {
  const values = (Array.isArray(items) ? items : [items]).filter(Boolean);
  if (!values.length) return `<p>${escapeHtml(fallback)}</p>`;
  return `<ul style="padding-left:22px">${values.map(item => `<li style="margin:6px 0">${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function heading(title) {
  return `<h3 style="margin:22px 0 8px;color:#17324d">${escapeHtml(title)}</h3>`;
}

function labeled(label, content) {
  return `<p><b>${escapeHtml(label)}：</b>${paragraph(content)}</p>`;
}

function articleHtml(article, index) {
  const pico = article.pico || {};
  const deep = article.deepDive;
  const methodology = deep?.methodology;
  const statistics = deep?.statistics;
  const outcomes = deep?.outcomeAnalysis;
  const appraisal = deep?.criticalAppraisal;
  const translation = deep?.clinicalTranslation;
  const abstractTranslation = article.abstractTranslation;
  const metric = article.journalMetric;
  const links = [
    externalLink(article.urls?.pubmed, "PubMed"),
    externalLink(article.urls?.doi, "DOI"),
    externalLink(article.urls?.publisher, "出版社原文"),
    externalLink(article.urls?.openFullText, "合法免费全文"),
  ].filter(Boolean).join(" · ");
  const translationHtml = abstractTranslation?.sections?.length
    ? abstractTranslation.sections.map(section => `<p>${section.heading ? `<b>${escapeHtml(section.heading)}：</b>` : ""}${paragraph(section.text)}</p>`).join("")
    : `<p>${paragraph(abstractTranslation?.fullText)}</p>`;
  const statisticsHtml = statistics?.methods?.length
    ? statistics.methods.map(method => `<div style="margin:12px 0;padding:12px 14px;background:#f8fafc;border-radius:6px">
        <b>${escapeHtml(value(method.name))}</b>
        <p><b>方法简介：</b>${paragraph(method.standardExplanation)}</p>
        <p><b>本研究用途：</b>${paragraph(method.purposeInStudy)}</p>
        <p><b>报告结果：</b>${paragraph(method.reportedResult)}</p>
        <p><b>正确解读：</b>${paragraph(method.interpretation)}</p>
        ${method.cautions?.length ? `<b>注意：</b>${list(method.cautions)}` : ""}
      </div>`).join("")
    : `<p>${paragraph(null)}</p>`;
  return `<section style="padding:24px 0;border-bottom:1px solid #dbe7ef">
    <div style="font-size:13px;color:#0b5f9e;font-weight:700">${String(index + 1).padStart(2, "0")} · ${escapeHtml(value(article.category, "麻醉学"))}</div>
    <h2 style="font-size:22px;line-height:1.45;margin:8px 0;color:#17324d">${escapeHtml(value(article.title))}</h2>
    <p style="font-size:14px;color:#64748b;line-height:1.6;word-break:break-word">${escapeHtml(value(article.originalTitle))}</p>
    ${heading("01｜基本信息")}
    <p><b>${escapeHtml(value(article.journal))}</b> · ${escapeHtml(value(article.publishedDate))} · ${escapeHtml(value(article.studyType))}
      ${typeof metric?.impactFactor === "number" ? ` · 影响因子 ${escapeHtml(metric.impactFactor)}${metric.metricYear ? `（${escapeHtml(metric.metricYear)}年度）` : ""}` : ""}
    </p>
    ${labeled("作者", article.authors)}
    ${labeled("分析依据", article.analysisBasis)}
    ${heading("02｜一句话结论")}
    <div style="padding:14px 16px;background:#eef6fb;border-left:4px solid #0b5f9e"><b>一句话结论</b><br>${escapeHtml(value(article.conclusion))}</div>
    ${heading("03｜为什么值得关注")}<p>${paragraph(article.whyItMatters)}</p>
    ${heading("04｜关键要点")}${list(article.keyPoints)}
    ${heading("05｜英文摘要全文中文翻译")}${abstractTranslation ? `${translationHtml}<p style="font-size:12px;color:#64748b">${escapeHtml(value(abstractTranslation.translatorNote, "AI辅助翻译，请以英文原摘要为准。"))}</p>` : `<p>${paragraph(null)}</p>`}
    ${heading("06｜英文原摘要")}<p lang="en">${paragraph(article.abstract, "PubMed当前未提供英文摘要。")}</p>
    ${heading("07｜研究设计与PICO")}${labeled("研究背景", article.background)}<p><b>研究设计：</b>${paragraph(article.studyType)}<br><b>P：</b>${paragraph(pico.population)}<br><b>I：</b>${paragraph(pico.intervention)}<br><b>C：</b>${paragraph(pico.comparison)}<br><b>O：</b>${paragraph(pico.outcome)}</p>
    ${heading("08｜研究方法详解")}${methodology ? `
      ${labeled("研究问题", methodology.researchQuestion)}
      ${labeled("设计与问题的匹配", methodology.designFit)}
      ${labeled("纳入与排除", methodology.eligibility)}
      ${labeled("随机化", methodology.randomization)}
      ${labeled("分配隐藏", methodology.allocationConcealment)}
      ${labeled("盲法", methodology.blinding)}
      ${labeled("样本量规划", methodology.sampleSizePlanning)}
      ${labeled("随访", methodology.followUp)}
      ${labeled("分析集", methodology.analysisPopulation)}
      ${labeled("缺失数据", methodology.missingData)}
      <b>方法学优势</b>${list(methodology.strengths)}
      <b>方法学关注点</b>${list(methodology.concerns)}` : `<p>${paragraph(null)}</p>`}
    ${heading("09｜统计方法简介")}${statistics ? `${statisticsHtml}
      ${labeled("调整变量", statistics.adjustedVariables)}
      ${labeled("多重比较", statistics.multiplicity)}
      ${labeled("亚组分析", statistics.subgroupAnalysis)}` : `<p>${paragraph(null)}</p>`}
    ${heading("10｜详细结果")}
    ${labeled("样本量", article.sampleSize)}
    ${labeled("主要终点", article.primaryOutcome)}
    ${labeled("主要结果", outcomes?.primary || article.results)}
    ${labeled("效应量", value(article.effectSize))}
    ${labeled("95%CI", value(article.confidenceInterval))}
    ${labeled("P值", value(article.pValue))}
    ${outcomes ? `${labeled("次要结局", value(outcomes.secondary))}
      ${labeled("安全性", outcomes.safety)}
      ${labeled("绝对效应与相对效应", outcomes.absoluteVsRelative)}
      ${labeled("亚组与交互作用", outcomes.subgroupAndInteraction)}
      ${labeled("敏感性分析", outcomes.sensitivity)}` : ""}
    ${heading("11｜统计学意义与临床意义")}${labeled("综合判断", statistics?.clinicalVsStatisticalSignificance)}
    ${heading("12｜优势、局限与偏倚风险")}${appraisal ? `
      <b>主要优势</b>${list(appraisal.strengths)}
      <b>主要局限</b>${list(appraisal.limitations)}
      <b>偏倚风险</b>${list(appraisal.biasRisks)}
      ${labeled("证据可信度", appraisal.certainty)}
      ${labeled("结论与数据是否匹配", appraisal.conclusionAlignment)}
      ${labeled("因果边界", appraisal.causalBoundary)}` : list(article.limitations)}
    ${heading("13｜适用与不适用范围")}${translation ? `
      <b>适用范围</b>${list(translation.applicability)}
      <b>不可直接外推</b>${list(translation.nonApplicability)}` : `<p>${paragraph(null)}</p>`}
    ${heading("14｜是否改变当前实践")}${labeled("实践改变判断", translation?.practiceChange || article.clinical)}
    ${heading("15｜当前可以做什么、不能得出什么")}${translation ? `
      <b>当前可以做什么</b>${list(translation.canDoNow)}
      <b>当前不能据此得出什么</b>${list(translation.cannotConclude)}` : list(article.practice || article.clinical)}
    ${heading("16｜证据缺口")}${list(translation?.evidenceGaps)}
    ${heading("17｜期刊影响因子")}
    <p><b>期刊：</b>${escapeHtml(value(article.journal))}<br>
    <b>影响因子：</b>${typeof metric?.impactFactor === "number" ? `${escapeHtml(metric.impactFactor)}${metric.metricYear ? `（${escapeHtml(metric.metricYear)}年度）` : ""}` : "未核验"}<br>
    <b>指标核验：</b>${escapeHtml(value(metric?.verifiedAt, "未提供核验日期"))}${metric?.source ? ` · ${externalLink(metric.source, "指标来源")}` : ""}</p>
    ${heading("18｜文献标识与原文入口")}
    <p><b>PMID：</b>${escapeHtml(value(article.pmid, "无"))}<br><b>DOI：</b>${escapeHtml(value(article.doi, "PubMed未提供"))}</p>
    <p style="word-break:break-word">${links || "当前未发现可用原文入口。"}</p>
  </section>`;
}

export function buildButtondownEmail(edition) {
  const editionId = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(edition.generatedAt));
  const searchNote = edition.search?.expanded
    ? `最近${edition.search.initialDays || 30}天不足目标构成，已扩展至过去${edition.search.actualDays || 180}天，并按影响因子优先选择。`
    : `检索范围为最近${edition.search?.initialDays || 30}天。`;
  const body = `<!-- buttondown-editor-mode: fancy -->
  <div style="max-width:680px;margin:0 auto;color:#17324d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Microsoft YaHei',sans-serif;line-height:1.75">
    <header style="padding:28px;background:#0b5f9e;color:#fff;border-radius:10px">
      <div style="font-size:12px;letter-spacing:1px">ANESTHESIA LITERATURE DAILY</div>
      <h1 style="font-size:28px;margin:8px 0">每日麻醉文献精读</h1>
      <p style="margin:0">${editionId} · ${edition.articles.length}篇 · ${escapeHtml(searchNote)}</p>
    </header>
    ${edition.articles.map(articleHtml).join("\n")}
    <footer style="margin-top:28px;padding:18px;background:#f8fafc;color:#64748b;font-size:13px">
      <p>内容仅供医学教育与学术交流，不能替代完整原文阅读、机构规范或临床判断。</p>
      <p>订阅管理和退订入口由Buttondown自动附加在邮件底部。</p>
    </footer>
  </div>`;
  return {
    editionId,
    subject: `${editionId} 每日麻醉文献精读（${edition.articles.length}篇）`,
    slug: `anesthesia-literature-daily-${editionId}`,
    description: `${editionId}精选${edition.articles.length}篇真实麻醉学相关文献，提供结构化中文精读。`,
    body,
  };
}
