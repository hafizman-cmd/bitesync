import type { Metadata } from "next";
import { Header } from "@/components/site";
import { CreateRoom } from "@/components/create-room";

export const metadata: Metadata = { title: "Create room" };

export default async function CreatePage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const demo = (await searchParams).demo === "1";
  return <><Header /><main className="flow-main"><CreateRoom demo={demo} /></main></>;
}
