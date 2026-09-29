export interface SupportRouteInput {
  sourceRoute?: unknown;
  currentRoute?: unknown;
  module?: unknown;
  title?: unknown;
  description?: unknown;
}

export interface ResolvedSupportRoute {
  module: string | null;
  route: string | null;
}

const PURCHASE_ORDERS_MODULE = "Procurement / Purchase Orders";
const PURCHASE_ORDERS_ROUTE = "/dashboard/purchase/orders";
const NON_BUSINESS_ROUTES = new Set([
  "active-planner",
  "support",
  "reports",
  "command-center",
  "settings",
  "documents",
]);

export function normalizeSupportRoute(value: unknown): string | null {
  const route = String(value || "").split(/[?#]/)[0].trim();
  if (
    !route.startsWith("/dashboard/") ||
    route.startsWith("//") ||
    !/^\/dashboard(?:\/[a-zA-Z0-9_-]+)*$/.test(route)
  ) {
    return null;
  }
  return route.slice(0, 500);
}

function isBusinessRoute(route: string): boolean {
  const firstSegment = route.split("/")[2]?.toLowerCase();
  return Boolean(firstSegment && !NON_BUSINESS_ROUTES.has(firstSegment));
}

function isPurchaseOrdersRoute(route: string): boolean {
  return route === PURCHASE_ORDERS_ROUTE || route.startsWith(`${PURCHASE_ORDERS_ROUTE}/`);
}

function inferModule(input: SupportRouteInput): string | null {
  const context = [input.module, input.title, input.description]
    .map((value) => String(value || ""))
    .join(" ");
  if (/\b(procurement|purchase orders?|\bpo\b)\b/i.test(context)) {
    return PURCHASE_ORDERS_MODULE;
  }
  const route = normalizeSupportRoute(input.sourceRoute) || normalizeSupportRoute(input.currentRoute);
  if (route && isPurchaseOrdersRoute(route)) return PURCHASE_ORDERS_MODULE;
  const explicitModule = String(input.module || "").trim();
  return explicitModule && explicitModule.toLowerCase() !== "erp" ? explicitModule : null;
}

function routeMatchesModule(route: string, module: string | null): boolean {
  if (!module) return true;
  if (module === PURCHASE_ORDERS_MODULE) return isPurchaseOrdersRoute(route);
  return true;
}

export function resolveSupportRoute(input: SupportRouteInput): ResolvedSupportRoute {
  const module = inferModule(input);
  const sourceRoute = normalizeSupportRoute(input.sourceRoute);
  const canonicalRoute = module === PURCHASE_ORDERS_MODULE ? PURCHASE_ORDERS_ROUTE : null;

  // A source route is authoritative only when it is a real business route and agrees with a strongly identified module.
  if (sourceRoute && isBusinessRoute(sourceRoute) && routeMatchesModule(sourceRoute, module)) {
    return { module, route: sourceRoute };
  }
  if (canonicalRoute) return { module, route: canonicalRoute };

  const currentRoute = normalizeSupportRoute(input.currentRoute);
  if (currentRoute && isBusinessRoute(currentRoute) && routeMatchesModule(currentRoute, module)) {
    return { module, route: currentRoute };
  }
  return { module, route: null };
}
