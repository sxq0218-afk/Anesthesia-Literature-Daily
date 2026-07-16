const DEFAULT_TIMEOUT_MS = 30000;

export async function fetchWithRetry(url, options = {}, retryOptions = {}) {
  const attempts = retryOptions.attempts ?? 3;
  const timeoutMs = retryOptions.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`HTTP ${response.status}: ${body.slice(0, 240)}`);
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, 500 * attempt));
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}

export async function fetchJson(url, options, retryOptions) {
  return (await fetchWithRetry(url, options, retryOptions)).json();
}

export async function fetchText(url, options, retryOptions) {
  return (await fetchWithRetry(url, options, retryOptions)).text();
}
