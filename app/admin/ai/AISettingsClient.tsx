"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_AI_ADMIN_API_URL || "http://127.0.0.1:4317";

type Provider = { id: string; name: string; format: string; defaultBaseUrl: string; defaultModel: string };
type Settings = { provider: string; baseUrl: string; model: string; maskedApiKey: string; hasApiKey: boolean; dailyCallLimit: number; dailyTokenLimit: number; updatedAt?: string | null };
type Summary = { calls: number; successfulCalls: number; failedCalls: number; promptTokens: number; completionTokens: number; totalTokens: number; estimatedCostCny: number };
type Snapshot = { settings: Settings; providers: Provider[]; usage: { today: Summary; month: Summary }; pricing: { input: number; output: number; currency: string; notice: string } };

function formatTokens(value = 0) { return new Intl.NumberFormat("zh-CN").format(value); }
function formatCost(value = 0) { return `¥${value.toFixed(value > 0 && value < 0.01 ? 4 : 2)}`; }

export default function AISettingsClient() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [form, setForm] = useState({ provider: "deepseek", baseUrl: "", model: "", apiKey: "", dailyCallLimit: 30, dailyTokenLimit: 500000 });
  const [showKey, setShowKey] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);
  const [busy, setBusy] = useState<"save" | "test" | null>(null);

  async function load() {
    try {
      const response = await fetch(`${API_URL}/api/ai/settings`, { cache: "no-store" });
      if (!response.ok) throw new Error("无法读取AI配置");
      const data: Snapshot = await response.json();
      setSnapshot(data);
      setForm(current => ({ ...current, provider: data.settings.provider, baseUrl: data.settings.baseUrl, model: data.settings.model, apiKey: "", dailyCallLimit: data.settings.dailyCallLimit, dailyTokenLimit: data.settings.dailyTokenLimit }));
    } catch {
      setMessage({ kind: "error", text: "本地AI管理服务未连接。请使用 npm run dev 启动完整预览。" });
    }
  }

  useEffect(() => { void load(); }, []);
  const currentProvider = useMemo(() => snapshot?.providers.find(item => item.id === form.provider), [snapshot, form.provider]);

  function chooseProvider(providerId: string) {
    const preset = snapshot?.providers.find(item => item.id === providerId);
    setForm(current => ({ ...current, provider: providerId, baseUrl: preset?.defaultBaseUrl || current.baseUrl, model: preset?.defaultModel || current.model }));
  }

  async function save() {
    setBusy("save"); setMessage(null);
    try {
      const response = await fetch(`${API_URL}/api/ai/settings`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "保存失败");
      setMessage({ kind: "success", text: `已保存：${currentProvider?.name || form.provider} / ${form.model}` });
      await load();
    } catch (error) { setMessage({ kind: "error", text: error instanceof Error ? error.message : "保存失败" }); }
    finally { setBusy(null); }
  }

  async function testConnection() {
    setBusy("test"); setMessage({ kind: "info", text: "正在测试当前已保存的模型配置…" });
    try {
      const response = await fetch(`${API_URL}/api/ai/test`, { method: "POST" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "连接失败");
      setMessage({ kind: "success", text: `连接成功 · ${result.model} · ${result.latencyMs} ms · ${result.usage?.totalTokens ?? 0} Token` });
      await load();
    } catch (error) { setMessage({ kind: "error", text: `连接失败：${error instanceof Error ? error.message : "未知错误"}` }); }
    finally { setBusy(null); }
  }

  if (!snapshot) return <div className="admin-loading">正在读取本地AI配置…</div>;

  return <div className="admin-stack">
    <section className="admin-overview">
      <div><span>当前唯一AI模型</span><strong>{currentProvider?.name || form.provider}</strong><small>{form.model}</small></div>
      <div><span>今日AI消耗</span><strong>{formatTokens(snapshot.usage.today.totalTokens)} Token</strong><small>预计 {formatCost(snapshot.usage.today.estimatedCostCny)} · {snapshot.usage.today.calls} 次调用</small></div>
      <div><span>本月AI消耗</span><strong>{formatTokens(snapshot.usage.month.totalTokens)} Token</strong><small>预计 {formatCost(snapshot.usage.month.estimatedCostCny)} · {snapshot.usage.month.calls} 次调用</small></div>
    </section>

    <section className="admin-card">
      <div className="admin-card-heading"><div><div className="eyebrow">CURRENT MODEL</div><h2>模型与接口</h2></div><span className="local-only">仅本机可管理</span></div>
      <div className="admin-form-grid">
        <label><span>AI服务商</span><select value={form.provider} onChange={event => chooseProvider(event.target.value)}>{snapshot.providers.map(provider => <option key={provider.id} value={provider.id}>{provider.name}</option>)}</select><small>系统在任意时刻只使用这里选定的一个模型。</small></label>
        <label><span>模型名称</span><input value={form.model} onChange={event => setForm({ ...form, model: event.target.value })} placeholder="例如 deepseek-chat" /></label>
        <label className="full"><span>API Base URL</span><input value={form.baseUrl} onChange={event => setForm({ ...form, baseUrl: event.target.value })} placeholder="https://api.example.com/v1" /></label>
        <label className="full"><span>API Key</span><div className="secret-input"><input type={showKey ? "text" : "password"} value={form.apiKey} onChange={event => setForm({ ...form, apiKey: event.target.value })} placeholder={snapshot.settings.hasApiKey ? `已保存 ${snapshot.settings.maskedApiKey}；留空表示不修改` : "请输入API Key"} autoComplete="off" /><button type="button" onClick={() => setShowKey(value => !value)}>{showKey ? "隐藏" : "显示"}</button></div><small>Key在服务端加密保存，页面不会读取已保存的完整内容。</small></label>
      </div>
    </section>

    <section className="admin-card">
      <div className="admin-card-heading"><div><div className="eyebrow">COST GUARD</div><h2>每日成本限制</h2></div></div>
      <div className="admin-form-grid limits">
        <label><span>每日最大调用次数</span><input type="number" min="1" value={form.dailyCallLimit} onChange={event => setForm({ ...form, dailyCallLimit: Number(event.target.value) })} /></label>
        <label><span>每日最大Token</span><input type="number" min="1000" step="1000" value={form.dailyTokenLimit} onChange={event => setForm({ ...form, dailyTokenLimit: Number(event.target.value) })} /></label>
      </div>
      <p className="pricing-note">当前估价：输入 ¥{snapshot.pricing.input}/百万Token，输出 ¥{snapshot.pricing.output}/百万Token。{snapshot.pricing.notice}</p>
    </section>

    {message && <div className={`admin-message ${message.kind}`} role="status">{message.text}</div>}
    <div className="admin-actions"><button className="button primary" onClick={save} disabled={Boolean(busy)}>{busy === "save" ? "正在保存…" : "保存配置"}</button><button className="button secondary" onClick={testConnection} disabled={Boolean(busy)}>{busy === "test" ? "正在测试…" : "测试AI连接"}</button><Link href="/admin/ai-usage" className="text-link">查看完整Token统计 →</Link></div>
  </div>;
}
