"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_AI_ADMIN_API_URL || "http://127.0.0.1:4317";
type Summary = { calls: number; successfulCalls: number; failedCalls: number; promptTokens: number; completionTokens: number; totalTokens: number; estimatedCostCny: number };
type Entry = { timestamp: string; provider: string; model: string; task: string; status: string; promptTokens: number; completionTokens: number; totalTokens: number; estimatedCostCny: number; latencyMs: number };
type UsageData = { usage: { today: Summary; month: Summary; recent: Entry[] }; pricing: { input: number; output: number; notice: string }; settings: { provider: string; model: string; dailyCallLimit: number; dailyTokenLimit: number } };
const nf = new Intl.NumberFormat("zh-CN");

export default function AIUsageClient() {
  const [data, setData] = useState<UsageData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch(`${API_URL}/api/ai/usage`, { cache: "no-store" }).then(response => response.ok ? response.json() : Promise.reject()).then(setData).catch(() => setError("无法连接本地AI统计服务。")); }, []);
  if (error) return <div className="admin-message error">{error}</div>;
  if (!data) return <div className="admin-loading">正在汇总Token记录…</div>;
  const cards = [{ label: "今日", value: data.usage.today }, { label: "本月", value: data.usage.month }];
  return <div className="admin-stack">
    <section className="usage-grid">{cards.map(card => <div className="admin-card usage-card" key={card.label}><div className="eyebrow">{card.label === "今日" ? "TODAY" : "THIS MONTH"}</div><h2>{card.label}用量</h2><strong>{nf.format(card.value.totalTokens)} <small>Token</small></strong><dl><div><dt>调用次数</dt><dd>{card.value.calls}</dd></div><div><dt>输入 / 输出</dt><dd>{nf.format(card.value.promptTokens)} / {nf.format(card.value.completionTokens)}</dd></div><div><dt>失败调用</dt><dd>{card.value.failedCalls}</dd></div><div><dt>预计费用</dt><dd>¥{card.value.estimatedCostCny.toFixed(4)}</dd></div></dl></div>)}</section>
    <section className="admin-card"><div className="admin-card-heading"><div><div className="eyebrow">RECENT CALLS</div><h2>最近调用记录</h2></div><Link href="/admin/ai" className="text-link">返回模型配置</Link></div>
      {data.usage.recent.length ? <div className="usage-table-wrap"><table className="usage-table"><thead><tr><th>时间</th><th>模型</th><th>任务</th><th>Token</th><th>费用</th><th>状态</th></tr></thead><tbody>{data.usage.recent.map((entry, index) => <tr key={`${entry.timestamp}-${index}`}><td>{new Date(entry.timestamp).toLocaleString("zh-CN")}</td><td>{entry.provider}<small>{entry.model}</small></td><td>{entry.task}</td><td>{nf.format(entry.totalTokens)}</td><td>¥{Number(entry.estimatedCostCny || 0).toFixed(4)}</td><td><span className={`usage-status ${entry.status}`}>{entry.status === "success" ? "成功" : "失败"}</span></td></tr>)}</tbody></table></div> : <div className="empty-usage"><strong>还没有AI调用记录</strong><p>保存API Key并运行“测试AI连接”后，这里会显示第一条记录。</p></div>}
    </section>
    <p className="pricing-note">当前模型：{data.settings.provider} / {data.settings.model}。每日上限 {data.settings.dailyCallLimit} 次、{nf.format(data.settings.dailyTokenLimit)} Token。{data.pricing.notice}</p>
  </div>;
}
