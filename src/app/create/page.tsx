import type { Metadata } from "next";
import { Header } from "@/components/site";
import { CreateRoom } from "@/components/create-room";
import { copy } from "@/lib/copy";
import { getLocale } from "@/lib/server-locale";

type Props = { searchParams: Promise<{ demo?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const [locale, { demo }] = await Promise.all([getLocale(), searchParams]);
  const t = copy[locale];
  return { title: demo === "1" ? t.trySample : t.create };
}

export default async function CreatePage({ searchParams }: Props) {
  const [locale, { demo }] = await Promise.all([getLocale(), searchParams]);
  return <><Header locale={locale} /><main className="flow-main"><CreateRoom demo={demo === "1"} locale={locale} /></main></>;
}
