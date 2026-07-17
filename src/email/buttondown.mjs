const DEFAULT_BASE_URL = "https://api.buttondown.com/v1";

function requireConfig(config) {
  if (!config.apiKey) throw new Error("Buttondown configuration missing: apiKey");
  if (!/^https:\/\//i.test(config.baseUrl)) throw new Error("Buttondown API base URL must use HTTPS.");
}

export function createButtondownClient(config, fetchImpl = fetch) {
  requireConfig(config);
  async function request(path, options = {}) {
    const response = await fetchImpl(`${config.baseUrl}${path}`, {
      method: options.method || "GET",
      headers: {
        Authorization: `Token ${config.apiKey}`,
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(config.timeoutMs || 30000),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = data?.detail || data?.message || data?.error || `HTTP_${response.status}`;
      const error = new Error(`Buttondown API error: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
      error.code = `BUTTONDOWN_${response.status}`;
      throw error;
    }
    return data;
  }

  return {
    async testConnection() {
      const startedAt = Date.now();
      const data = await request("/newsletters");
      return { ok: true, responseTimeMs: Date.now() - startedAt, newsletterCount: data?.count ?? data?.results?.length ?? null };
    },
    async activeSubscriberCount() {
      const data = await request("/subscribers?type=regular");
      return Number(data?.count ?? data?.results?.length ?? 0);
    },
    async findEmailBySubject(subject) {
      const data = await request(`/emails?subject=${encodeURIComponent(subject)}&ordering=-creation_date`);
      return (data?.results || []).find(item => item.subject === subject) || null;
    },
    async createDraft({ subject, slug, body, description, canonicalUrl, metadata }) {
      return request("/emails", {
        method: "POST",
        body: {
          subject,
          slug,
          body,
          description,
          canonical_url: canonicalUrl || "",
          metadata,
          status: "draft",
          email_type: "public",
          archival_mode: "enabled",
        },
      });
    },
    async updateDraft(id, update) {
      return request(`/emails/${encodeURIComponent(id)}`, { method: "PATCH", body: update });
    },
    async queueDraft(id) {
      return request(`/emails/${encodeURIComponent(id)}`, { method: "PATCH", body: { status: "about_to_send" } });
    },
  };
}

export function buttondownConfigFromEnv(env = process.env) {
  return {
    apiKey: env.BUTTONDOWN_API_KEY,
    baseUrl: String(env.BUTTONDOWN_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, ""),
    timeoutMs: Number(env.BUTTONDOWN_TIMEOUT || 30000),
  };
}
