import type { NextConfig } from "next";

const staticExport = process.env.STATIC_EXPORT === "1";
const configuredBasePath = (process.env.SITE_BASE_PATH || "").trim();
const basePath = configuredBasePath && configuredBasePath !== "/" ? `/${configuredBasePath.replace(/^\/+|\/+$/g, "")}` : "";

const nextConfig: NextConfig = {
  output: staticExport ? "export" : undefined,
  trailingSlash: staticExport,
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
};

export default nextConfig;
