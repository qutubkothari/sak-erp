export const BRAIN_CONTEXT_KEY = "mizantra-brain-context";
export type BrainSelection = { entity_type: string; entity_id: string; document_number: string; current_route: string; tenant_id: string; current_user_id: string; captured_at: number };
export type BrainEnvelope = Omit<BrainSelection, "captured_at"> & { profile: string; module: string; current_user_role: string; locale: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const supported = new Set(["purchase_order", "purchase_requisition", "grn", "item", "supplier", "smart_import_batch", "autoqa_finding", "support_incident", "employee", "attendance", "item_drawing"]);

export function buildBrainEnvelope(selection: unknown, configuration: { profile: string; tenant_id: string; current_user_id: string }, role: string, locale: string, now = Date.now()): BrainEnvelope | null {
  if (!selection || typeof selection !== "object" || Array.isArray(selection)) return null;
  const record = selection as BrainSelection;
  if (!supported.has(record.entity_type) || !uuid.test(record.entity_id) || record.tenant_id !== configuration.tenant_id || record.current_user_id !== configuration.current_user_id) return null;
  if (!Number.isFinite(record.captured_at) || now < record.captured_at || now - record.captured_at > 15 * 60 * 1000) return null;
  if (!/^\/dashboard(?:\/[a-zA-Z0-9_-]+)*$/.test(record.current_route)) return null;
  return {
    profile: configuration.profile, tenant_id: configuration.tenant_id,
    current_user_id: configuration.current_user_id,
    current_user_role: /^[A-Za-z0-9 _-]{0,80}$/.test(role) ? role : "",
    locale: /^[a-z]{2}(?:-[A-Z]{2})?$/.test(locale) ? locale : "en",
    current_route: record.current_route, module: record.entity_type.toUpperCase(),
    entity_type: record.entity_type, entity_id: record.entity_id,
    document_number: String(record.document_number || "").replace(/[^A-Za-z0-9 ._/-]/g, "").slice(0, 100),
  };
}

export function captureBrainSelection(entityType: string, entityId: string | undefined | null, documentNumber?: string) {
  if (typeof window === "undefined") return;
  try {
    const route = window.location.pathname;
    if (!supported.has(entityType) || !uuid.test(String(entityId))) {
      const previous = JSON.parse(sessionStorage.getItem(BRAIN_CONTEXT_KEY) || "null");
      if (previous?.current_route === route) sessionStorage.removeItem(BRAIN_CONTEXT_KEY);
      return;
    }
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const selection: BrainSelection = {
      entity_type: entityType, entity_id: String(entityId), document_number: String(documentNumber || "").slice(0, 100),
      current_route: route, tenant_id: String(user.tenantId || user.tenant_id || user.tenant?.id || ""),
      current_user_id: String(user.userId || user.id || ""), captured_at: Date.now(),
    };
    sessionStorage.setItem(BRAIN_CONTEXT_KEY, JSON.stringify(selection));
  } catch {}
}

export function captureBrainRoute(route: string) {
  if (typeof window === "undefined" || route === "/dashboard/active-planner") return;
  try {
    const previous = JSON.parse(sessionStorage.getItem(BRAIN_CONTEXT_KEY) || "null");
    if (previous?.current_route !== route) sessionStorage.removeItem(BRAIN_CONTEXT_KEY);
  } catch {}
}