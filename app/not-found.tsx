import Link from "next/link";

export default function NotFound() { return <section className="success-wrap"><div className="success-card"><div className="eyebrow">404</div><h1>没有找到这个页面</h1><p>链接可能已更新，或这期内容仍在整理中。</p><Link href="/" className="button primary">返回首页</Link></div></section>; }
