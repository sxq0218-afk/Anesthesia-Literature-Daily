const METHODS = [
  {
    id: "t-test",
    name: "t检验",
    pattern: /\b(?:student'?s?\s+)?t[- ]?test\b/i,
    explanation: "比较两组连续变量均值；解释时需关注数据分布、方差假设、组间差值和置信区间。",
  },
  {
    id: "chi-square",
    name: "卡方检验",
    pattern: /\bchi[- ]?square\b|χ2|χ²/i,
    explanation: "比较分类变量的频数或比例；样本量较小时通常需要考虑精确检验。",
  },
  {
    id: "anova",
    name: "方差分析",
    pattern: /\b(?:anova|analysis of variance)\b/i,
    explanation: "比较三个或以上组的均值，或分析多个因素；总体差异显著后仍需合理的事后比较。",
  },
  {
    id: "linear-regression",
    name: "线性回归",
    pattern: /\blinear regression\b/i,
    explanation: "估计自变量与连续结局之间的关系；系数含义取决于变量单位和模型调整方式。",
  },
  {
    id: "logistic-regression",
    name: "Logistic回归",
    pattern: /\blogistic regression\b/i,
    explanation: "分析二分类结局并常以比值比表示关联；比值比不能在结局常见时直接当作风险比。",
  },
  {
    id: "cox-regression",
    name: "Cox比例风险回归",
    pattern: /\bcox\b|\bproportional hazards?\b/i,
    explanation: "分析事件发生时间并估计风险比；需要关注比例风险假设、删失和随访完整性。",
  },
  {
    id: "mixed-effects",
    name: "混合效应模型",
    pattern: /\bmixed[- ]effects?\b|\bmixed model\b/i,
    explanation: "处理重复测量、中心或个体内相关性，同时估计固定效应和随机效应。",
  },
  {
    id: "gee",
    name: "广义估计方程",
    pattern: /\bgeneralized estimating equations?\b|\bgee\b/i,
    explanation: "分析相关或重复测量数据，估计总体平均效应；需关注相关结构和稳健标准误。",
  },
  {
    id: "propensity-score",
    name: "倾向评分方法",
    pattern: /\bpropensity[- ]score\b/i,
    explanation: "在观察性研究中平衡已测量混杂因素；不能消除未测量或错误测量的混杂。",
  },
  {
    id: "mediation",
    name: "中介分析",
    pattern: /\bmediat(?:ion|or|ed)\b/i,
    explanation: "评估某变量是否可能位于暴露与结局之间的路径；显著关联本身不能证明中介或因果机制。",
  },
  {
    id: "interaction",
    name: "交互作用分析",
    pattern: /\binteraction\b|\beffect modification\b/i,
    explanation: "检验一个因素的效应是否随另一因素而变化；应区分预设交互与探索性亚组发现。",
  },
  {
    id: "noninferiority",
    name: "非劣效分析",
    pattern: /\bnon[- ]?inferior/i,
    explanation: "判断新方案的效果是否未差于预设界值；结论依赖界值合理性及意向性和符合方案分析的一致性。",
  },
  {
    id: "meta-random-effects",
    name: "随机效应Meta分析",
    pattern: /\brandom[- ]effects?\b/i,
    explanation: "汇总允许真实效应在研究间不同的证据；需结合异质性、预测区间和研究质量解释。",
  },
  {
    id: "survival-analysis",
    name: "生存分析",
    pattern: /\bkaplan[- ]meier\b|\blog[- ]rank\b|\bsurvival analysis\b/i,
    explanation: "分析随时间发生的事件并处理删失；需要关注随访完整性及风险随时间变化。",
  },
  {
    id: "bootstrap",
    name: "Bootstrap内部验证",
    pattern: /\bbootstrap/i,
    explanation: "通过重复重采样评估估计值或模型性能的不确定性，也常用于校正内部验证中的乐观偏倚。",
  },
];

export function statisticalMethodReferences(sourceText = "") {
  return METHODS
    .filter(method => method.pattern.test(String(sourceText)))
    .map(({ id, name, explanation }) => ({ id, name, explanation }));
}

export function enrichStatisticalMethods(statistics = {}, sourceText = "") {
  const references = statisticalMethodReferences(sourceText);
  const byId = new Map(references.map(item => [item.id, item]));
  return {
    ...statistics,
    methods: (statistics.methods || []).map(method => ({
      ...method,
      standardExplanation: byId.get(method.referenceId)?.explanation
        || method.standardExplanation
        || "该方法的准确含义需结合论文报告的模型、变量和假设判断。",
    })),
  };
}

