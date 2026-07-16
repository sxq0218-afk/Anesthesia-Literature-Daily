import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const EMPTY_STATE = {
  version: 1,
  updatedAt: null,
  lastInboxUid: 0,
  subscribers: [],
  dispatches: [],
};

function keyFromSecret(secret) {
  if (!secret || String(secret).length < 32) {
    throw new Error("SUBSCRIBER_ENCRYPTION_KEY must contain at least 32 characters.");
  }
  return crypto.createHash("sha256").update(String(secret)).digest();
}

export function encryptSubscriberState(state, secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyFromSecret(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(state), "utf8"), cipher.final()]);
  return {
    version: 1,
    algorithm: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: ciphertext.toString("base64"),
  };
}

export function decryptSubscriberState(envelope, secret) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyFromSecret(secret), Buffer.from(envelope.iv, "base64"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(envelope.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plaintext);
}

export async function loadSubscriberState(file, secret) {
  try {
    const envelope = JSON.parse(await fs.readFile(file, "utf8"));
    return { ...structuredClone(EMPTY_STATE), ...decryptSubscriberState(envelope, secret) };
  } catch (error) {
    if (error.code === "ENOENT") return structuredClone(EMPTY_STATE);
    throw new Error(`Unable to decrypt subscriber state: ${error.message}`);
  }
}

export async function saveSubscriberState(file, state, secret) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const envelope = encryptSubscriberState({ ...state, updatedAt: new Date().toISOString() }, secret);
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(envelope, null, 2)}\n`, { mode: 0o600 });
  await fs.rename(temporary, file);
}

export function emailFingerprint(email, secret) {
  return crypto.createHmac("sha256", keyFromSecret(secret)).update(normalizeEmail(email)).digest("hex").slice(0, 16);
}

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function confirmationToken() {
  return crypto.randomBytes(18).toString("base64url");
}

export function tokenHash(token, secret) {
  return crypto.createHmac("sha256", keyFromSecret(secret)).update(String(token)).digest("hex");
}
