import crypto from "node:crypto";

const SERVICE = "ses";
const HOST = "ses.tencentcloudapi.com";
const VERSION = "2020-10-02";

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hmac(key, value, encoding) {
  return crypto.createHmac("sha256", key).update(value).digest(encoding);
}

function utcDate(timestamp) {
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

export function signTencentRequest({ secretId, secretKey, action, body, timestamp = Math.floor(Date.now() / 1000) }) {
  const payload = JSON.stringify(body);
  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${HOST}\nx-tc-action:${action.toLowerCase()}\n`;
  const signedHeaders = "content-type;host;x-tc-action";
  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${sha256(payload)}`;
  const date = utcDate(timestamp);
  const credentialScope = `${date}/${SERVICE}/tc3_request`;
  const stringToSign = `TC3-HMAC-SHA256\n${timestamp}\n${credentialScope}\n${sha256(canonicalRequest)}`;
  const secretDate = hmac(`TC3${secretKey}`, date);
  const secretService = hmac(secretDate, SERVICE);
  const secretSigning = hmac(secretService, "tc3_request");
  const signature = hmac(secretSigning, stringToSign, "hex");
  const authorization = `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return { payload, timestamp, authorization };
}

function requireConfig(config) {
  const required = ["secretId", "secretKey", "region", "fromEmail"];
  const missing = required.filter(key => !config[key]);
  if (missing.length) throw new Error(`Tencent SES configuration missing: ${missing.join(", ")}`);
}

export function createTencentSesClient(config, fetchImpl = fetch) {
  requireConfig(config);
  async function request(action, body) {
    const signed = signTencentRequest({ ...config, action, body });
    const response = await fetchImpl(`https://${HOST}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Host: HOST,
        "X-TC-Action": action,
        "X-TC-Version": VERSION,
        "X-TC-Region": config.region,
        "X-TC-Timestamp": String(signed.timestamp),
        Authorization: signed.authorization,
      },
      body: signed.payload,
      signal: AbortSignal.timeout(config.timeoutMs || 30000),
    });
    const data = await response.json().catch(() => null);
    const apiError = data?.Response?.Error;
    if (!response.ok || apiError) {
      const code = apiError?.Code || `HTTP_${response.status}`;
      const message = apiError?.Message || "Tencent SES returned an invalid response.";
      const error = new Error(`${code}: ${message}`);
      error.code = code;
      throw error;
    }
    if (!data?.Response?.MessageId) throw new Error("Tencent SES response did not include MessageId.");
    return { messageId: data.Response.MessageId, requestId: data.Response.RequestId || null };
  }

  return {
    async sendTemplate({ to, subject, templateId, templateData, unsubscribe = true }) {
      const selectedTemplateId = templateId || config.templateId;
      if (!selectedTemplateId) throw new Error("Tencent SES template ID is not configured.");
      return request("SendEmail", {
        FromEmailAddress: config.fromEmail,
        ReplyToAddresses: config.replyTo || undefined,
        Destination: [to],
        Subject: subject,
        Template: {
          TemplateID: Number(selectedTemplateId),
          TemplateData: JSON.stringify(templateData),
        },
        Unsubscribe: unsubscribe ? "1" : "0",
        TriggerType: 0,
      });
    },
  };
}

export function sesConfigFromEnv(env = process.env) {
  return {
    secretId: env.TENCENT_SECRET_ID,
    secretKey: env.TENCENT_SECRET_KEY,
    region: env.TENCENT_SES_REGION || "ap-guangzhou",
    fromEmail: env.TENCENT_SES_FROM_EMAIL,
    replyTo: env.TENCENT_SES_REPLY_TO || env.SUBSCRIPTION_INBOX_USER,
    templateId: env.TENCENT_SES_DAILY_TEMPLATE_ID || env.TENCENT_SES_TEMPLATE_ID,
    timeoutMs: Number(env.TENCENT_SES_TIMEOUT || 30000),
  };
}
