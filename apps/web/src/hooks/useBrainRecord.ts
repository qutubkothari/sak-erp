"use client";
import { useEffect } from "react";
import { captureBrainSelection } from "@/lib/brain-context";

export function useBrainRecord(entityType: string, entityId?: string | null, documentNumber?: string) {
  useEffect(() => {
    const capture=()=>captureBrainSelection(entityType,entityId,documentNumber);
    capture();window.addEventListener('mizantra:ask-open',capture);
    return ()=>window.removeEventListener('mizantra:ask-open',capture);
  }, [entityType, entityId, documentNumber]);
}