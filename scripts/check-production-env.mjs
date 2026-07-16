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
console.log("Production environment check passed. Secret values were not printed.");
