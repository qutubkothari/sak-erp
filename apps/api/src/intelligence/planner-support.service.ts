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
import { PlannerSupportAttachmentsService } from "./planner-support-attachments.service";

export function supportIntent(message: string, mode?: string) {
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

export function supportRoute(value: unknown): string {
  const route = String(value || "").split(/[?#]/)[0];
  return /^\/dashboard(?:\/[a-zA-Z0-9_-]+)*$/.test(route)
    ? route.slice(0, 500)
    : "/dashboard";
}

@Injectable()
export class PlannerSupportService {
  constructor(
    private readonly autoheal: SupportAutofixService,
    private readonly attachments: PlannerSupportAttachmentsService,
  ) {}

  async route(user: any, body: any) {
    const message = String(body?.message || "");
    const intent = supportIntent(message, body?.support_mode);
    if (intent === "NORMAL_PLANNER_REQUEST") return null;
    if (intent === "CLARIFY_SUPPORT")
      return this.reply(intent, "Are you reporting a problem with the ERP?");
    if (intent === "SUPPORT_STATUS") return this.history(user, message);
    if (!message.trim() || message.length > 2000)
      throw new BadRequestException(
        "Describe the problem in 1–2000 characters.",
      );
    const route = supportRoute(body?.source_route);
    const module =
      route.startsWith("/dashboard/purchase/orders") ||
      /\b(po|purchase order)\b/i.test(message)
        ? "Procurement / Purchase Orders"
        : "ERP";
    const screenshotRef = body?.support_screenshot_ref;
    if (screenshotRef) await this.attachments.assertOwned(user, screenshotRef);
    // Only this allowlist crosses the intake boundary. No deployment commands or model output.
    const incident = await this.autoheal
      .captureIncident(user, {
        source: "client_ui",
        title: `${module}: ${sanitizeSupportText(message, 150)}`,
        description: message,
        route,
        page_url: route,
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
      })
      .catch(() => {
        throw new ServiceUnavailableException(
          "Your issue could not be logged. Your description is still here; please retry.",
        );
      });
    return {
      ...this.reply(
        intent,
        `I've logged this issue.\n\n${module}\nIncident: ${incident.id}\n\n${incident.status}\nYou can ask me here for an update.`,
      ),
      support_incident: { id: incident.id, status: incident.status },
    };
  }

  async history(user: any, message = "") {
    const rows = await this.autoheal.listMine(user).catch(() => {
      throw new ServiceUnavailableException(
        "Support updates are temporarily unavailable. Please try again.",
      );
    });
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
    const incidents = matching
      .slice(0, 10)
      .map((row: any) => ({ id: row.id, status: row.status }));
    return {
      ...this.reply(
        "SUPPORT_STATUS",
        incidents.length
          ? `Your recent support issues:\n${incidents.map((row) => `Incident: ${row.id}\n${row.status}`).join("\n\n")}`
          : words.length
            ? "I could not find a matching issue in your recent reports. Ask for my issues to see your recent support history."
            : "You have no recorded support issues.",
      ),
      support_incidents: incidents,
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
