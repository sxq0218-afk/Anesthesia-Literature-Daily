import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

export async function readSubscriptionMessages(config, lastUid = 0) {
  const required = ["host", "user", "pass"];
  const missing = required.filter(key => !config[key]);
  if (missing.length) throw new Error(`Subscription inbox configuration missing: ${missing.join(", ")}`);
  const client = new ImapFlow({
    host: config.host,
    port: Number(config.port || 993),
    secure: config.secure !== false,
    auth: { user: config.user, pass: config.pass },
    logger: false,
  });
  const messages = [];
  await client.connect();
  try {
    const lock = await client.getMailboxLock(config.mailbox || "INBOX");
    try {
      const startUid = Math.max(1, Number(lastUid || 0) + 1);
      for await (const item of client.fetch(`${startUid}:*`, { uid: true, source: true }, { uid: true })) {
        if (!item.source || item.uid <= lastUid) continue;
        const parsed = await simpleParser(item.source);
        messages.push({
          uid: item.uid,
          from: parsed.from?.value?.[0]?.address || "",
          subject: parsed.subject || "",
          text: parsed.text || "",
          receivedAt: parsed.date?.toISOString?.() || null,
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
  return messages.sort((a, b) => a.uid - b.uid);
}
