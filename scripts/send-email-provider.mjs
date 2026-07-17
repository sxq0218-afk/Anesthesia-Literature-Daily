const provider = String(process.env.EMAIL_PROVIDER || "buttondown").toLowerCase();
if (provider === "buttondown") {
  await import("./send-daily-buttondown.mjs");
} else if (["tencent", "tencent-ses", "ses"].includes(provider)) {
  await import("./send-daily-email.mjs");
} else {
  throw new Error(`Unsupported EMAIL_PROVIDER: ${provider}`);
}
