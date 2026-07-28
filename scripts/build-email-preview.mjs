import fs from "node:fs/promises";
import path from "node:path";
import { buildButtondownEmail } from "../src/email/buttondown-body.mjs";

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : fallback;
}

const input = path.resolve(argument("--input", "data/generated/daily.json"));
const output = path.resolve(argument("--output", "artifacts/deep-reading-v2-email.html"));
const edition = JSON.parse(await fs.readFile(input, "utf8"));
if (!edition?.articles?.length) throw new Error("A generated edition with at least one article is required.");
const email = buildButtondownEmail(edition);
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.writeFile(output, `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${email.subject}</title></head><body>${email.body}</body></html>`, "utf8");
console.log(JSON.stringify({ status: "written", output, articles: edition.articles.length, bytes: Buffer.byteLength(email.body) }, null, 2));

