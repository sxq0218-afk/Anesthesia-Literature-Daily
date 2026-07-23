import path from "node:path";
import { readJson, writeJsonAtomic } from "../src/literature/storage.mjs";

const provider = String(process.env.EMAIL_PROVIDER || "buttondown").toLowerCase();
try {
  if (provider === "buttondown") {
    await import("./send-daily-buttondown.mjs");
  } else if (["tencent", "tencent-ses", "ses"].includes(provider)) {
    await import("./send-daily-email.mjs");
  } else {
    throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
  }
} catch (error) {
  const edition = await readJson(path.join(process.cwd(), "data/generated/daily.json"), null);
  const safeMessage = String(error?.message || "Unknown email delivery error")
    .replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, "[REDACTED]")
    .replace(/\b(?:Token|Bearer)\s+[A-Za-z0-9._~+/-]{8,}\b/gi, "[REDACTED]");
  await writeJsonAtomic(path.join(process.cwd(), "data/logs/latest-email-summary.json"), {
    version: 1,
    provider,
    editionId: edition?.generatedAt
      ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(edition.generatedAt))
      : null,
    status: "failed",
    errorCode: error?.code || "EMAIL_DELIVERY_ERROR",
    error: safeMessage.slice(0, 300),
    updatedAt: new Date().toISOString(),
  });
  console.error(`Email delivery failed (${error?.code || "EMAIL_DELIVERY_ERROR"}): ${safeMessage}`);
  process.exitCode = 1;
}
