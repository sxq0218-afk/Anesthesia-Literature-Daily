import { createButtondownClient, buttondownConfigFromEnv } from "../src/email/buttondown.mjs";

const provider = String(process.env.EMAIL_PROVIDER || "buttondown").toLowerCase();
if (provider !== "buttondown") throw new Error("This connection test currently supports EMAIL_PROVIDER=buttondown.");
const client = createButtondownClient(buttondownConfigFromEnv(process.env));
const result = await client.testConnection();
console.log(JSON.stringify({ provider: "buttondown", connected: result.ok, responseTimeMs: result.responseTimeMs, newsletterCount: result.newsletterCount }, null, 2));
