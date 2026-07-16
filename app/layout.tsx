import type { Metadata } from "next";
import "./globals.css";
import { Footer, Header } from "./components";

export const metadata: Metadata = {
  title: { default: "每日麻醉文献精读", template: "%s｜每日麻醉文献精读" },
  description: "每天精选 5 篇重要麻醉学研究，用中文拆解研究设计、核心结果与临床启示。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  metadataBase: process.env.SITE_URL ? new URL(process.env.SITE_URL) : undefined,
  alternates: { types: { "application/rss+xml": "/rss.xml" } },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const publicSite = process.env.DEPLOY_ENV === "production";
  const emailSubscription = Boolean(process.env.NEXT_PUBLIC_SUBSCRIPTION_EMAIL);
  return <html lang="zh-CN"><body><Header publicSite={publicSite} emailSubscription={emailSubscription} /><main>{children}</main><Footer publicSite={publicSite} emailSubscription={emailSubscription} /></body></html>;
}
