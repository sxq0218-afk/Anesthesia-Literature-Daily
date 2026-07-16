import { confirmationToken, emailFingerprint, normalizeEmail, tokenHash } from "./crypto-store.mjs";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function commandFrom(message) {
  const text = `${message.subject || ""}\n${message.text || ""}`.trim();
  const confirmation = text.match(/确认订阅\s+([A-Za-z0-9_-]{12,})/i);
  if (confirmation) return { type: "confirm", token: confirmation[1] };
  if (/退订|unsubscribe/i.test(text)) return { type: "unsubscribe" };
  if (/订阅|subscribe/i.test(text)) return { type: "subscribe" };
  return { type: "ignore" };
}

export async function applySubscriptionMessage({ state, message, secret, sendNotice }) {
  const email = normalizeEmail(message.from);
  if (!EMAIL_PATTERN.test(email)) return { status: "ignored-invalid-sender" };
  const command = commandFrom(message);
  const now = new Date().toISOString();
  let subscriber = state.subscribers.find(item => item.email === email);

  if (command.type === "subscribe") {
    if (subscriber?.status === "active") return { status: "already-active", fingerprint: emailFingerprint(email, secret) };
    const token = confirmationToken();
    const record = {
      email,
      status: "pending",
      requestedAt: now,
      confirmedAt: null,
      unsubscribedAt: null,
      confirmationTokenHash: tokenHash(token, secret),
      lastSentEdition: subscriber?.lastSentEdition || null,
    };
    if (subscriber) Object.assign(subscriber, record);
    else state.subscribers.push(record);
    await sendNotice({
      to: email,
      subject: "请确认订阅｜每日麻醉文献精读",
      kind: "confirmation",
      data: { confirmation_subject: `确认订阅 ${token}` },
      unsubscribe: false,
    });
    return { status: "confirmation-sent", fingerprint: emailFingerprint(email, secret) };
  }

  if (command.type === "confirm" && subscriber?.status === "pending" && subscriber.confirmationTokenHash === tokenHash(command.token, secret)) {
    subscriber.status = "active";
    subscriber.confirmedAt = now;
    subscriber.confirmationTokenHash = null;
    await sendNotice({ to: email, subject: "订阅成功｜每日麻醉文献精读", kind: "welcome", data: {}, unsubscribe: true });
    return { status: "activated", fingerprint: emailFingerprint(email, secret) };
  }

  if (command.type === "unsubscribe") {
    if (!subscriber) {
      subscriber = { email, status: "unsubscribed", requestedAt: null, confirmedAt: null, lastSentEdition: null };
      state.subscribers.push(subscriber);
    }
    subscriber.status = "unsubscribed";
    subscriber.unsubscribedAt = now;
    subscriber.confirmationTokenHash = null;
    await sendNotice({ to: email, subject: "已退订｜每日麻醉文献精读", kind: "unsubscribed", data: {}, unsubscribe: false });
    return { status: "unsubscribed", fingerprint: emailFingerprint(email, secret) };
  }

  return { status: command.type === "ignore" ? "ignored-no-command" : "ignored-invalid-confirmation", fingerprint: emailFingerprint(email, secret) };
}
