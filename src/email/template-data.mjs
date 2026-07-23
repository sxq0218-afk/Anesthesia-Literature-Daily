function text(value, fallback = "当前可获取内容未提供该数据。") {
  return String(value || fallback).trim();
}

function pico(article) {
  const value = article.pico || {};
  return `P：${text(value.population || value.p)}\nI：${text(value.intervention || value.i)}\nC：${text(value.comparison || value.c)}\nO：${text(value.outcome || value.o)}`;
}

export function editionTemplateData(edition, options = {}) {
  const date = new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", year: "numeric", month: "long", day: "numeric" }).format(new Date(edition.generatedAt));
  const articles = edition.articles || [];
  const articleBlocks = articles.map((article, index) => ({
    number: index + 1,
    title: text(article.title),
    original_title: text(article.originalTitle),
    journal: text(article.journal),
    published_date: text(article.publishedDate),
    study_type: text(article.studyType),
    conclusion: text(article.conclusion),
    why_it_matters: text(article.whyItMatters),
    pico: pico(article),
    sample_size: text(article.sampleSize),
    primary_outcome: text(article.primaryOutcome),
    main_results: text(article.mainResults || article.results),
    clinical_implication: text(article.clinicalImplication || article.clinical || article.practice?.join("\n")),
    limitations: text(article.limitations || article.limitation),
    analysis_basis: text(article.analysisBasis),
    pubmed_url: text(article.urls?.pubmed, ""),
    doi_url: text(article.urls?.doi, ""),
    publisher_url: text(article.urls?.publisher, ""),
    free_full_text_url: text(article.urls?.freeFullText || article.urls?.openFullText, "当前未发现开放全文"),
  }));
  const flattened = {};
  for (let index = 0; index < 5; index += 1) {
    const article = articleBlocks[index] || {
      number: index + 1,
      title: "本期未增加更多文章",
      original_title: "未用低质量或无关文献凑数。",
      journal: "—",
      published_date: "—",
      study_type: "—",
      conclusion: "过去半年内达到质量门槛且未曾正式发布的文献不足，本期允许少于5篇。",
      why_it_matters: "—",
      pico: "—",
      sample_size: "—",
      primary_outcome: "—",
      main_results: "—",
      clinical_implication: "—",
      limitations: "—",
      analysis_basis: "—",
      pubmed_url: "",
      doi_url: "",
      publisher_url: "",
      free_full_text_url: "",
    };
    for (const [key, value] of Object.entries(article)) flattened[`article_${index + 1}_${key}`] = String(value ?? "");
  }
  return {
    kind: "daily",
    date,
    article_count: articles.length,
    expanded_note: edition.search?.expanded
      ? `优先检索最近${edition.search.initialDays}天；条件不足时已扩展至过去${edition.search.actualDays}天，近${edition.search.initialDays}天文献仍优先。`
      : `检索范围为最近${edition.search?.initialDays || 30}天。`,
    ...flattened,
    site_url: options.siteUrl || "",
    unsubscribe_subject: "退订每日麻醉文献精读",
    medical_disclaimer: "内容仅供医学教育与学术交流，不能替代临床判断。",
  };
}

export function noticeTemplateData({ kind, data = {}, inboxAddress = "" }) {
  const copy = {
    confirmation: { heading: "请确认您的订阅", message: "请点击下方按钮发送确认邮件。只有完成确认后，系统才会发送每日简报。" },
    welcome: { heading: "订阅成功", message: "您已完成确认。下一期正式简报生成后将发送到此邮箱。" },
    unsubscribed: { heading: "已完成退订", message: "该邮箱将不再接收每日简报。" },
  }[kind];
  const actions = {
    confirmation: { subject: data.confirmation_subject || "", label: "确认订阅" },
    welcome: { subject: "退订每日麻醉文献精读", label: "需要时可退订" },
    unsubscribed: { subject: "订阅每日麻醉文献精读", label: "重新订阅" },
  };
  const action = actions[kind] || actions.unsubscribed;
  return {
    kind,
    heading: copy?.heading || "每日麻醉文献精读",
    message: copy?.message || "",
    action_mailto: `mailto:${inboxAddress}?subject=${encodeURIComponent(action.subject)}`,
    action_label: action.label,
    confirmation_subject: action.subject,
    ...data,
  };
}
