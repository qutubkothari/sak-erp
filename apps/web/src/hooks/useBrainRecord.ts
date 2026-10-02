"use client";
import { useEffect } from "react";
import { captureBrainSelection } from "@/lib/brain-context";

export function useBrainRecord(entityType: string, entityId?: string | null, documentNumber?: string) {
  useEffect(() => { captureBrainSelection(entityType, entityId, documentNumber); }, [entityType, entityId, documentNumber]);
}