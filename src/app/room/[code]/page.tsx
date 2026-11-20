import type { Metadata } from "next";
import { Room } from "@/components/room";
import { Header } from "@/components/site";

export const metadata: Metadata = {
  title: "Dining room",
  description: "Join my BiteSync room and help decide where we’re eating.",
  robots: { index: false },
  openGraph: {
    title: "Join my BiteSync room",
    description: "Help decide where we’re eating.",
    images: ["/images/dining.jpg"],
  },
};

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <><Header /><main className="flow-main"><Room key={code} code={code} /></main></>;
}
