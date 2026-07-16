import { PageHero } from "../components";

export const metadata = { title: "关于我们" };

export default function AboutPage() {
  return <><PageHero eyebrow="ABOUT THE PROJECT" title="让证据阅读更接近临床" description="每日麻醉文献精读是一个面向中文麻醉专业读者的医学文献简报原型。我们希望减少信息噪音，保留真正影响判断的证据细节。" /><section className="content-section"><div className="shell narrow prose">
    <h2>我们为什么做这件事</h2><p>临床医生并不缺少文献，缺少的是可持续的筛选、判断与理解时间。标题和摘要可以告诉我们“发生了什么”，却很少回答“结果有多可靠”“适用于谁”“是否值得改变实践”。本项目把这些问题放在每篇精读的中心。</p>
    <div className="principles"><div><b>临床问题优先</b><p>从真实决策出发，而不是从热点关键词出发。</p></div><div><b>方法透明</b><p>同时呈现效应、偏倚、局限和不确定性。</p></div><div><b>谨慎转化</b><p>区分“值得关注”与“应该立刻改变实践”。</p></div></div>
    <h2>系统如何工作</h2><p>每天的后台任务通过 NCBI E-utilities 检索 PubMed，使用 Crossref 验证 DOI，并通过 PMC 官方接口判断合法开放全文。候选文章经过 PMID、DOI 和标题相似度去重，再按专业相关性、证据质量、临床影响、期刊质量和新颖性评分。</p>
    <h2>AI分析边界</h2><p>配置当前AI模型后，系统先提取固定 JSON 字段，再生成中文精读，最后进行第二轮事实检查。没有 API Key 时不会伪造 AI 结果，页面会明确标记“AI精读待生成”。</p>
    <h2>自动发布边界</h2><p>只有PubMed检索、AI结构化分析、页面数据校验和第二轮事实检查全部成功后，简报才会进入正式历史。任一步失败都会保留上一期页面，不发布空白或不完整内容。</p>
    <h2>后续计划</h2><ul><li>增加专业人员审核、编辑与发布流程</li><li>根据小范围测试反馈改进选刊与评分规则</li><li>增加历史检索和主题筛选</li></ul>
    <div className="disclaimer">医学声明：内容仅用于医学教育和学术交流，不能替代机构规范、完整文献阅读或专业临床判断。</div>
  </div></section></>;
}
