import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { SupportAutofixService } from "../support-autofix/support-autofix.service";
import {
  sanitizeSupportText,
  safeRouteOrUrl,
} from "../support-autofix/support-store.service";
import { normalizeSupportRoute, resolveSupportRoute } from "../support-autofix/support-route";
import { PlannerSupportAttachmentsService } from "./planner-support-attachments.service";
import { classifyAutoEngineerIntent, resolveAutoEngineerScope } from "../support-autofix/autoengineer-policy";
import { hasSuperAdminBypass } from "../auth/utils/permission-utils";
import { classifyIncident } from "../support-autofix/risk-policy";

function legacySupportIntent(message: string, mode?: string) {
  if (mode === "support") return "SUPPORT_INCIDENT";
  if (mode === "planner") return "NORMAL_PLANNER_REQUEST";
  const text = message.toLowerCase().replace(/[’']/g, "'");
  if (
    /\b(what happened to my (issue|problem)|status of .*\b(issue|problem)|my (support )?(issues|incidents)|issue status)\b/.test(
      text,
    )
  )
    return "SUPPORT_STATUS";
  if (
    /\b(not working|getting (?:an? |internal server )?error|unable to (?:search|save|open|update|load|submit)|(?:cannot|can't) (?:update|search|save|open|load|submit)|page is blank|is not opening|button does nothing|search (?:is )?not (?:working|filtering)|there is (?:some |an? )?error)\b/.test(
      text,
    )
  )
    return "SUPPORT_INCIDENT";
  if (
    /\b(error|problem|broken|issue|not responding|doesn't work|does not work)\b/.test(
      text,
    ) &&
    !/^(?:show|list|find|create|prepare|raise)\b.*\b(?:stock issue|material issue|issue voucher|error report)\b/.test(
      text,
    )
  )
    return "CLARIFY_SUPPORT";
  return "NORMAL_PLANNER_REQUEST";
}

export function autoEngineerIntent(message: string, mode?: string) {
  return classifyAutoEngineerIntent(message, mode).intent;
}

export function supportIntent(message: string, mode?: string) {
  return autoEngineerIntent(message, mode);
}

export function supportRoute(value: unknown): string {
  return normalizeSupportRoute(value) || "/dashboard";
}

@Injectable()
export class PlannerSupportService {
  constructor(
    private readonly autoheal: SupportAutofixService,
    private readonly attachments: PlannerSupportAttachmentsService,
  ) {}

  async route(user: any, body: any) {
    const message = String(body?.message || "");
    const classification = classifyAutoEngineerIntent(message, body?.support_mode);
    const intent = classification.intent;
    if (intent === "NORMAL_ERP_REQUEST") return null;
    if (intent === "CLARIFY_CHANGE_REQUEST")
      return this.reply(intent, "Are you asking me to perform ERP work, report a problem, or change/improve the ERP?");
    if (intent === "SUPPORT_STATUS") return this.history(user, message);
    if (!message.trim() || message.length > 2000)
      throw new BadRequestException(
        "Describe the problem in 1–2000 characters.",
      );
    const routeContext = resolveSupportRoute({
      sourceRoute: body?.source_route,
      currentRoute: body?.current_route,
      title: message,
      description: message,
    });
    const route = routeContext.route;
    const module = routeContext.module || "ERP";
    const screenshotRef = body?.support_screenshot_ref;
    if (screenshotRef) await this.attachments.assertOwned(user, screenshotRef);
    const scope = resolveAutoEngineerScope({
      isSuperAdmin: hasSuperAdminBypass(user),
      currentProfile: process.env.ERP_TENANT_PROFILE,
      requestedScope: body?.requested_scope,
      targetProfiles: body?.target_profiles,
    });
    const requestRisk = classification.requestType === "BUG"
      ? classifyIncident({ title: message, description: message, module, route }).risk
      : classification.risk;
    const effectiveRisk = scope.requestedScope === "UNKNOWN" ? "BLOCKED" : requestRisk || "BLOCKED";
    const requestMetadata = {
      request_type: classification.requestType,
      change_kind: classification.changeKind,
      risk: effectiveRisk,
      risk_reason: effectiveRisk === "BLOCKED" ? scope.scopeReason : classification.reason,
      requested_scope: scope.requestedScope,
      target_profiles: scope.targetProfiles,
      scope_reason: scope.scopeReason,
      acceptance_criteria: classification.acceptanceCriteria,
      implementation_plan: classification.implementationPlan,
      change_summary: classification.changeSummary,
      requires_migration: classification.requiresMigration,
      requires_backend: classification.requiresBackend,
      requires_business_logic: classification.requiresBusinessLogic,
      requested_by_profile: scope.requestedByProfile,
      build_approval_status: classification.requestType === "BUG"
        ? "NOT_REQUIRED"
        : effectiveRisk === "MEDIUM"
        ? "AWAITING_BUILD_APPROVAL"
        : effectiveRisk === "HIGH"
          ? "AWAITING_ENGINEERING_APPROVAL"
          : "NOT_REQUIRED",
      prompt_scope: effectiveRisk === "LOW"
        ? `LOW ${classification.changeKind} UI-only scope; use existing data, no migrations, business logic, or deployment.`
        : `Plan only until privileged approval; requested scope: ${scope.requestedScope}.`,
    };
    // Only this allowlist crosses the intake boundary. No deployment commands or model output.
    const incident = await this.autoheal
      .captureIncident(user, {
        source: "client_ui",
        title: `${module}: ${sanitizeSupportText(message, 150)}`,
        description: message,
        route: route || undefined,
        page_url: route || undefined,
        module,
        screenshot_ref: screenshotRef || undefined,
        browser_info:
          /^(desktop|mobile|tablet); (Chrome|Firefox|Safari|Edge|Other)$/.test(
            String(body?.browser_info),
          )
            ? body.browser_info
            : undefined,
        failed_endpoint:
          safeRouteOrUrl(body?.failed_endpoint)?.replace(
            /^https?:\/\/[^/]+/i,
            "",
          ) || undefined,
        http_status:
          Number.isInteger(body?.http_status) &&
          body.http_status >= 400 &&
          body.http_status <= 599
            ? body.http_status
            : undefined,
        build_sha: /^[a-f0-9]{7,40}$/i.test(
          String(
            process.env.BUILD_SHA ||
              process.env.GIT_SHA ||
              body?.build_sha ||
              "",
          ),
        )
          ? process.env.BUILD_SHA || process.env.GIT_SHA || body.build_sha
          : undefined,
      }, requestMetadata)
      .catch(() => {
        throw new ServiceUnavailableException(
          "Your issue could not be logged. Your description is still here; please retry.",
        );
      });
    const clientMessage = classification.requestType === "BUG"
      ? `I've logged this issue.\n\n${module}\nIncident: ${incident.id}\n\n${incident.status}\nYou can ask me here for an update.`
      : effectiveRisk === "LOW"
        ? `Change request understood.\n${module}\nRisk: Low\nI'm preparing and testing the change. Deployment will still need separate approval.`
      : effectiveRisk === "MEDIUM"
          ? `Change request understood.\n${module}\nRisk: Medium\nI'm preparing an implementation plan. A privileged Admin must approve “Build this change” before coding begins.`
      : effectiveRisk === "HIGH"
            ? `Change request understood.\n${module}\nRisk: High\nI can prepare an impact analysis and acceptance tests. Engineering approval is required before coding.`
            : `This request needs security or scope review before implementation can be considered.`;
    return {
      ...this.reply(intent, clientMessage),
      support_incident: { id: incident.id, status: incident.status },
      request_type: classification.requestType,
      requested_scope: scope.requestedScope,
      risk: effectiveRisk,
      acceptance_criteria: classification.acceptanceCriteria,
    };
  }

  async history(user: any, message = "") {
    const result = await this.autoheal.listMine(user, 'ACTIVE').catch(() => {
      throw new ServiceUnavailableException(
        "Support updates are temporarily unavailable. Please try again.",
      );
    });
    const rows = result.issues;
    const topic = message
      .toLowerCase()
      .match(/status of (.+)/)?.[1]
      .replace(/\b(the|my|issue|problem|please)\b/g, " ")
      .trim();
    const words = topic?.match(/[a-z0-9]+/g) || [];
    const matching = words.length
      ? rows.filter((row: any) =>
          words.every((word) =>
            String(row.title || "")
              .toLowerCase()
              .includes(word),
          ),
        )
      : rows;
    // Do not echo free-text titles, paths, engineering fields, or raw incident records.
    const incidents = matching.slice(0, 10).map((row: any) => ({ id: row.id, status: row.friendly_status || row.status }));
    const summaries = matching.slice(0, 10).map((row: any) => {
      const title = sanitizeSupportText(row.title, 160);
      const safeTitle = /^(?:\/|https?:\/\/)/i.test(title) ? 'Reported support issue' : title;
      return `${safeTitle || 'Reported support issue'}\n${row.friendly_status || row.status}`;
    });
    return {
      ...this.reply(
        "SUPPORT_STATUS",
        incidents.length
          ? `${result.counts.ACTIVE} active support issue${result.counts.ACTIVE === 1 ? '' : 's'}:\n${summaries.join("\n\n")}`
          : words.length
            ? "I could not find a matching issue in your recent reports. Ask for my issues to see your recent support history."
            : "You have no recorded support issues.",
      ),
      support_incidents: incidents,
      support_counts: result.counts,
    };
  }

  private reply(intent: string, message: string) {
    return {
      status: intent,
      intent_type: intent,
      assistant_message: message,
      questions: [],
      context_token: "",
      provider: "deterministic",
      extracted: {},
      resolved: {},
      safety: {},
    };
  }
}
