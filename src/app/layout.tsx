import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { RegisterWorker } from "@/components/register-worker";
import { brand, copy } from "@/lib/copy";
import { getLocale } from "@/lib/server-locale";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = copy[locale];
  const title = `${brand} | ${t.homeTitle}`;
  return {
    metadataBase: new URL(appUrl),
    title: { default: title, template: `%s | ${brand}` },
    description: t.description,
    openGraph: {
      type: "website",
      siteName: brand,
      title,
      description: t.description,
      locale: locale === "ms" ? "ms_MY" : "en_US",
      images: ["/images/pak-gembus-storefront.webp"],
    },
    appleWebApp: { capable: true, title: brand, statusBarStyle: "default" },
  };
}

export const viewport: Viewport = { themeColor: [
  { media: "(prefers-color-scheme: light)", color: "#FAF9F6" },
  { media: "(prefers-color-scheme: dark)", color: "#111110" },
] };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  return <html lang={locale} suppressHydrationWarning>
    <head><script dangerouslySetInnerHTML={{ __html: "try{var theme=localStorage.getItem('bitesync-theme');if(theme==='dark'||theme==='light')document.documentElement.dataset.theme=theme}catch(e){}" }} /></head>
    <body>{children}<RegisterWorker /></body>
  </html>;
}
