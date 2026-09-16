"use client";

import { use } from "react";
import { PersonDetailView } from "@/components/person/PersonDetailView";

export default function PersonDetailPage({
  params,
}: {
  params: Promise<{ id: string; personId: string }>;
}) {
  const { id, personId } = use(params);
  return <PersonDetailView notebookId={id} personId={personId} />;
}
