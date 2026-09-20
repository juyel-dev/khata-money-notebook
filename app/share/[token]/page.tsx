"use client";

import { use } from "react";
import { PublicShareView } from "@/components/share/PublicShareView";

export default function PublicSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  return <PublicShareView token={token} />;
}
