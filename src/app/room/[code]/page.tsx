import type { Metadata } from "next";
import { Room } from "@/components/room";
import { Header } from "@/components/site";
import { brand, copy } from "@/lib/copy";
import { getLocale } from "@/lib/server-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const t = copy[locale];
  return {
    title: t.roomTitle,
    description: t.inviteDescription,
    robots: { index: false },
    openGraph: {
      type: "website",
      siteName: brand,
      title: t.inviteTitle,
      description: t.inviteDescription,
      locale: locale === "ms" ? "ms_MY" : "en_US",
      images: ["/images/dining.jpg"],
    },
  };
}

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const [locale, { code }] = await Promise.all([getLocale(), params]);
  return <><Header locale={locale} /><main className="flow-main"><Room key={code} code={code} locale={locale} /></main></>;
}
