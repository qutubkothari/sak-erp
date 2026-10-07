"use client";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { captureBrainSelection } from "@/lib/brain-context";
import { getProfileBranding } from "@/lib/profile-branding";

export function BrainAskLink({ entityType, entityId, documentNumber }: { entityType: string; entityId: string; documentNumber?: string }) {
  const assistantName = `Ask ${getProfileBranding().brand}`;
  return <Link href="/dashboard/active-planner" onClick={() => captureBrainSelection(entityType, entityId, documentNumber)} className="inline-flex items-center gap-1 text-xs font-medium underline">
    <MessageCircle className="h-4 w-4" />{assistantName}
  </Link>;
}
