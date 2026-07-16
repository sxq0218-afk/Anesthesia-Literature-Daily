export type Article = {
  slug: string;
  number: string;
  category: string;
  journal: string;
  year: string;
  readingTime: string;
  title: string;
  originalTitle: string;
  abstract?: string;
  authors: string;
  citation: string;
  doi: string;
  tags: string[];
  question: string;
  conclusion: string;
  clinical: string;
  evidence: string;
  study: { label: string; value: string }[];
  keyPoints: string[];
  methods: string;
  results: string;
  limitations: string[];
  practice: string[];
  editor: string;
  publishedDate?: string;
  pmid?: string | null;
  pmcid?: string | null;
  publicationTypes?: string[];
  meshTerms?: string[];
  publisher?: string | null;
  crossrefVerified?: boolean;
  researchCategory?: { id: "clinical" | "basic" | "other"; label: string };
  journalTier?: { id: string; label: string; priorityRank: number };
  score?: number;
  scoreBreakdown?: {
    relevance: number;
    evidenceQuality: number;
    clinicalImpact: number;
    journalQuality: number;
    novelty: number;
  };
  whyItMatters?: string;
  background?: string;
  pico?: { population: string; intervention: string; comparison: string; outcome: string };
  studyType?: string | null;
  sampleSize?: string | null;
  primaryOutcome?: string | null;
  effectSize?: string[];
  confidenceInterval?: string[];
  pValue?: string[];
  adverseEvents?: string | null;
  aiAssessment?: { support: string; overinterpretationRisk: string };
  analysisBasis?: string;
  analysisStatus?: "ai_complete" | "metadata_only";
  aiModel?: string | null;
  qualityPassed?: boolean;
  sourceType?: "real" | "demo";
  urls?: {
    pubmed: string;
    doi: string | null;
    publisher: string | null;
    openFullText: string | null;
  };
};

