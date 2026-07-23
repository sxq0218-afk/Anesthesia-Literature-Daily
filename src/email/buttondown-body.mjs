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

function articleHtml(article, index) {
  const pico = article.pico || {};
  const links = [
    externalLink(article.urls?.pubmed, "PubMed"),
    externalLink(article.urls?.doi, "DOI"),
    externalLink(article.urls?.publisher, "出版社原文"),
    externalLink(article.urls?.openFullText, "合法免费全文"),
  ].filter(Boolean).join(" · ");
  return `<section style="padding:24px 0;border-bottom:1px solid #dbe7ef">
    <div style="font-size:13px;color:#0b5f9e;font-weight:700">${String(index + 1).padStart(2, "0")} · ${escapeHtml(value(article.category, "麻醉学"))}</div>
    <h2 style="font-size:22px;line-height:1.45;margin:8px 0;color:#17324d">${escapeHtml(value(article.title))}</h2>
    <p style="font-size:14px;color:#64748b;line-height:1.6;word-break:break-word">${escapeHtml(value(article.originalTitle))}</p>
    <p><b>${escapeHtml(value(article.journal))}</b> · ${escapeHtml(value(article.publishedDate))} · ${escapeHtml(value(article.studyType))}</p>
    <div style="padding:14px 16px;background:#eef6fb;border-left:4px solid #0b5f9e"><b>一句话结论</b><br>${escapeHtml(value(article.conclusion))}</div>
    <h3>为什么值得关注</h3><p>${escapeHtml(value(article.whyItMatters))}</p>
    <h3>PICO</h3><p><b>P：</b>${escapeHtml(value(pico.population))}<br><b>I：</b>${escapeHtml(value(pico.intervention))}<br><b>C：</b>${escapeHtml(value(pico.comparison))}<br><b>O：</b>${escapeHtml(value(pico.outcome))}</p>
    <h3>研究与结果</h3><p><b>样本量：</b>${escapeHtml(value(article.sampleSize))}<br><b>主要终点：</b>${escapeHtml(value(article.primaryOutcome))}<br><b>主要结果：</b>${escapeHtml(value(article.results))}<br><b>效应量：</b>${escapeHtml(value(article.effectSize))}<br><b>95%CI：</b>${escapeHtml(value(article.confidenceInterval))}<br><b>P值：</b>${escapeHtml(value(article.pValue))}</p>
    <h3>临床麻醉启示</h3><p>${escapeHtml(value(article.clinical || article.practice))}</p>
    <h3>研究局限</h3><p>${escapeHtml(value(article.limitations))}</p>
    <p><b>分析依据：</b>${escapeHtml(value(article.analysisBasis))}</p>
    <p style="word-break:break-word">${links || "当前未发现可用原文入口。"}</p>
  </section>`;
}

export function buildButtondownEmail(edition, options = {}) {
  const editionId = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(edition.generatedAt));
  const searchNote = edition.search?.expanded
    ? `优先检索最近${edition.search.initialDays}天；条件不足时已扩展至过去${edition.search.actualDays}天，近${edition.search.initialDays}天文献仍优先。`
    : `检索范围为最近${edition.search?.initialDays || 30}天。`;
  const siteLink = options.siteUrl ? `<p style="margin:26px 0"><a href="${escapeHtml(options.siteUrl)}" style="display:inline-block;padding:12px 18px;background:#0b5f9e;color:#fff;text-decoration:none;border-radius:6px">查看网站版</a></p>` : "";
  const body = `<!-- buttondown-editor-mode: fancy -->
  <div style="max-width:680px;margin:0 auto;color:#17324d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Microsoft YaHei',sans-serif;line-height:1.75">
    <header style="padding:28px;background:#0b5f9e;color:#fff;border-radius:10px">
      <div style="font-size:12px;letter-spacing:1px">ANESTHESIA LITERATURE DAILY</div>
      <h1 style="font-size:28px;margin:8px 0">每日麻醉文献精读</h1>
      <p style="margin:0">${editionId} · ${edition.articles.length}篇 · ${escapeHtml(searchNote)}</p>
    </header>
    ${edition.articles.map(articleHtml).join("\n")}
    ${siteLink}
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
