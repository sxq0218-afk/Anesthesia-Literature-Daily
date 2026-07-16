const required = ["AI_PROVIDER", "AI_BASE_URL", "AI_MODEL", "AI_API_KEY", "NCBI_EMAIL", "SITE_URL"];
const missing = required.filter(key => !String(process.env[key] || "").trim());
if (missing.length) {
  console.error(`Production configuration is incomplete. Missing: ${missing.join(", ")}`);
  process.exit(1);
}
if (!/^https:\/\//i.test(process.env.SITE_URL)) {
  console.error("SITE_URL must be an HTTPS public address in production.");
  process.exit(1);
}
if (process.env.EMAIL_DELIVERY_ENABLED === "true") {
  const emailRequired = [
    "SUBSCRIBER_ENCRYPTION_KEY",
    "SUBSCRIPTION_INBOX_IMAP_HOST",
    "SUBSCRIPTION_INBOX_USER",
    "SUBSCRIPTION_INBOX_PASSWORD",
    "TENCENT_SECRET_ID",
    "TENCENT_SECRET_KEY",
    "TENCENT_SES_FROM_EMAIL",
    "TENCENT_SES_DAILY_TEMPLATE_ID",
    "TENCENT_SES_NOTICE_TEMPLATE_ID",
  ];
  const missingEmail = emailRequired.filter(key => !String(process.env[key] || "").trim());
  if (missingEmail.length) {
    console.error(`Email delivery is enabled but configuration is incomplete. Missing: ${missingEmail.join(", ")}`);
    process.exit(1);
  }
  if (String(process.env.SUBSCRIBER_ENCRYPTION_KEY).length < 32) {
    console.error("SUBSCRIBER_ENCRYPTION_KEY must contain at least 32 characters.");
    process.exit(1);
  }
}
console.log("Production environment check passed. Secret values were not printed.");
