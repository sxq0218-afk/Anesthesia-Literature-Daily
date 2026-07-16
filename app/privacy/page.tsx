import { PageHero } from "../components";

export const metadata = { title: "隐私说明" };

export default function PrivacyPage() {
  return <><PageHero eyebrow="PRIVACY" title="隐私说明" description="更新日期：2026年7月16日。本说明适用于“每日麻醉文献精读”公开测试站。" /><section className="content-section"><div className="shell narrow prose">
    <h2>不建立用户账户</h2><p>公开测试站不提供注册、登录、收藏或评论。邮件订阅仅收集订阅者主动发送的邮箱地址、订阅确认状态、退订状态和最近发送期次，不收集姓名、病历或患者信息。</p>
    <h2>邮件订阅数据</h2><p>订阅采用二次确认：首次发送订阅邮件后，必须再次确认才会启用。订阅名单使用AES-256-GCM加密后保存，解密密钥仅存放在GitHub Actions Secrets；公开网页、公开JSON和任务日志不会显示邮箱地址。退订后保留必要的退订状态以避免再次误发。</p>
    <h2>外部医学数据请求</h2><p>运行每日任务时，项目会向 PubMed、PMC、Crossref 官方接口请求公开文献元数据。配置AI服务后，文献摘要或合法开放全文内容会发送给当前选定服务商用于结构化分析；不会发送患者信息或订阅页面输入。</p>
    <h2>匿名访问统计</h2><p>网站仅使用EdgeOne Makers平台能够提供的匿名汇总指标，用于了解请求量、页面路径、设备/浏览器类型以及平台合法提供的地区和运营商汇总。本站不加载Google Analytics或其他第三方统计脚本，不在页面显示模拟阅读量，不公开具体IP。</p>
    <h2>原文点击路径</h2><p>PubMed、DOI、出版社和合法开放全文按钮先经过本站的静态中转路径再立即跳转，便于在EdgeOne路径排行中查看匿名点击总量。中转页不写入Cookie、不识别用户身份、不插入广告。</p>
    <h2>密钥与后台任务</h2><p>公开Production模式的AI API Key、腾讯云API密钥、收件邮箱授权码和订阅名单加密密钥只保存在GitHub Actions Secrets。密钥不会进入HTML、前端JavaScript、公开JSON或构建日志。普通访客不能通过浏览器调用AI或邮件接口。</p>
    <h2>医学信息</h2><p>请勿通过任何站内页面提交病历、患者身份信息或其他敏感医疗数据。本站内容仅供医学教育与学术交流。</p>
  </div></section></>;
}
