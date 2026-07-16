import Link from "next/link";
import { PageHero } from "../components";

export const metadata = { title: "RSS订阅说明" };

export default function RssPage() {
  return <><PageHero eyebrow="RSS 2.0" title="无需注册的每日更新" description="RSS是一种开放订阅格式。您可以把本站地址添加到任意支持RSS 2.0的阅读器，不需要提交邮箱或个人信息。" /><section className="content-section"><div className="shell narrow prose">
    <h2>RSS地址</h2><div className="rss-address"><code>/rss.xml</code><a className="button primary" href="/rss.xml">打开RSS</a></div>
    <h2>如何添加</h2><ol><li>在浏览器打开上面的RSS地址并复制完整网址。</li><li>打开您常用的RSS阅读器，选择“添加订阅”“通过网址订阅”或类似入口。</li><li>粘贴网址并确认。以后每次正式发布后会出现一条新简报。</li></ol>
    <h2>中国网络环境建议</h2><p>优先选择可以直接添加自定义RSS地址、且无需依赖特定海外同步服务的本地或自托管阅读方式。不同软件和网络环境差异较大，本站不在代码中依赖任何特定阅读平台。</p>
    <h2>收录内容</h2><p>每条RSS包含发布日期、本期标题、实际入选文章标题、一句话结论和本站详情页。RSS不会包含付费期刊全文，也不会重复生成同一期。</p>
    <p><Link href="/archive" className="text-link">查看往期简报 →</Link></p>
  </div></section></>;
}
