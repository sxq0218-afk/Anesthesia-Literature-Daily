const required = ["AI_PROVIDER", "AI_BASE_URL", "AI_MODEL", "AI_API_KEY", "NCBI_EMAIL", "BUTTONDOWN_API_KEY", "NEXT_PUBLIC_BUTTONDOWN_USERNAME"];
const missing = required.filter(key => !String(process.env[key] || "").trim());
if (missing.length) {
  console.error(`Email production configuration is incomplete. Missing: ${missing.join(", ")}`);
  process.exit(1);
}
const provider = String(process.env.EMAIL_PROVIDER || "buttondown").toLowerCase();
if (provider !== "buttondown") {
  console.error("The domain-free email workflow requires EMAIL_PROVIDER=buttondown.");
  process.exit(1);
}
const limit = Number(process.env.BUTTONDOWN_SUBSCRIBER_LIMIT || 100);
if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
  console.error("BUTTONDOWN_SUBSCRIBER_LIMIT must be an integer between 1 and 100 for the free test workflow.");
  process.exit(1);
}
console.log("Email production environment check passed. Secret values were not printed.");
