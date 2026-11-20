import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { RegisterWorker } from "@/components/register-worker";
import "./globals.css";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const description = "Find a place to eat together in 90 seconds. Share a room, swipe on nearby restaurants, and get a group pick.";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: "BiteSync | Decide where to eat, together", template: "%s | BiteSync" },
  description,
  openGraph: { type: "website", title: "BiteSync | Decide where to eat, together", description, images: ["/images/pak-gembus-storefront.webp"] },
  appleWebApp: { capable: true, title: "BiteSync", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: [
  { media: "(prefers-color-scheme: light)", color: "#FAF9F6" },
  { media: "(prefers-color-scheme: dark)", color: "#111110" },
] };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en" suppressHydrationWarning>
    <head><script dangerouslySetInnerHTML={{ __html: "try{var theme=localStorage.getItem('bitesync-theme');if(theme==='dark'||theme==='light')document.documentElement.dataset.theme=theme}catch(e){}" }} /></head>
    <body>{children}<RegisterWorker /></body>
  </html>;
}