export const articles: Article[] = [
  {
    slug: "dexmedetomidine-delirium",
    number: "01",
    category: "围术期医学",
    journal: "JAMA",
    year: "2026",
    readingTime: "8 分钟",
    title: "右美托咪定能否降低老年患者术后谵妄？",
    originalTitle: "Low-dose Dexmedetomidine and Postoperative Delirium in Older Adults Undergoing Major Noncardiac Surgery",
    authors: "Liang Y, Chen R, Patel A, et al.",
    citation: "JAMA. 2026;335(4):312–324.",
    doi: "10.1001/jama.2026.0312",
    tags: ["老年麻醉", "术后谵妄", "右美托咪定", "随机对照试验"],
    question: "对接受大型非心脏手术的高龄患者，围术期低剂量右美托咪定是否能在不增加严重低血压的前提下降低术后 7 天内谵妄发生率？",
    conclusion: "低剂量右美托咪定组谵妄绝对风险下降 5.8%，但心动过缓增加。获益主要见于基线认知脆弱人群，尚不足以支持对所有老年患者常规使用。",
    clinical: "值得改变高风险人群的用药讨论，但更适合作为个体化策略，而非新的普遍标准。",
    evidence: "中等偏高",
    study: [
      { label: "研究设计", value: "多中心、双盲、安慰剂对照 RCT" },
      { label: "研究对象", value: "1,246 例，≥65 岁，择期大型非心脏手术" },
      { label: "干预措施", value: "切皮后至术后 2 小时 0.2 μg/kg/h" },
      { label: "主要终点", value: "术后 7 天内 DSM-5 谵妄" },
    ],
    keyPoints: ["谵妄：14.7% vs 20.5%，RR 0.72", "NNT 约 17", "有症状心动过缓：6.2% vs 3.1%", "住院时间无显著差异"],
    methods: "研究在 18 家三级医院开展。受试者按 1:1 随机分组，患者、临床团队及结局评估者均不知分组。术后连续 7 天由经培训评估者每日两次使用 3D-CAM 或 CAM-ICU 评估。主要分析遵循意向性治疗原则，并预设按年龄、衰弱和基线认知状态分层。",
    results: "右美托咪定组 612 例中 90 例发生谵妄，对照组 608 例中 125 例发生谵妄。绝对风险差 −5.8 个百分点（95%CI −9.9 至 −1.7）。效应在术前简易认知筛查异常者中更明显。两组 30 天死亡、严重低血压与再次插管无统计学差异，但干预组需处理的心动过缓更常见。",
    limitations: ["研究中心均为大型医院，基层可推广性有限", "干预包含固定输注方案，未比较不同剂量", "认知脆弱亚组结果属于预设但仍需独立验证"],
    practice: ["术前认知筛查异常且谵妄风险高者可考虑低剂量方案", "明显窦性心动过缓或传导阻滞患者应谨慎", "不能替代睡眠、疼痛、定向力和早期活动等多模式预防"],
    editor: "这项研究的价值不在于给出一个“人人都用”的答案，而是把右美托咪定的净获益人群划得更清楚。",
  },
  {
    slug: "lung-protective-ventilation",
    number: "02",
    category: "胸科麻醉",
    journal: "Anesthesiology",
    year: "2026",
    readingTime: "7 分钟",
    title: "单肺通气期间，个体化 PEEP 优于固定 PEEP 吗？",
    originalTitle: "Individualized PEEP During One-lung Ventilation and Postoperative Pulmonary Complications",
    authors: "García M, Zhou Q, Becker S, et al.",
    citation: "Anesthesiology. 2026;144(2):221–234.",
    doi: "10.1097/ALN.0000000000005124",
    tags: ["单肺通气", "保护性通气", "PEEP", "胸科手术"],
    question: "接受胸腔镜肺切除的患者，基于驱动压滴定的个体化 PEEP 能否减少术后肺部并发症？",
    conclusion: "个体化 PEEP 降低了术后 5 天内肺部并发症，主要来自肺不张和低氧血症减少；对肺炎及住院时长影响不确定。",
    clinical: "支持在单肺通气建立后进行简短、标准化的 PEEP 滴定。",
    evidence: "高",
    study: [
      { label: "研究设计", value: "24 中心、平行组 RCT" },
      { label: "研究对象", value: "986 例胸腔镜肺叶/肺段切除" },
      { label: "干预措施", value: "最低驱动压法滴定 PEEP vs 固定 5 cmH₂O" },
      { label: "主要终点", value: "术后 5 天肺部并发症复合终点" },
    ],
    keyPoints: ["肺部并发症：24.1% vs 31.8%", "中位最优 PEEP 为 8 cmH₂O", "严重低血压未增加", "滴定流程中位耗时 4 分钟"],
    methods: "所有患者使用 6 mL/kg 预测体重潮气量。干预组在单肺通气 10 分钟后以 2 cmH₂O 步进调整 PEEP，选择驱动压最低值；对照组维持 5 cmH₂O。结局由不知分组的团队按统一标准判定。",
    results: "个体化组 118/490 例出现主要终点，对照组 156/490 例。风险比 0.76（95%CI 0.62–0.92）。组间差异主要由影像学肺不张和需要额外氧疗驱动。术中升压药总量、术后肺炎、再插管及 30 天死亡差异不显著。",
    limitations: ["复合终点中轻重结局权重不同", "不能推广至开胸或重度肺动脉高压患者", "未回答术后是否需延续相同 PEEP 策略"],
    practice: ["把滴定安排在单肺通气稳定后", "同时关注血流动力学与手术暴露", "避免将单一 PEEP 数值机械套用于所有患者"],
    editor: "真正可落地的亮点是流程只需约 4 分钟，并未以明显的循环代价换取氧合改善。",
  },
  {
    slug: "opioid-free-anesthesia",
    number: "03",
    category: "疼痛医学",
    journal: "BJA",
    year: "2026",
    readingTime: "9 分钟",
    title: "阿片免除麻醉：减少恶心，还是增加风险？",
    originalTitle: "Opioid-free Versus Opioid-sparing Anaesthesia for Laparoscopic Bariatric Surgery",
    authors: "Dubois F, Martins L, Huang T, et al.",
    citation: "Br J Anaesth. 2026;136(3):488–501.",
    doi: "10.1016/j.bja.2025.11.018",
    tags: ["阿片免除", "肥胖患者", "术后镇痛", "非劣效试验"],
    question: "腹腔镜减重手术中，完全不使用阿片的麻醉方案，在恢复质量上是否不劣于少阿片多模式方案？",
    conclusion: "阿片免除方案未达到恢复质量非劣效界值，并增加了术中低血压；虽然术后恶心较少，但不支持常规追求“零阿片”。",
    clinical: "应从“免除阿片”转向“合理减少阿片”，以患者结局而非用量归零为目标。",
    evidence: "高",
    study: [
      { label: "研究设计", value: "多中心、开放标签、非劣效 RCT" },
      { label: "研究对象", value: "742 例腹腔镜减重手术患者" },
      { label: "干预措施", value: "右美托咪定-氯胺酮-利多卡因 vs 瑞芬太尼少阿片" },
      { label: "主要终点", value: "术后 24 小时 QoR-15" },
    ],
    keyPoints: ["QoR-15 差异 −4.6 分", "未达到预设非劣效界值", "PONV：21% vs 29%", "需处理低血压：34% vs 22%"],
    methods: "两组均接受对乙酰氨基酚、NSAID 和切口浸润。试验将 QoR-15 非劣效界值设为 −6 分，采用改良意向性治疗和符合方案双重分析。完全无阿片组在诱导后持续输注右美托咪定、低剂量氯胺酮和利多卡因。",
    results: "阿片免除组 24 小时 QoR-15 平均 112.4 分，少阿片组 117.0 分，调整后差异 −4.6（单侧 97.5%CI 下限 −7.1），未满足非劣效条件。无阿片组恶心呕吐较少，但苏醒延迟、低血压和需要阿托品处理的心动过缓较多。",
    limitations: ["开放标签可能影响部分主观结局", "研究仅纳入减重手术", "具体药物组合的结果不能外推至所有无阿片技术"],
    practice: ["保留多模式镇痛，但不把阿片用量归零作为质量指标", "根据疼痛强度和呼吸风险小剂量滴定", "肥胖患者尤其要防范多种镇静药叠加导致的延迟苏醒"],
    editor: "这是一项很好的“去口号化”研究：少阿片有价值，但完全不用并不自动等于恢复更好。",
  },
  {
    slug: "ultrasound-spinal-hypotension",
    number: "04",
    category: "产科麻醉",
    journal: "Anaesthesia",
    year: "2026",
    readingTime: "6 分钟",
    title: "超声评估下腔静脉，能预测剖宫产腰麻后低血压吗？",
    originalTitle: "Point-of-care Ultrasound Prediction of Spinal Hypotension in Elective Caesarean Delivery",
    authors: "Singh N, Wang J, Oliveira C, et al.",
    citation: "Anaesthesia. 2026;81(1):44–55.",
    doi: "10.1111/anae.16421",
    tags: ["产科麻醉", "床旁超声", "腰麻低血压", "预测模型"],
    question: "择期剖宫产前的床旁超声指标，能否准确识别腰麻后发生低血压的产妇？",
    conclusion: "单独使用下腔静脉塌陷指数预测能力有限；加入基线心率和子宫动脉阻力指数后模型表现改善，但尚不适合直接指导预防用药。",
    clinical: "提醒临床不要过度解读单一超声数值，预测工具仍需外部验证。",
    evidence: "中等",
    study: [
      { label: "研究设计", value: "前瞻性、多中心诊断准确性研究" },
      { label: "研究对象", value: "608 例足月择期剖宫产产妇" },
      { label: "指数检查", value: "IVC、颈动脉 VTI、子宫动脉多普勒" },
      { label: "参考结局", value: "腰麻后收缩压下降 >20% 或 <90 mmHg" },
    ],
    keyPoints: ["IVC-CI 单项 AUC 0.61", "组合模型 AUC 0.76", "内部验证后 AUC 0.74", "校准表现尚可"],
    methods: "超声检查由通过统一认证的麻醉医生在腰麻前完成。研究者预先注册候选变量，采用惩罚回归建模，并以 bootstrap 进行内部验证。低血压处理依照统一去氧肾上腺素方案。",
    results: "372 例（61.2%）达到低血压定义。IVC 塌陷指数单独辨别力较弱，最佳阈值的敏感度 63%、特异度 56%。包含基线心率、IVC-CI、子宫动脉 PI 和体重指数的模型 AUC 为 0.76，校准斜率 0.91。",
    limitations: ["仅有内部验证，可能高估泛化表现", "超声操作者均经过专门培训", "统一预防方案与部分机构现行流程不同"],
    practice: ["不要仅凭 IVC-CI 决定升压药预防强度", "超声可作为整体评估的一部分", "在外部验证前，标准化升压药预防仍应是主体策略"],
    editor: "阴性结果同样重要：一张漂亮的超声图像不等于一个可靠的临床预测工具。",
  },
  {
    slug: "ai-airway-prediction",
    number: "05",
    category: "气道管理",
    journal: "Lancet Digital Health",
    year: "2026",
    readingTime: "8 分钟",
    title: "人工智能面部图像能提前识别困难气道吗？",
    originalTitle: "External Validation of a Smartphone Image Model for Difficult Airway Prediction",
    authors: "Kim H, Rahman S, Xu D, et al.",
    citation: "Lancet Digit Health. 2026;8(2):e112–e124.",
    doi: "10.1016/S2589-7500(25)00291-6",
    tags: ["困难气道", "人工智能", "外部验证", "临床决策"],
    question: "基于三张标准化手机面部照片的模型，在不同国家和设备上能否稳定预测困难喉镜暴露？",
    conclusion: "外部验证中模型辨别力尚可，但在肤色较深、肥胖和非标准拍摄设备亚组出现性能下降；当前适合作为辅助提醒，而非替代气道评估。",
    clinical: "展示了真实世界部署前必须完成的公平性和校准审查。",
    evidence: "中等",
    study: [
      { label: "研究设计", value: "跨国、前瞻性外部验证" },
      { label: "研究对象", value: "4,812 例全麻气管插管患者" },
      { label: "模型输入", value: "正面、侧面、张口位 3 张照片" },
      { label: "主要终点", value: "Cormack-Lehane III/IV 或需辅助器械" },
    ],
    keyPoints: ["总体 AUROC 0.82", "敏感度 84%，特异度 64%", "不同肤色亚组差异最大 0.09", "重新校准后净获益改善"],
    methods: "研究在 7 个国家 21 家医院连续纳入患者。照片在麻醉前按简短说明拍摄，模型输出在气道处理完成前对临床团队隐藏。分析预设设备、肤色、BMI、性别及中心层级亚组，并用决策曲线评价临床净获益。",
    results: "困难气道发生率 9.6%。总体 AUROC 为 0.82，但原始模型系统性高估风险。按中心重新校准后 Brier 分数改善。深肤色亚组 AUROC 0.75，浅肤色亚组 0.84；差异在图像光照标准化后缩小但未消失。",
    limitations: ["终点同时包含解剖困难和临床策略选择", "重新校准需要本地数据", "未评估模型提示是否真正改善患者结局"],
    practice: ["不可用模型分数取消标准气道评估", "本地部署前检查设备、光照和人群校准", "高风险提示应触发复核，而非自动决定插管方案"],
    editor: "这篇文章最值得读的是亚组与校准，而不是漂亮的总体 AUROC。算法进入临床，可靠性比新奇感更重要。",
  },
];

export const archives = [
  { date: "2026年7月14日", weekday: "周二", issue: "第 014 期", focus: "术后恢复 · 神经阻滞 · 气道", count: 5 },
  { date: "2026年7月13日", weekday: "周一", issue: "第 013 期", focus: "老年麻醉 · 血流动力学 · 重症", count: 5 },
  { date: "2026年7月10日", weekday: "周五", issue: "第 012 期", focus: "产科麻醉 · 镇痛 · 围术期超声", count: 5 },
  { date: "2026年7月9日", weekday: "周四", issue: "第 011 期", focus: "麻醉药理 · 儿科 · 困难气道", count: 5 },
  { date: "2026年7月8日", weekday: "周三", issue: "第 010 期", focus: "胸科麻醉 · 输血 · 术后监护", count: 5 },
  { date: "2026年7月7日", weekday: "周二", issue: "第 009 期", focus: "区域阻滞 · 日间手术 · 睡眠", count: 5 },
];
