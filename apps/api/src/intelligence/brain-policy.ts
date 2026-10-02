export const BRAIN_MAX_DEPTH = 4;
export const BRAIN_MAX_RECORDS = 100;
export const BRAIN_TIMEOUT_MS = 5000;

export function brainFlags(settings: Record<string, unknown> = process.env) {
  const enabled = settings.MIZANTRA_BRAIN_ENABLED === "true";
  return {
    enabled,
    contextEnabled: enabled && settings.MIZANTRA_CONTEXT_ENGINE_ENABLED === "true",
    graphEnabled: enabled && settings.MIZANTRA_BUSINESS_GRAPH_ENABLED === "true",
    actionPlannerMode: "PREVIEW_ONLY" as const,
  };
}

export function brainDepth(value: unknown = BRAIN_MAX_DEPTH): number {
  return typeof value === "number" && Number.isInteger(value)
    ? Math.max(0, Math.min(BRAIN_MAX_DEPTH, value))
    : BRAIN_MAX_DEPTH;
}

export function brainActionPreview() {
  return {
    mode: "PREVIEW_ONLY" as const,
    executable: false,
    steps: [
      "Identify eligible active items below their configured reorder level",
      "Determine replenishment quantities using the existing configured policy",
      "Group candidate requisition lines",
      "Prepare a purchase requisition preview",
    ],
    message: "Execution is not enabled in Brain V1.",
  };
}