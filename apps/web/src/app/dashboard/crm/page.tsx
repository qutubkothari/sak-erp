"use client";

import {
  FormEvent,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bot,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  GitBranch,
  Import,
  MessageSquareText,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  UserRoundCheck,
  UsersRound,
  X,
} from "lucide-react";
import { apiClient } from "../../../../lib/api-client";
import {
  ErpActionableError,
  ErpProgressiveSection,
  ErpWorkspaceState,
} from "@/components/ui/ErpPrimitives";
import { confirmDialog } from "@/components/ui/ConfirmDialog";
import CommercialWorkspace from "./CommercialWorkspace";
import RevenueOperationsWorkspace from "./RevenueOperationsWorkspace";
import {
  hasModulePermission,
  hasScreenPermission,
  readStoredUser,
  shouldEnforcePermissions,
  type StoredUser,
} from "../../../lib/rbac";

type Stage = {
  id: string;
  stage_code: string;
  stage_name: string;
  probability: number;
  colour?: string;
  is_closed: boolean;
  is_won: boolean;
  leads?: Lead[];
  value?: number;
};

type User = { id: string; name: string; email?: string };
type SalesPoolUser = User & { is_salesperson: boolean };
type IntakeSettings = {
  auto_assign_enabled: boolean;
  assignment_strategy: "ROUND_ROBIN" | "MANUAL";
  auto_create_confidence: number;
  email_intake_enabled: boolean;
  whatsapp_intake_enabled: boolean;
};
type IntakeMessage = {
  id: string;
  channel: string;
  sender_name?: string;
  sender_address?: string;
  subject?: string;
  body_preview?: string;
  classification: string;
  confidence: number;
  rationale?: string;
  decision: string;
  received_at: string;
  fallback_used?: boolean;
  lead?: { id: string; lead_number: string; company_name: string };
};
type ActivityRow = {
  id: string;
  activity_type: string;
  subject: string;
  notes?: string;
  status: string;
  scheduled_at?: string;
  completed_at?: string;
};
type RequirementRow = {
  id: string;
  requirement_number: string;
  title: string;
  business_requirement?: string;
  module?: string;
  classification: string;
  priority: string;
  status: string;
  target_date?: string;
  created_at: string;
};
type Lead = {
  id: string;
  lead_number: string;
  company_name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  source: string;
  territory?: string;
  industry?: string;
  product_interest?: string;
  requirement?: string;
  expected_value: number;
  currency_code: string;
  priority: string;
  probability: number;
  lead_score?: number;
  score_explanation?: string[];
  stage_id: string;
  stage?: Stage;
  owner_user_id?: string;
  owner?: User;
  next_follow_up_at?: string;
  expected_close_date?: string;
  customer_id?: string;
  quotation_id?: string;
  activities?: ActivityRow[];
  stage_history?: any[];
};

type Dashboard = {
  kpis: Record<string, number>;
  stages: Stage[];
  leads: Lead[];
  recommended_actions: Array<{
    type: string;
    priority: string;
    lead_id: string;
    title: string;
    action: string;
  }>;
  notifications: Array<{
    id: string;
    title: string;
    message?: string;
    lead_id: string;
    notification_type: string;
    lead?: { lead_number: string; company_name: string };
  }>;
  metadata: {
    stages: Stage[];
    users: User[];
    sources: string[];
    assignment_rules: any[];
    inbound_channels: Array<{
      id: string;
      channel_code: string;
      channel_name: string;
      is_active: boolean;
      last_received_at?: string;
    }>;
    intake_settings: IntakeSettings;
    sales_pool: SalesPoolUser[];
    email_receipt_routes: Array<{
      id: string;
      email_address: string;
      route_name: string;
      is_active: boolean;
      last_received_at?: string;
    }>;
    email_provider: {
      configured: boolean;
      fetching_enabled: boolean;
      account?: string;
    };
  };
  readiness: {
    ready: boolean;
    active_assignment_rules: number;
    configured_rule_owners: number;
    department_sales_candidates: number;
    active_inbound_channels: number;
    whatsapp_capture_active: boolean;
    intake_review_pending: number;
    auto_assignment_enabled: boolean;
    email_intake_enabled: boolean;
    warnings: string[];
  };
};

type Customer360 = {
  customer: any;
  crm: { leads: any[]; activities: any[] };
  sales: { quotations: any[]; orders: any[] };
  finance: { invoices: any[]; outstanding: number };
  service: { tickets: any[]; installed_assets: any[] };
};

const EMPTY_LEAD = {
  company_name: "",
  contact_person: "",
  email: "",
  phone: "",
  source: "MANUAL",
  campaign: "",
  territory: "",
  industry: "",
  product_interest: "",
  requirement: "",
  expected_value: "",
  currency_code: "INR",
  priority: "MEDIUM",
  next_follow_up_at: "",
  expected_close_date: "",
};

const EMPTY_ACTIVITY = {
  activity_type: "FOLLOW_UP",
  subject: "",
  notes: "",
  scheduled_at: "",
};

const EMPTY_REQUIREMENT = {
  title: "",
  business_requirement: "",
  module: "",
  classification: "OTHER",
  priority: "MEDIUM",
  target_date: "",
};

const DEFAULT_INTAKE_SETTINGS: IntakeSettings = {
  auto_assign_enabled: false,
  assignment_strategy: "MANUAL",
  auto_create_confidence: 0.72,
  email_intake_enabled: false,
  whatsapp_intake_enabled: true,
};

const field =
  "w-full rounded-xl border border-[#D9C9AC] bg-white px-3 py-2.5 text-sm text-[#2F241B] outline-none transition focus:border-[#8B6F47] focus:ring-2 focus:ring-[#EADCC4]";

function money(value: any, currency = "INR") {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency || "INR"} ${amount.toLocaleString("en-IN")}`;
  }
}

function when(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '\"' && quoted && text[index + 1] === '\"') {
      value += '\"';
      index += 1;
    } else if (char === '\"') quoted = !quoted;
    else if (char === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else value += char;
  }
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) =>
    header
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_"),
  );
  return rows
    .slice(1)
    .map((values) =>
      Object.fromEntries(
        headers.map((header, index) => [header, values[index] || ""]),
      ),
    );
}

function Kpi({ label, value, icon: Icon, tone = "blue" }: any) {
  const tones: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    violet: "bg-violet-50 text-violet-700",
  };
  return (
    <article className="rounded-2xl border border-[#E7DBC5] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-[#7A6555]">
            {label}
          </p>
          <p className="mt-1 text-2xl font-black text-[#2F241B]">{value}</p>
        </div>
        <span className={`rounded-xl p-2.5 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </article>
  );
}

function CrmPageContent() {
  const searchParams = useSearchParams();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [data, setData] = useState<Dashboard | null>(null);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [view, setView] = useState<
    | "pipeline"
    | "leads"
    | "accounts"
    | "contacts"
    | "opportunities"
    | "revenue"
    | "followups"
    | "intake"
    | "rules"
  >("pipeline");
  const [query, setQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [showCreate, setShowCreate] = useState(false);
  const [mergeTargetId, setMergeTargetId] = useState("");
  const [customer360, setCustomer360] = useState<Customer360 | null>(null);
  const [leadForm, setLeadForm] = useState<any>(EMPTY_LEAD);
  const [recoverableLeadDraft, setRecoverableLeadDraft] = useState<{
    savedAt: string;
    formData: typeof EMPTY_LEAD;
  } | null>(null);
  const [selected, setSelected] = useState<Lead | null>(null);
  const [activityForm, setActivityForm] = useState(EMPTY_ACTIVITY);
  const [editingActivity, setEditingActivity] = useState<ActivityRow | null>(null);
  const [editedActivityForm, setEditedActivityForm] = useState({
    ...EMPTY_ACTIVITY,
    status: "OPEN",
  });
  const [showConversion, setShowConversion] = useState(false);
  const [conversionForm, setConversionForm] = useState<any>({});
  const [recoverableActivityDraft, setRecoverableActivityDraft] = useState<{
    savedAt: string;
    formData: typeof EMPTY_ACTIVITY;
  } | null>(null);
  const [ruleForm, setRuleForm] = useState({
    rule_name: "",
    strategy: "LOAD_BALANCED",
    source_filter: "",
    territory_filter: "",
    industry_filter: "",
    product_filter: "",
    assignee_user_ids: [] as string[],
  });
  const [channelForm, setChannelForm] = useState({
    channel_code: "WEBSITE",
    channel_name: "",
  });
  const [channelToken, setChannelToken] = useState("");
  const [ownerSearch, setOwnerSearch] = useState("");
  const [intake, setIntake] = useState<IntakeMessage[]>([]);
  const [intakeFilter, setIntakeFilter] = useState("REVIEW");
  const [intakeSettings, setIntakeSettings] = useState<IntakeSettings>(
    DEFAULT_INTAKE_SETTINGS,
  );
  const [salesPoolIds, setSalesPoolIds] = useState<string[]>([]);
  const [emailRouteForm, setEmailRouteForm] = useState({
    route_name: "Sales enquiries",
    email_address: "",
  });
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [selectedIntakeIds, setSelectedIntakeIds] = useState<string[]>([]);

  const permissionRequired = shouldEnforcePermissions(user);
  const draftIdentity = useMemo(() => {
    const stored: any = readStoredUser();
    const tenantId =
      stored?.tenantId ||
      (typeof window !== "undefined" ? localStorage.getItem("tenantId") : "") ||
      "tenant";
    return `${tenantId}:${stored?.id || stored?.userId || stored?.email || "user"}`;
  }, []);
  const leadDraftStorageKey = `mizantra:crm-lead-draft:${draftIdentity}`;
  const activityDraftStorageKey = selected
    ? `mizantra:crm-activity-draft:${draftIdentity}:${selected.id}`
    : "";
  const hasLeadDraftContent = Boolean(
    leadForm.company_name ||
      leadForm.contact_person ||
      leadForm.email ||
      leadForm.phone ||
      leadForm.campaign ||
      leadForm.territory ||
      leadForm.industry ||
      leadForm.product_interest ||
      leadForm.requirement ||
      leadForm.expected_value ||
      leadForm.next_follow_up_at ||
      leadForm.expected_close_date,
  );
  const hasActivityDraftContent = Boolean(
    activityForm.subject || activityForm.notes || activityForm.scheduled_at,
  );
  const allowed = (
    action: "view" | "create" | "edit" | "delete" | "approve" | "download",
  ) =>
    !permissionRequired ||
    hasScreenPermission(user, "/dashboard/crm", action) ||
    hasModulePermission(user, "Sales Management", action);

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      setData(await apiClient.get<Dashboard>("/crm/dashboard"));
    } catch (err: any) {
      setError(err?.message || "Unable to load the CRM workspace.");
    } finally {
      setBusy(false);
    }
  }, []);

  const loadIntake = useCallback(async () => {
    try {
      const suffix = intakeFilter === "ALL" ? "" : `?decision=${intakeFilter}`;
      setIntake(
        await apiClient.get<IntakeMessage[]>(`/crm/intake/messages${suffix}`),
      );
    } catch (err: any) {
      setError(err?.message || "Unable to load the CRM intake queue.");
    }
  }, [intakeFilter]);

  useEffect(() => {
    setUser(readStoredUser());
    load();
  }, [load]);
  useEffect(() => {
    if (!data?.metadata) return;
    setIntakeSettings({
      ...DEFAULT_INTAKE_SETTINGS,
      ...(data.metadata.intake_settings || {}),
    });
    setSalesPoolIds(
      (data.metadata.sales_pool || [])
        .filter((candidate) => candidate.is_salesperson)
        .map((candidate) => candidate.id),
    );
  }, [data?.metadata]);
  useEffect(() => {
    const requested = searchParams.get("view");
    if (!requested) {
      setView("pipeline");
      return;
    }
    if (
      [
        "pipeline",
        "leads",
        "accounts",
        "contacts",
        "opportunities",
        "revenue",
        "followups",
        "intake",
        "rules",
      ].includes(requested || "")
    ) {
      setView(
        requested as
          | "pipeline"
          | "leads"
          | "accounts"
          | "contacts"
          | "opportunities"
          | "revenue"
          | "followups"
          | "intake"
          | "rules",
      );
    }
  }, [searchParams]);
  useEffect(() => {
    if (view === "intake") void loadIntake();
  }, [view, loadIntake]);

  useEffect(() => {
    if (!showCreate || !hasLeadDraftContent) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(
          leadDraftStorageKey,
          JSON.stringify({ version: 1, savedAt: new Date().toISOString(), formData: leadForm }),
        );
      } catch {
        // Draft recovery is best-effort; the normal save flow remains available.
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [hasLeadDraftContent, leadDraftStorageKey, leadForm, showCreate]);

  useEffect(() => {
    if (!selected || !activityDraftStorageKey || !hasActivityDraftContent) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(
          activityDraftStorageKey,
          JSON.stringify({ version: 1, savedAt: new Date().toISOString(), formData: activityForm }),
        );
      } catch {
        // Draft recovery is best-effort; the normal save flow remains available.
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [activityDraftStorageKey, activityForm, hasActivityDraftContent, selected]);

  useEffect(() => {
    if (!hasLeadDraftContent && !hasActivityDraftContent) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasActivityDraftContent, hasLeadDraftContent]);

  function readDraft<T>(storageKey: string): { savedAt: string; formData: T } | null {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || "null");
      return parsed?.version === 1 && parsed?.formData && parsed?.savedAt ? parsed : null;
    } catch {
      return null;
    }
  }

  function openLeadCreate() {
    setLeadForm(EMPTY_LEAD);
    setRecoverableLeadDraft(readDraft<typeof EMPTY_LEAD>(leadDraftStorageKey));
    setShowCreate(true);
  }

  async function closeLeadCreate() {
    let localDraftSaved = !hasLeadDraftContent;
    if (hasLeadDraftContent) {
      try {
        localStorage.setItem(
          leadDraftStorageKey,
          JSON.stringify({
            version: 1,
            savedAt: new Date().toISOString(),
            formData: leadForm,
          }),
        );
        localDraftSaved = true;
      } catch {
        localDraftSaved = false;
      }
    }
    if (
      hasLeadDraftContent &&
      !(await confirmDialog({
        title: "Close lead capture?",
        message: localDraftSaved
          ? "Your unfinished lead is saved locally on this browser and can be restored next time."
          : "This browser could not store the unfinished lead. Closing now will discard these details.",
        confirmLabel: "Close",
        variant: "warning",
      }))
    )
      return;
    setShowCreate(false);
    setLeadForm(EMPTY_LEAD);
    setRecoverableLeadDraft(null);
  }

  function restoreLeadDraft() {
    if (!recoverableLeadDraft) return;
    setLeadForm(recoverableLeadDraft.formData);
    setRecoverableLeadDraft(null);
  }

  function restoreActivityDraft() {
    if (!recoverableActivityDraft) return;
    setActivityForm(recoverableActivityDraft.formData);
    setRecoverableActivityDraft(null);
  }

  function closeLeadPanel() {
    if (selected && hasActivityDraftContent && activityDraftStorageKey) {
      try {
        localStorage.setItem(
          activityDraftStorageKey,
          JSON.stringify({
            version: 1,
            savedAt: new Date().toISOString(),
            formData: activityForm,
          }),
        );
      } catch {
        // The activity remains untouched if browser storage is unavailable.
      }
    }
    setSelected(null);
    setActivityForm(EMPTY_ACTIVITY);
    setEditingActivity(null);
    setEditedActivityForm({ ...EMPTY_ACTIVITY, status: "OPEN" });
    setShowConversion(false);
    setConversionForm({});
    setRecoverableActivityDraft(null);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.leads || []).filter((lead) => {
      const searchable = [
        lead.lead_number,
        lead.company_name,
        lead.contact_person,
        lead.email,
        lead.phone,
        lead.product_interest,
      ]
        .join(" ")
        .toLowerCase();
      return (
        (!q || searchable.includes(q)) &&
        (ownerFilter === "ALL" || lead.owner_user_id === ownerFilter) &&
        (sourceFilter === "ALL" || lead.source === sourceFilter)
      );
    });
  }, [data, query, ownerFilter, sourceFilter]);

  const matchingOwners = useMemo(() => {
    const query = ownerSearch.trim().toLowerCase();
    if (!query) return data?.metadata.users || [];
    return (data?.metadata.users || []).filter((candidate) =>
      [candidate.name, candidate.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [data?.metadata.users, ownerSearch]);

  async function openLead(id: string) {
    setSaving(true);
    try {
      setSelected(await apiClient.get<Lead>(`/crm/leads/${id}`));
      setActivityForm(EMPTY_ACTIVITY);
      setRecoverableActivityDraft(
        readDraft<typeof EMPTY_ACTIVITY>(
          `mizantra:crm-activity-draft:${draftIdentity}:${id}`,
        ),
      );
    } catch (err: any) {
      setError(err?.message || "Unable to open lead.");
    } finally {
      setSaving(false);
    }
  }

  async function createLead(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const created = await apiClient.post<Lead>("/crm/leads", {
        ...leadForm,
        expected_value: Number(leadForm.expected_value || 0),
        next_follow_up_at: leadForm.next_follow_up_at || null,
        expected_close_date: leadForm.expected_close_date || null,
      });
      setShowCreate(false);
      setLeadForm(EMPTY_LEAD);
      localStorage.removeItem(leadDraftStorageKey);
      setRecoverableLeadDraft(null);
      setMessage(
        `Lead ${created.lead_number} created${created.owner_user_id ? " and assigned" : " for manual assignment"}.`,
      );
      await load();
      await openLead(created.id);
    } catch (err: any) {
      setError(err?.message || "Unable to create lead.");
    } finally {
      setSaving(false);
    }
  }

  async function changeStage(stageId: string) {
    if (!selected) return;
    const target = data?.metadata.stages.find((stage) => stage.id === stageId);
    let reason = "";
    if (target?.stage_code === "LOST") {
      reason = window.prompt("Why was this opportunity lost?") || "";
      if (!reason) return;
    }
    setSaving(true);
    try {
      const updated = await apiClient.post<Lead>(
        `/crm/leads/${selected.id}/stage`,
        { stage_id: stageId, reason },
      );
      setSelected(updated);
      setMessage(
        `Moved to ${updated.stage?.stage_name || target?.stage_name}.`,
      );
      await load();
    } catch (err: any) {
      setError(err?.message || "Unable to move the lead.");
    } finally {
      setSaving(false);
    }
  }

  async function assign(ownerUserId = "") {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await apiClient.post<Lead>(
        `/crm/leads/${selected.id}/assign`,
        { owner_user_id: ownerUserId },
      );
      setSelected(updated);
      setMessage(
        `Lead assigned to ${updated.owner?.name || "the selected owner"}.`,
      );
      await load();
    } catch (err: any) {
      setError(err?.message || "Unable to assign the lead.");
    } finally {
      setSaving(false);
    }
  }

  async function addActivity(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      await apiClient.post(`/crm/leads/${selected.id}/activities`, {
        ...activityForm,
        scheduled_at: activityForm.scheduled_at || null,
      });
      localStorage.removeItem(activityDraftStorageKey);
      setActivityForm(EMPTY_ACTIVITY);
      setRecoverableActivityDraft(null);
      setMessage("Activity saved and the next action was updated.");
      await openLead(selected.id);
      await load();
    } catch (err: any) {
      setError(err?.message || "Unable to save activity.");
    } finally {
      setSaving(false);
    }
  }

  async function completeActivity(activity: ActivityRow) {
    const outcome =
      window.prompt("Outcome / result of this activity") || "Completed";
    setSaving(true);
    try {
      await apiClient.patch(`/crm/activities/${activity.id}/complete`, {
        outcome,
      });
      if (selected) await openLead(selected.id);
      await load();
    } catch (err: any) {
      setError(err?.message || "Unable to complete activity.");
    } finally {
      setSaving(false);
    }
  }

  function editActivity(activity: ActivityRow) {
    setEditingActivity(activity);
    setEditedActivityForm({
      activity_type: activity.activity_type || "FOLLOW_UP",
      subject: activity.subject || "",
      notes: activity.notes || "",
      scheduled_at: activity.scheduled_at ? activity.scheduled_at.slice(0, 16) : "",
      status: activity.status || "OPEN",
    });
  }

  async function saveEditedActivity(event: FormEvent) {
    event.preventDefault();
    if (!editingActivity || !editedActivityForm.subject.trim()) return;
    setSaving(true);
    setError("");
    try {
      if (editedActivityForm.status === "COMPLETED") {
        await apiClient.patch(`/crm/activities/${editingActivity.id}/complete`, {
          outcome: editedActivityForm.notes || editedActivityForm.subject,
        });
        setMessage("Follow-up updated and marked complete.");
      } else {
        await apiClient.patch(`/crm/activities/${editingActivity.id}`, {
          activity_type: editedActivityForm.activity_type,
          subject: editedActivityForm.subject.trim(),
          notes: editedActivityForm.notes,
          scheduled_at: editedActivityForm.scheduled_at || null,
        });
        setMessage("Follow-up updated.");
      }
      if (selected) await openLead(selected.id);
      await load();
      setEditingActivity(null);
    } catch (err: any) {
      setError(err?.message || "Unable to update follow-up.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteActivity(activity: ActivityRow) {
    const confirmed = await confirmDialog({
      title: "Delete follow-up",
      message: `Delete the open follow-up "${activity.subject}"?`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    setSaving(true);
    try {
      await apiClient.delete(`/crm/activities/${activity.id}`);
      setMessage("Follow-up deleted.");
      if (selected) await openLead(selected.id);
      await load();
    } catch (err: any) {
      setError(err?.message || "Unable to delete follow-up.");
    } finally {
      setSaving(false);
    }
  }

  async function convert() {
    if (!selected) return;
    setSaving(true);
    try {
      const result = await apiClient.post<any>(
        `/crm/leads/${selected.id}/convert`,
        conversionForm,
      );
      setMessage(
        `Converted to customer ${result.customer?.customer_code || "successfully"}. You can now prepare the quotation.`,
      );
      await openLead(selected.id);
      await load();
      setShowConversion(false);
    } catch (err: any) {
      setError(err?.message || "Unable to convert the lead.");
    } finally {
      setSaving(false);
    }
  }

  async function createRule(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      await apiClient.post("/crm/assignment-rules", ruleForm);
      setRuleForm({
        rule_name: "",
        strategy: "LOAD_BALANCED",
        source_filter: "",
        territory_filter: "",
        industry_filter: "",
        product_filter: "",
        assignee_user_ids: [],
      });
      setMessage("Assignment rule activated.");
      await load();
    } catch (err: any) {
      setError(err?.message || "Unable to save assignment rule.");
    } finally {
      setSaving(false);
    }
  }

  async function createInboundChannel(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setChannelToken("");
    try {
      const result = await apiClient.post<any>(
        "/crm/inbound-channels",
        channelForm,
      );
      setChannelForm({ channel_code: "WEBSITE", channel_name: "" });
      setChannelToken(result.token || "");
      setMessage(
        "Inbound channel created. Copy the token now; it will not be shown again.",
      );
      await load();
    } catch (err: any) {
      setError(err?.message || "Unable to create inbound channel.");
    } finally {
      setSaving(false);
    }
  }

  async function rotateInboundChannel(id: string) {
    if (
      !window.confirm(
        "Rotate this channel token? The previous token will stop working immediately.",
      )
    )
      return;
    setSaving(true);
    try {
      const result = await apiClient.post<any>(
        `/crm/inbound-channels/${id}/rotate-token`,
        {},
      );
      setChannelToken(result.token || "");
      setMessage(
        "Token rotated. Copy the new token now; it will not be shown again.",
      );
      await load();
    } catch (err: any) {
      setError(err?.message || "Unable to rotate channel token.");
    } finally {
      setSaving(false);
    }
  }

  async function importCsv(file?: File) {
    if (!file) return;
    setSaving(true);
    setError("");
    try {
      const rows = parseCsv(await file.text());
      if (!rows.length)
        throw new Error(
          "The CSV must contain a header and at least one lead row.",
        );
      const result = await apiClient.post<any>("/crm/leads/import", { rows });
      setMessage(
        `${result.created?.length || 0} leads imported, ${result.reused?.length || 0} already existed, ${result.rejected?.length || 0} rejected.`,
      );
      await load();
    } catch (err: any) {
      setError(err?.message || "Unable to import leads.");
    } finally {
      setSaving(false);
    }
  }

  async function mergeSelectedLead() {
    if (
      !selected ||
      !mergeTargetId ||
      !window.confirm(
        "Merge this duplicate into the selected retained lead? The duplicate will be hidden, while its activities are preserved.",
      )
    )
      return;
    setSaving(true);
    try {
      const retained = await apiClient.post<Lead>(
        `/crm/leads/${selected.id}/merge`,
        {
          target_lead_id: mergeTargetId,
          reason: "Duplicate consolidated by CRM user.",
        },
      );
      setSelected(retained);
      setMergeTargetId("");
      setMessage(`Duplicate consolidated into ${retained.lead_number}.`);
      await load();
    } catch (err: any) {
      setError(err?.message || "Unable to merge the duplicate lead.");
    } finally {
      setSaving(false);
    }
  }

  async function openCustomer360(customerId?: string) {
    if (!customerId) return;
    setSaving(true);
    try {
      setCustomer360(
        await apiClient.get<Customer360>(`/crm/customers/${customerId}/360`),
      );
    } catch (err: any) {
      setError(err?.message || "Unable to load Customer 360.");
    } finally {
      setSaving(false);
    }
  }

  async function resolveReminder(id: string) {
    setSaving(true);
    try {
      await apiClient.patch(`/crm/notifications/${id}/resolve`, {});
      await load();
    } catch (err: any) {
      setError(err?.message || "Unable to resolve the reminder.");
    } finally {
      setSaving(false);
    }
  }

  async function saveIntakeControls(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiClient.patch("/crm/intake/settings", intakeSettings);
      await apiClient.patch("/crm/sales-pool", { user_ids: salesPoolIds });
      setMessage(
        intakeSettings.auto_assign_enabled
          ? "Intelligent intake enabled with round-robin salesperson assignment."
          : "Intelligent intake enabled in manual assignment mode.",
      );
      await load();
    } catch (err: any) {
      setError(err?.message || "Unable to save CRM intake controls.");
    } finally {
      setSaving(false);
    }
  }

  async function createEmailRoute(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiClient.post("/crm/email-receipt-routes", emailRouteForm);
      setEmailRouteForm({ route_name: "Sales enquiries", email_address: "" });
      setMessage(
        "Email receipt address configured for intelligent CRM classification.",
      );
      await load();
    } catch (err: any) {
      setError(
        err?.message || "Unable to configure the email receipt address.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleEmailRoute(id: string, active: boolean) {
    setSaving(true);
    try {
      await apiClient.patch(`/crm/email-receipt-routes/${id}`, {
        is_active: active,
      });
      await load();
    } catch (err: any) {
      setError(err?.message || "Unable to update the email receipt route.");
    } finally {
      setSaving(false);
    }
  }

  async function reviewIntake(id: string, action: "CREATE_LEAD" | "IGNORE") {
    setSaving(true);
    setError("");
    try {
      await apiClient.post(`/crm/intake/messages/${id}/review`, { action });
      setMessage(
        action === "CREATE_LEAD"
          ? "Reviewed message promoted to a CRM lead."
          : "Reviewed message marked irrelevant.",
      );
      await Promise.all([loadIntake(), load()]);
    } catch (err: any) {
      setError(err?.message || "Unable to review the intake message.");
    } finally {
      setSaving(false);
    }
  }

  async function permanentlyDeleteLeads(ids: string[]) {
    const uniqueIds = Array.from(new Set(ids));
    if (!uniqueIds.length) return;
    const confirmation = `DELETE ${uniqueIds.length} LEADS`;
    if (
      window.prompt(
        `This permanently deletes the selected lead records and their CRM activities.\n\nConverted, Won, quotation-linked, or merge-retaining leads will be protected.\n\nType ${confirmation} to continue.`,
      ) !== confirmation
    )
      return;
    setSaving(true);
    setError("");
    try {
      const result = await apiClient.post<any>("/crm/leads/bulk-delete", {
        ids: uniqueIds,
        confirmation,
      });
      const deletedCount = result.deleted?.length || 0;
      const blockedCount = result.blocked?.length || 0;
      setSelectedLeadIds([]);
      if (
        selected &&
        result.deleted?.some((row: any) => row.id === selected.id)
      )
        setSelected(null);
      setMessage(
        `${deletedCount} lead${deletedCount === 1 ? "" : "s"} permanently deleted${blockedCount ? `; ${blockedCount} protected because downstream records exist` : ""}.`,
      );
      if (blockedCount)
        setError(
          result.blocked
            .map((row: any) => `${row.lead_number || row.id}: ${row.reason}`)
            .join("\n"),
        );
      await load();
    } catch (err: any) {
      setError(err?.message || "Unable to delete the selected leads.");
    } finally {
      setSaving(false);
    }
  }

  async function permanentlyDeleteIntake(ids: string[]) {
    const uniqueIds = Array.from(new Set(ids));
    if (!uniqueIds.length) return;
    const confirmation = `DELETE ${uniqueIds.length} ENQUIRIES`;
    if (
      window.prompt(
        `This permanently removes the selected messages from the CRM intake ledger. Any CRM leads already created from them will remain until separately deleted.\n\nType ${confirmation} to continue.`,
      ) !== confirmation
    )
      return;
    setSaving(true);
    setError("");
    try {
      const result = await apiClient.post<any>(
        "/crm/intake/messages/bulk-delete",
        { ids: uniqueIds, confirmation },
      );
      const deletedCount = result.deleted?.length || 0;
      setSelectedIntakeIds([]);
      setMessage(
        `${deletedCount} intake enquir${deletedCount === 1 ? "y" : "ies"} permanently deleted${result.linked_leads_preserved ? `; ${result.linked_leads_preserved} linked lead(s) preserved` : ""}.`,
      );
      await Promise.all([loadIntake(), load()]);
    } catch (err: any) {
      setError(err?.message || "Unable to delete the selected enquiries.");
    } finally {
      setSaving(false);
    }
  }

  const meta = data?.metadata;
  if (permissionRequired && !allowed("view")) {
    return (
      <main className="min-h-screen bg-[#F7F3EA] p-3 md:p-6">
        <ErpWorkspaceState
          mode="restricted"
          title="CRM access is restricted"
          description="Your current role does not include access to CRM records. Ask an administrator to grant the required CRM screen permission."
          action={
            <Link
              href="/dashboard"
              className="rounded-md bg-[#8B6F47] px-4 py-2 text-sm font-semibold text-white hover:bg-[#6F4E37]"
            >
              Return to Dashboard
            </Link>
          }
          className="mx-auto mt-20 max-w-xl"
        />
      </main>
    );
  }
  return (
    <main className="min-h-screen bg-[#F7F3EA] p-3 text-[#2F241B] md:p-6">
      <div className="mx-auto max-w-[1500px] space-y-4">
        {view === "pipeline" && (
        <header className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#203A43] via-[#2C5364] to-[#167D7F] p-5 text-white shadow-lg md:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-teal-100">
                <Sparkles className="h-4 w-4" /> Mizantra Intelligence
              </p>
              <h1 className="mt-2 text-3xl font-black">Intelligent CRM</h1>
              <p className="mt-2 max-w-3xl text-sm text-teal-50">
                One connected prospect journey from first enquiry and
                intelligent assignment through quotation, order, collection,
                installed asset and service.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard/active-planner"
                className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/20"
              >
                <Bot className="h-4 w-4" /> Ask Mizantra
              </Link>
              <button
                onClick={load}
                className="rounded-xl border border-white/30 p-2.5 hover:bg-white/20"
                title="Refresh"
              >
                <RefreshCw
                  className={`h-5 w-5 ${busy ? "animate-spin" : ""}`}
                />
              </button>
              {allowed("create") && (
                <>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-bold hover:bg-white/20">
                    <Import className="h-4 w-4" /> Import CSV
                    <input
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      disabled={saving}
                      onChange={(event) => {
                        void importCsv(event.target.files?.[0]);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <button
                    onClick={openLeadCreate}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#F2C66D] px-4 py-2.5 text-sm font-black text-[#3A2A17] hover:bg-[#FFD986]"
                  >
                    <Plus className="h-4 w-4" /> New lead
                  </button>
                </>
              )}
            </div>
          </div>
        </header>
        )}

        {error && (
          <ErpActionableError
            title="CRM action needs attention"
            message={error}
            nextStep="Review the highlighted record and required fields, then retry. Existing information on this screen is preserved."
            actionLabel="Dismiss"
            onAction={() => setError("")}
          />
        )}
        {message && (
          <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{message}</span>
            <button className="ml-auto" onClick={() => setMessage("")}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {view === "pipeline" && data?.readiness && !data.readiness.ready && (
          <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-wide">
                  CRM go-live readiness
                </p>
                <ul className="mt-1 list-disc pl-5 text-sm">
                  {data.readiness.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
              {allowed("edit") && (
                <button
                  onClick={() => setView("rules")}
                  className="shrink-0 rounded-xl border border-amber-400 bg-white px-4 py-2 text-sm font-black"
                >
                  Complete CRM setup
                </button>
              )}
            </div>
          </section>
        )}

        {view === "pipeline" && data && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Kpi
            label="Open leads"
            value={data?.kpis.open_leads || 0}
            icon={UsersRound}
          />
          <Kpi
            label="My leads"
            value={data?.kpis.my_open_leads || 0}
            icon={UserRoundCheck}
            tone="violet"
          />
          <Kpi
            label="Follow-ups due"
            value={data?.kpis.follow_ups_due || 0}
            icon={CalendarClock}
            tone="red"
          />
          <Kpi
            label="Pipeline"
            value={money(data?.kpis.pipeline_value)}
            icon={CircleDollarSign}
            tone="green"
          />
          <Kpi
            label="Weighted forecast"
            value={money(data?.kpis.weighted_pipeline)}
            icon={GitBranch}
            tone="amber"
          />
          <Kpi
            label="Unassigned"
            value={data?.kpis.unassigned || 0}
            icon={AlertCircle}
            tone="red"
          />
        </section>
        )}

        <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-[#E7DBC5] bg-white p-1.5 shadow-sm">
          {[
            ["pipeline", "Pipeline", GitBranch],
            ["leads", "All leads", UsersRound],
            ["accounts", "Accounts", UsersRound],
            ["contacts", "Contacts", UserRoundCheck],
            ["opportunities", "Opportunities", CircleDollarSign],
            ["revenue", "Revenue operations", Sparkles],
            ["followups", "Follow-ups", Activity],
            [
              "intake",
              `Unified inbox${data?.readiness?.intake_review_pending ? ` (${data.readiness.intake_review_pending})` : ""}`,
              MessageSquareText,
            ],
            ["rules", "Assignment rules", Settings2],
          ].map(([key, label, Icon]: any) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold ${view === key ? "bg-[#3E2A1F] text-white" : "text-[#6F5A49] hover:bg-[#F7F3EA]"}`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>

        {!(
          [
            "rules",
            "intake",
            "accounts",
            "contacts",
            "opportunities",
            "revenue",
          ] as string[]
        ).includes(view) && (
          <section className="grid gap-3 rounded-2xl border border-[#E7DBC5] bg-white p-3 shadow-sm md:grid-cols-[1fr_220px_200px]">
            <label className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-[#9A8069]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search company, contact, phone, product or lead number…"
                className={`${field} pl-9`}
              />
            </label>
            <select
              className={field}
              value={ownerFilter}
              onChange={(event) => setOwnerFilter(event.target.value)}
            >
              <option value="ALL">All owners</option>
              {meta?.users.map((user) => (
                <option data-i18n-skip key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
            <select
              className={field}
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value)}
            >
              <option value="ALL">All sources</option>
              {meta?.sources.map((source) => (
                <option key={source}>{source}</option>
              ))}
            </select>
          </section>
        )}

        {(["accounts", "contacts", "opportunities"] as string[]).includes(
          view,
        ) && (
          <CommercialWorkspace
            mode={view as "accounts" | "contacts" | "opportunities"}
            users={meta?.users || []}
            canCreate={allowed("create")}
            canEdit={allowed("edit")}
          />
        )}

        {view === "revenue" && (
          <RevenueOperationsWorkspace
            users={meta?.users || []}
            leads={(data?.leads || []).map((lead) => ({
              id: lead.id,
              lead_number: lead.lead_number,
              company_name: lead.company_name,
            }))}
            canCreate={allowed("create")}
            canEdit={allowed("edit")}
          />
        )}

        {busy && !data ? (
          <ErpWorkspaceState
            mode="loading"
            title="Loading CRM workspace"
            description="Preparing pipeline, follow-ups, inbox and commercial records."
          />
        ) : null}

        {view === "pipeline" && data && (
          <section className="overflow-x-auto pb-3">
            <div className="flex min-w-max gap-3">
              {data.stages.map((stage) => {
                const stageLeads = (stage.leads || []).filter((lead) =>
                  filtered.some((item) => item.id === lead.id),
                );
                return (
                  <div
                    key={stage.id}
                    className="w-[300px] shrink-0 rounded-2xl border border-[#E7DBC5] bg-[#FBF9F5]"
                  >
                    <div
                      className="border-b border-[#E7DBC5] p-3"
                      style={{
                        borderTop: `4px solid ${stage.colour || "#8B6F47"}`,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <b>{stage.stage_name}</b>
                        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold">
                          {stageLeads.length}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#7A6555]">
                        {stage.probability}% probability ·{" "}
                        {money(
                          stageLeads.reduce(
                            (sum, lead) =>
                              sum + Number(lead.expected_value || 0),
                            0,
                          ),
                        )}
                      </p>
                    </div>
                    <div className="max-h-[560px] space-y-2 overflow-y-auto p-2">
                      {stageLeads.map((lead) => (
                        <button
                          key={lead.id}
                          onClick={() => openLead(lead.id)}
                          className="w-full rounded-xl border border-[#E7DBC5] bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#B08D57] hover:shadow-md"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <b className="text-sm">{lead.company_name}</b>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${lead.priority === "URGENT" || lead.priority === "HIGH" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-600"}`}
                            >
                              {lead.priority}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[#806D5C]">
                            {lead.product_interest ||
                              lead.requirement ||
                              "Requirement not recorded"}
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                              Score {Math.round(Number(lead.lead_score || 0))}
                            </span>
                          </div>
                          <div className="mt-3 flex items-end justify-between">
                            <span>
                              <b className="block text-sm">
                                {money(lead.expected_value, lead.currency_code)}
                              </b>
                              <small className="text-[#8A7767]" data-i18n-skip>
                                {lead.owner?.name || "Unassigned"}
                              </small>
                            </span>
                            <ArrowRight className="h-4 w-4 text-[#9B7A4E]" />
                          </div>
                          {lead.next_follow_up_at && (
                            <p className="mt-2 border-t pt-2 text-[11px] text-[#8A5A28]">
                              Next: {when(lead.next_follow_up_at)}
                            </p>
                          )}
                        </button>
                      ))}
                      {!stageLeads.length && (
                        <p className="p-6 text-center text-xs text-[#9A8878]">
                          No matching leads
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {view === "leads" && (
          <section className="overflow-hidden rounded-2xl border border-[#E7DBC5] bg-white shadow-sm">
            {allowed("delete") && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-[#FBF8F2] px-4 py-3">
                <label className="flex items-center gap-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={
                      filtered.length > 0 &&
                      filtered.every((lead) =>
                        selectedLeadIds.includes(lead.id),
                      )
                    }
                    onChange={(event) =>
                      setSelectedLeadIds(
                        event.target.checked
                          ? Array.from(
                              new Set([
                                ...selectedLeadIds,
                                ...filtered.map((lead) => lead.id),
                              ]),
                            )
                          : selectedLeadIds.filter(
                              (id) => !filtered.some((lead) => lead.id === id),
                            ),
                      )
                    }
                  />
                  Select all filtered ({filtered.length})
                </label>
                <button
                  type="button"
                  disabled={saving || selectedLeadIds.length === 0}
                  onClick={() => permanentlyDeleteLeads(selectedLeadIds)}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-black text-red-700 disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" /> Delete selected (
                  {selectedLeadIds.length})
                </button>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-[1050px] w-full text-sm">
                <thead className="bg-[#F1E9DC] text-left text-xs uppercase text-[#6F5A49]">
                  <tr>
                    {allowed("delete") && <th className="w-12 p-3">Select</th>}
                    <th className="p-3">Lead / Prospect</th>
                    <th className="p-3">Stage</th>
                    <th className="p-3">Score</th>
                    <th className="p-3">Owner</th>
                    <th className="p-3">Source</th>
                    <th className="p-3">Next action</th>
                    <th className="p-3 text-right">Expected value</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((lead) => (
                    <tr
                      key={lead.id}
                      onClick={() => openLead(lead.id)}
                      className="cursor-pointer border-t border-[#EFE5D5] hover:bg-[#FCF8F0]"
                    >
                      {allowed("delete") && (
                        <td
                          className="p-3"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            aria-label={`Select ${lead.lead_number}`}
                            checked={selectedLeadIds.includes(lead.id)}
                            onChange={(event) =>
                              setSelectedLeadIds(
                                event.target.checked
                                  ? [...selectedLeadIds, lead.id]
                                  : selectedLeadIds.filter(
                                      (id) => id !== lead.id,
                                    ),
                              )
                            }
                          />
                        </td>
                      )}
                      <td className="p-3">
                        <b>{lead.company_name}</b>
                        <small className="block text-[#806D5C]">
                          {lead.lead_number} ·{" "}
                          {lead.contact_person || lead.phone || "No contact"}
                        </small>
                      </td>
                      <td className="p-3">
                        <span
                          className="rounded-full px-2 py-1 text-xs font-bold text-white"
                          style={{
                            background: lead.stage?.colour || "#64748B",
                          }}
                        >
                          {lead.stage?.stage_name}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-indigo-700">
                        {Math.round(Number(lead.lead_score || 0))}/100
                      </td>
                      <td className="p-3" data-i18n-skip>
                        {lead.owner?.name || "Unassigned"}
                      </td>
                      <td className="p-3">{lead.source}</td>
                      <td className="p-3">{when(lead.next_follow_up_at)}</td>
                      <td className="p-3 text-right font-bold">
                        {money(lead.expected_value, lead.currency_code)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!filtered.length && (
              <p className="p-10 text-center text-sm text-[#806D5C]">
                No leads match these filters.
              </p>
            )}
          </section>
        )}

        {view === "followups" && (
          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <section className="rounded-2xl border border-[#E7DBC5] bg-white p-4">
              <h2 className="font-black">Follow-up worklist</h2>
              <div className="mt-3 space-y-2">
                {filtered
                  .filter((lead) => lead.next_follow_up_at)
                  .sort((a, b) =>
                    String(a.next_follow_up_at).localeCompare(
                      String(b.next_follow_up_at),
                    ),
                  )
                  .map((lead) => (
                    <button
                      key={lead.id}
                      onClick={() => openLead(lead.id)}
                      className="flex w-full items-center justify-between gap-4 rounded-xl border p-3 text-left hover:bg-[#FCF8F0]"
                    >
                      <span>
                        <b>{lead.company_name}</b>
                        <small className="block text-[#806D5C]">
                          <span data-i18n-skip>{lead.owner?.name || "Unassigned"}</span> ·{" "}
                          {lead.stage?.stage_name}
                        </small>
                      </span>
                      <span className="text-right text-xs font-bold text-[#9A5B20]">
                        {when(lead.next_follow_up_at)}
                      </span>
                    </button>
                  ))}
                {!filtered.some((lead) => lead.next_follow_up_at) && (
                  <p className="p-8 text-center text-sm text-[#806D5C]">
                    No scheduled follow-ups.
                  </p>
                )}
              </div>
            </section>
            <aside className="rounded-2xl bg-[#203A43] p-4 text-white">
              <p className="flex items-center gap-2 text-xs font-bold uppercase text-teal-200">
                <Sparkles className="h-4 w-4" /> Recommended now
              </p>
              <div className="mt-3 space-y-2">
                {data?.notifications.map((notice) => (
                  <div
                    key={notice.id}
                    className="rounded-xl bg-amber-50 p-3 text-[#3A2A17]"
                  >
                    <button
                      onClick={() => openLead(notice.lead_id)}
                      className="w-full text-left"
                    >
                      <b className="text-sm">{notice.title}</b>
                      {notice.message && (
                        <p className="mt-1 text-xs text-[#6F5A49]">
                          {notice.message}
                        </p>
                      )}
                    </button>
                    {allowed("edit") && (
                      <button
                        onClick={() => resolveReminder(notice.id)}
                        className="mt-2 text-xs font-bold text-emerald-800"
                      >
                        Mark resolved
                      </button>
                    )}
                  </div>
                ))}
                {data?.recommended_actions.map((action) => (
                  <button
                    key={`${action.type}-${action.lead_id}`}
                    onClick={() => openLead(action.lead_id)}
                    className="w-full rounded-xl bg-white/10 p-3 text-left hover:bg-white/20"
                  >
                    <b className="text-sm">{action.title}</b>
                    <p className="mt-1 text-xs text-teal-100">
                      {action.action}
                    </p>
                  </button>
                ))}
                {!data?.recommended_actions.length && (
                  <p className="text-sm text-teal-100">
                    No urgent CRM action right now.
                  </p>
                )}
              </div>
            </aside>
          </div>
        )}

        {view === "intake" && (
          <section className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-[#E7DBC5] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-[#8B6F47]">
                  Omnichannel decision ledger
                </p>
                <h2 className="text-xl font-black">
                  Intelligent intake review
                </h2>
                <p className="text-sm text-[#6F5A49]">
                  Only confident new enquiries become leads. Discussions,
                  orders, support, finance and irrelevant messages remain
                  separately classified.
                </p>
              </div>
              <div className="flex gap-2">
                <select
                  className={field}
                  value={intakeFilter}
                  onChange={(event) => setIntakeFilter(event.target.value)}
                >
                  <option value="REVIEW">Needs review</option>
                  <option value="LEAD_CREATED">Leads created</option>
                  <option value="ACTIVITY_LINKED">Linked discussions</option>
                  <option value="IGNORED">Ignored</option>
                  <option value="ALL">All decisions</option>
                </select>
                <button
                  type="button"
                  onClick={loadIntake}
                  className="rounded-xl border px-3 py-2"
                  title="Refresh intake"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                {allowed("delete") && (
                  <button
                    type="button"
                    disabled={saving || selectedIntakeIds.length === 0}
                    onClick={() => permanentlyDeleteIntake(selectedIntakeIds)}
                    className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-black text-red-700 disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" /> Delete (
                    {selectedIntakeIds.length})
                  </button>
                )}
              </div>
            </div>
            {allowed("delete") && intake.length > 0 && (
              <label className="flex items-center gap-2 rounded-xl border border-[#E7DBC5] bg-white px-4 py-3 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={intake.every((item) =>
                    selectedIntakeIds.includes(item.id),
                  )}
                  onChange={(event) =>
                    setSelectedIntakeIds(
                      event.target.checked
                        ? Array.from(
                            new Set([
                              ...selectedIntakeIds,
                              ...intake.map((item) => item.id),
                            ]),
                          )
                        : selectedIntakeIds.filter(
                            (id) => !intake.some((item) => item.id === id),
                          ),
                    )
                  }
                />
                Select all displayed enquiries ({intake.length})
              </label>
            )}
            <div className="grid gap-3">
              {intake.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-[#E7DBC5] bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {allowed("delete") && (
                          <input
                            type="checkbox"
                            aria-label={`Select enquiry ${item.subject || item.id}`}
                            checked={selectedIntakeIds.includes(item.id)}
                            onChange={(event) =>
                              setSelectedIntakeIds(
                                event.target.checked
                                  ? [...selectedIntakeIds, item.id]
                                  : selectedIntakeIds.filter(
                                      (id) => id !== item.id,
                                    ),
                              )
                            }
                          />
                        )}
                        <span className="rounded-full bg-[#203A43] px-2 py-1 text-xs font-bold text-white">
                          {item.channel}
                        </span>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-bold ${item.classification === "NEW_ENQUIRY" ? "bg-emerald-50 text-emerald-700" : item.classification === "SPAM" || item.classification === "IRRELEVANT" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-800"}`}
                        >
                          {item.classification.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs font-bold text-[#806D5C]">
                          {Math.round(Number(item.confidence || 0) * 100)}%
                          confidence
                        </span>
                        {item.fallback_used && (
                          <span className="rounded bg-red-50 px-2 py-1 text-xs font-bold text-red-700">
                            AI fallback - review required
                          </span>
                        )}
                      </div>
                      <h3 className="mt-2 font-black">
                        {item.subject ||
                          item.sender_name ||
                          item.sender_address ||
                          "Inbound message"}
                      </h3>
                      <p className="text-xs text-[#806D5C]">
                        {item.sender_name || "Unknown sender"}{" "}
                        {item.sender_address ? `- ${item.sender_address}` : ""}{" "}
                        - {when(item.received_at)}
                      </p>
                      {item.body_preview && (
                        <p className="mt-3 whitespace-pre-wrap rounded-xl bg-[#F7F3EA] p-3 text-sm">
                          {item.body_preview.slice(0, 1200)}
                        </p>
                      )}
                      {item.rationale && (
                        <p className="mt-2 text-xs text-[#6F5A49]">
                          <b>Why:</b> {item.rationale}
                        </p>
                      )}
                      {item.lead && (
                        <button
                          type="button"
                          onClick={() => openLead(item.lead!.id)}
                          className="mt-2 text-sm font-bold text-[#7A4D20] underline"
                        >
                          Open {item.lead.lead_number} -{" "}
                          {item.lead.company_name}
                        </button>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {item.decision === "REVIEW" && allowed("edit") && (
                        <>
                          <button
                            disabled={saving}
                            onClick={() => reviewIntake(item.id, "CREATE_LEAD")}
                            className="rounded-xl bg-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                          >
                            Confirm enquiry
                          </button>
                          <button
                            disabled={saving}
                            onClick={() => reviewIntake(item.id, "IGNORE")}
                            className="rounded-xl border px-3 py-2 text-sm font-bold disabled:opacity-50"
                          >
                            Mark not relevant
                          </button>
                        </>
                      )}
                      <span className="rounded-xl bg-[#F2EBDD] px-3 py-2 text-xs font-bold">
                        {item.decision.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
              {!intake.length && (
                <p className="rounded-2xl border border-dashed bg-white p-12 text-center text-sm text-[#806D5C]">
                  No intake messages match this decision filter.
                </p>
              )}
            </div>
          </section>
        )}

        {view === "rules" && allowed("edit") && (
          <div className="grid gap-4 lg:grid-cols-[390px_1fr]">
            {data?.readiness && (
              <section className="rounded-2xl border border-[#E7DBC5] bg-white p-5 shadow-sm lg:col-span-2">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase text-[#8B6F47]">
                      Guided activation
                    </p>
                    <h2 className="text-xl font-black">
                      CRM readiness checklist
                    </h2>
                    <p className="text-sm text-[#6F5A49]">
                      Complete both controls before using automatic intake in a
                      client demonstration.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div
                      className={`rounded-xl border px-4 py-3 text-sm ${data.readiness.configured_rule_owners >= 2 || data.readiness.department_sales_candidates >= 2 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-300 bg-amber-50 text-amber-900"}`}
                    >
                      <b className="block">1. Assignment coverage</b>
                      {data.readiness.configured_rule_owners} configured
                      owner(s)
                    </div>
                    <div
                      className={`rounded-xl border px-4 py-3 text-sm ${data.readiness.active_inbound_channels > 0 || data.readiness.whatsapp_capture_active ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-300 bg-amber-50 text-amber-900"}`}
                    >
                      <b className="block">2. Lead intake</b>
                      {data.readiness.active_inbound_channels} external
                      channel(s)
                      {data.readiness.whatsapp_capture_active
                        ? " + WhatsApp"
                        : ""}
                    </div>
                  </div>
                </div>
              </section>
            )}
            <form
              onSubmit={saveIntakeControls}
              className="space-y-5 rounded-2xl border border-[#E7DBC5] bg-white p-5 shadow-sm lg:col-span-2"
            >
              <div>
                <p className="text-xs font-bold uppercase text-[#8B6F47]">
                  Intelligent intake policy
                </p>
                <h2 className="text-xl font-black">
                  Lead creation and assignment controls
                </h2>
                <p className="text-sm text-[#6F5A49]">
                  AI classifies every received message. Only a confident NEW
                  ENQUIRY creates a lead; all uncertain decisions remain visible
                  in Intake review.
                </p>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                <label className="flex items-start gap-3 rounded-xl border p-4">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={intakeSettings.auto_assign_enabled}
                    onChange={(event) =>
                      setIntakeSettings({
                        ...intakeSettings,
                        auto_assign_enabled: event.target.checked,
                        assignment_strategy: event.target.checked
                          ? "ROUND_ROBIN"
                          : "MANUAL",
                      })
                    }
                  />
                  <span>
                    <b className="block">Auto-assign enquiries</b>
                    <small className="text-[#6F5A49]">
                      Round robin across employees marked as salespeople. Turn
                      off for manual assignment.
                    </small>
                  </span>
                </label>
                <label className="flex items-start gap-3 rounded-xl border p-4">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={intakeSettings.email_intake_enabled}
                    onChange={(event) =>
                      setIntakeSettings({
                        ...intakeSettings,
                        email_intake_enabled: event.target.checked,
                      })
                    }
                  />
                  <span>
                    <b className="block">Receive email enquiries</b>
                    <small className="text-[#6F5A49]">
                      Classify mail sent to the configured receipt addresses.
                    </small>
                  </span>
                </label>
                <label className="rounded-xl border p-4 text-sm font-bold">
                  Auto-create confidence:{" "}
                  {Math.round(
                    Number(intakeSettings.auto_create_confidence) * 100,
                  )}
                  %
                  <input
                    type="range"
                    min="0.5"
                    max="0.95"
                    step="0.01"
                    className="mt-3 w-full"
                    value={intakeSettings.auto_create_confidence}
                    onChange={(event) =>
                      setIntakeSettings({
                        ...intakeSettings,
                        auto_create_confidence: Number(event.target.value),
                      })
                    }
                  />
                  <small className="mt-1 block font-normal text-[#6F5A49]">
                    Below this threshold, the message waits for human review.
                  </small>
                </label>
              </div>
              <div>
                <div className="flex items-end justify-between gap-3">
                  <span>
                    <b className="block">Salesperson pool</b>
                    <small className="text-[#6F5A49]">
                      Select only employees who should receive enquiries.
                    </small>
                  </span>
                  <b className="text-sm">{salesPoolIds.length} selected</b>
                </div>
                <div className="mt-2 grid max-h-48 gap-2 overflow-y-auto rounded-xl border p-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(meta?.sales_pool || []).map((candidate) => (
                    <label
                      key={candidate.id}
                      className="flex items-center gap-2 rounded-lg bg-[#F7F3EA] px-3 py-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={salesPoolIds.includes(candidate.id)}
                        onChange={(event) =>
                          setSalesPoolIds(
                            event.target.checked
                              ? [...salesPoolIds, candidate.id]
                              : salesPoolIds.filter(
                                  (id) => id !== candidate.id,
                                ),
                          )
                        }
                      />
                      <span>
                        <b className="block" data-i18n-skip>{candidate.name}</b>
                        <small>{candidate.email}</small>
                      </span>
                    </label>
                  ))}
                </div>
                {intakeSettings.auto_assign_enabled &&
                  salesPoolIds.length === 0 && (
                    <p className="mt-2 text-sm font-bold text-red-700">
                      Select at least one salesperson before enabling automatic
                      assignment.
                    </p>
                  )}
              </div>
              <button
                disabled={
                  saving ||
                  (intakeSettings.auto_assign_enabled &&
                    salesPoolIds.length === 0)
                }
                className="rounded-xl bg-[#3E2A1F] px-5 py-2.5 font-bold text-white disabled:opacity-40"
              >
                Save intake and assignment policy
              </button>
            </form>

            <section className="space-y-4 rounded-2xl border border-[#E7DBC5] bg-white p-5 shadow-sm lg:col-span-2">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-[#8B6F47]">
                    Email receipt configuration
                  </p>
                  <h2 className="text-xl font-black">Enquiry inbox routes</h2>
                  <p className="text-sm text-[#6F5A49]">
                    Mail is fetched by the connected server account, then routed
                    to this tenant by the To/CC/BCC address before AI
                    classification.
                  </p>
                  <p
                    className={`mt-2 text-xs font-bold ${meta?.email_provider?.configured && meta?.email_provider?.fetching_enabled ? "text-emerald-700" : "text-amber-700"}`}
                  >
                    Provider:{" "}
                    {meta?.email_provider?.configured
                      ? meta.email_provider.account || "Configured"
                      : "Not configured"}{" "}
                    - Fetching{" "}
                    {meta?.email_provider?.fetching_enabled
                      ? "enabled"
                      : "disabled"}
                  </p>
                </div>
                <form
                  onSubmit={createEmailRoute}
                  className="grid min-w-0 gap-2 sm:grid-cols-[180px_280px_auto]"
                >
                  <input
                    required
                    className={field}
                    placeholder="Route name"
                    value={emailRouteForm.route_name}
                    onChange={(event) =>
                      setEmailRouteForm({
                        ...emailRouteForm,
                        route_name: event.target.value,
                      })
                    }
                  />
                  <input
                    required
                    type="email"
                    className={field}
                    placeholder="enquiries@company.com"
                    value={emailRouteForm.email_address}
                    onChange={(event) =>
                      setEmailRouteForm({
                        ...emailRouteForm,
                        email_address: event.target.value,
                      })
                    }
                  />
                  <button
                    disabled={saving}
                    className="rounded-xl bg-[#3E2A1F] px-4 py-2.5 font-bold text-white disabled:opacity-50"
                  >
                    Add receipt
                  </button>
                </form>
              </div>
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {(meta?.email_receipt_routes || []).map((route) => (
                  <div key={route.id} className="rounded-xl border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <b>{route.route_name}</b>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ${route.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                      >
                        {route.is_active ? "ACTIVE" : "PAUSED"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm">{route.email_address}</p>
                    <p className="text-xs text-[#806D5C]">
                      Last received: {when(route.last_received_at)}
                    </p>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        toggleEmailRoute(route.id, !route.is_active)
                      }
                      className="mt-2 rounded-lg border px-3 py-1.5 text-xs font-bold"
                    >
                      {route.is_active ? "Pause" : "Activate"}
                    </button>
                  </div>
                ))}
                {!meta?.email_receipt_routes?.length && (
                  <p className="text-sm text-[#806D5C]">
                    No email receipt address configured.
                  </p>
                )}
              </div>
            </section>
            <form
              onSubmit={createRule}
              className="space-y-3 rounded-2xl border border-[#E7DBC5] bg-white p-5 shadow-sm"
            >
              <div>
                <p className="text-xs font-bold uppercase text-[#8B6F47]">
                  Routing intelligence
                </p>
                <h2 className="text-xl font-black">New assignment rule</h2>
                <p className="text-sm text-[#6F5A49]">
                  Rules are evaluated by priority. Blank filters match any lead.
                </p>
              </div>
              <input
                required
                className={field}
                placeholder="Rule name"
                value={ruleForm.rule_name}
                onChange={(e) =>
                  setRuleForm({ ...ruleForm, rule_name: e.target.value })
                }
              />
              <select
                className={field}
                value={ruleForm.strategy}
                onChange={(e) =>
                  setRuleForm({ ...ruleForm, strategy: e.target.value })
                }
              >
                <option value="LOAD_BALANCED">Load balanced</option>
                <option value="ROUND_ROBIN">Round robin</option>
                <option value="FIXED_OWNER">Fixed owner</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select
                  className={field}
                  value={ruleForm.source_filter}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, source_filter: e.target.value })
                  }
                >
                  <option value="">Any source</option>
                  {meta?.sources.map((source) => (
                    <option key={source}>{source}</option>
                  ))}
                </select>
                <input
                  className={field}
                  placeholder="Territory contains…"
                  value={ruleForm.territory_filter}
                  onChange={(e) =>
                    setRuleForm({
                      ...ruleForm,
                      territory_filter: e.target.value,
                    })
                  }
                />
                <input
                  className={field}
                  placeholder="Industry contains…"
                  value={ruleForm.industry_filter}
                  onChange={(e) =>
                    setRuleForm({
                      ...ruleForm,
                      industry_filter: e.target.value,
                    })
                  }
                />
                <input
                  className={field}
                  placeholder="Product contains…"
                  value={ruleForm.product_filter}
                  onChange={(e) =>
                    setRuleForm({ ...ruleForm, product_filter: e.target.value })
                  }
                />
              </div>
              <label className="block text-xs font-bold uppercase text-[#6F5A49]">
                Eligible sales owners
              </label>
              <div className="flex gap-2">
                <label className="relative min-w-0 flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-[#9A8069]" />
                  <input
                    className={`${field} pl-9`}
                    placeholder="Search owner name or email"
                    value={ownerSearch}
                    onChange={(event) => setOwnerSearch(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setRuleForm({ ...ruleForm, assignee_user_ids: [] })
                  }
                  className="shrink-0 rounded-xl border border-[#D8C8AE] px-3 text-sm font-bold"
                >
                  Clear
                </button>
              </div>
              <div className="max-h-44 space-y-1 overflow-y-auto rounded-xl border p-2">
                {matchingOwners.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[#F7F3EA]"
                  >
                    <input
                      type="checkbox"
                      checked={ruleForm.assignee_user_ids.includes(user.id)}
                      onChange={(event) =>
                        setRuleForm({
                          ...ruleForm,
                          assignee_user_ids: event.target.checked
                            ? [...ruleForm.assignee_user_ids, user.id]
                            : ruleForm.assignee_user_ids.filter(
                                (id) => id !== user.id,
                              ),
                        })
                      }
                    />
                    <span data-i18n-skip>{user.name}</span>
                  </label>
                ))}
                {!matchingOwners.length && (
                  <p className="p-3 text-center text-sm text-[#806D5C]">
                    No matching active user.
                  </p>
                )}
              </div>
              <p
                className={`text-xs font-bold ${ruleForm.assignee_user_ids.length === 1 && ruleForm.strategy !== "FIXED_OWNER" ? "text-amber-700" : "text-[#6F5A49]"}`}
              >
                {ruleForm.assignee_user_ids.length} owner(s) selected
                {ruleForm.assignee_user_ids.length === 1 &&
                ruleForm.strategy !== "FIXED_OWNER"
                  ? " — select at least two to avoid a single-owner dependency."
                  : ""}
              </p>
              <button
                disabled={saving}
                className="w-full rounded-xl bg-[#3E2A1F] px-4 py-2.5 font-bold text-white disabled:opacity-50"
              >
                Activate rule
              </button>
            </form>
            <section className="rounded-2xl border border-[#E7DBC5] bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black">Active routing rules</h2>
              <div className="mt-3 space-y-2">
                {meta?.assignment_rules.map((rule: any) => (
                  <div key={rule.id} className="rounded-xl border p-3">
                    <div className="flex items-center justify-between">
                      <b>{rule.rule_name}</b>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ${rule.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                      >
                        {rule.is_active ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[#6F5A49]">
                      {rule.strategy.replace(/_/g, " ")} ·{" "}
                      {rule.assignee_user_ids?.length || 0} owner(s)
                    </p>
                    <p className="mt-1 text-xs text-[#8A7767]">
                      {[
                        rule.source_filter && `Source: ${rule.source_filter}`,
                        rule.territory_filter &&
                          `Territory: ${rule.territory_filter}`,
                        rule.industry_filter &&
                          `Industry: ${rule.industry_filter}`,
                        rule.product_filter &&
                          `Product: ${rule.product_filter}`,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Matches all leads"}
                    </p>
                  </div>
                ))}
                {!meta?.assignment_rules.length && (
                  <p className="p-8 text-center text-sm text-[#806D5C]">
                    No custom rules yet. Until configured, leads are
                    load-balanced across active Sales department users.
                  </p>
                )}
              </div>
            </section>
            <section className="rounded-2xl border border-[#E7DBC5] bg-white p-5 shadow-sm lg:col-span-2">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase text-[#8B6F47]">
                    Secure intake
                  </p>
                  <h2 className="text-xl font-black">
                    Website, email and API lead channels
                  </h2>
                  <p className="text-sm text-[#6F5A49]">
                    Each channel receives a tenant-scoped token. Tokens are
                    shown once and only their irreversible hashes are stored.
                  </p>
                  <Link
                    href="/dashboard/settings/whatsapp"
                    className="mt-1 inline-block text-sm font-bold text-[#7A4D20] underline"
                  >
                    Configure WhatsApp capture
                  </Link>
                </div>
                <form
                  onSubmit={createInboundChannel}
                  className="grid min-w-0 gap-2 sm:grid-cols-[150px_240px_auto]"
                >
                  <select
                    className={field}
                    value={channelForm.channel_code}
                    onChange={(e) =>
                      setChannelForm({
                        ...channelForm,
                        channel_code: e.target.value,
                      })
                    }
                  >
                    <option>WEBSITE</option>
                    <option>EMAIL</option>
                    <option>CAMPAIGN</option>
                    <option>API</option>
                  </select>
                  <input
                    required
                    className={field}
                    placeholder="Channel name"
                    value={channelForm.channel_name}
                    onChange={(e) =>
                      setChannelForm({
                        ...channelForm,
                        channel_name: e.target.value,
                      })
                    }
                  />
                  <button
                    disabled={saving}
                    className="rounded-xl bg-[#3E2A1F] px-4 py-2.5 font-bold text-white disabled:opacity-50"
                  >
                    Create channel
                  </button>
                </form>
              </div>
              {channelToken && (
                <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3">
                  <b className="text-sm text-amber-900">
                    Copy this token now—it will not be shown again.
                  </b>
                  <div className="mt-2 flex gap-2">
                    <code className="min-w-0 flex-1 overflow-x-auto rounded bg-white px-3 py-2 text-xs">
                      {channelToken}
                    </code>
                    <button
                      type="button"
                      onClick={() =>
                        navigator.clipboard.writeText(channelToken)
                      }
                      className="rounded border bg-white px-3 py-2 text-sm font-bold"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {(meta?.inbound_channels || []).map((channel) => (
                  <div key={channel.id} className="rounded-xl border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <b>{channel.channel_name}</b>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ${channel.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                      >
                        {channel.is_active ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#806D5C]">
                      {channel.channel_code} · Last intake:{" "}
                      {when(channel.last_received_at)}
                    </p>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => rotateInboundChannel(channel.id)}
                      className="mt-2 rounded-lg border px-3 py-1.5 text-xs font-bold"
                    >
                      Rotate token
                    </button>
                  </div>
                ))}
                {!meta?.inbound_channels?.length && (
                  <p className="text-sm text-[#806D5C]">
                    No external lead channels configured yet. WhatsApp intake is
                    controlled separately in Settings → WhatsApp Business.
                  </p>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/45 p-0 md:items-center md:p-5">
          <form
            onSubmit={createLead}
            className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl md:rounded-3xl md:p-6"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-[#8B6F47]">
                  Intelligent capture
                </p>
                <h2 className="text-2xl font-black">Create a lead</h2>
                <p className="text-sm text-[#6F5A49]">
                  Duplicate checks and automatic owner assignment run when you
                  save.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void closeLeadCreate()}
                className="rounded-full bg-[#F2EBDD] p-2"
                aria-label="Close lead capture"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {recoverableLeadDraft && (
              <div className="mt-4 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Unfinished lead from {new Date(recoverableLeadDraft.savedAt).toLocaleString()} is available on this device.
                </span>
                <div className="flex gap-2">
                  <button type="button" onClick={restoreLeadDraft} className="rounded-lg bg-blue-700 px-3 py-1.5 font-bold text-white">
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem(leadDraftStorageKey);
                      setRecoverableLeadDraft(null);
                    }}
                    className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 font-bold"
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}
            <div className="mt-5 space-y-3">
              <ErpProgressiveSection
                title="Contact essentials"
                summary="Company and contact details used for duplicate checking"
                defaultOpen
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    required
                    aria-label="Company or prospect name"
                    className={field}
                    placeholder="Company / prospect name *"
                    value={leadForm.company_name}
                    onChange={(e) =>
                      setLeadForm({ ...leadForm, company_name: e.target.value })
                    }
                  />
                  <input
                    aria-label="Contact person"
                    className={field}
                    placeholder="Contact person"
                    value={leadForm.contact_person}
                    onChange={(e) =>
                      setLeadForm({
                        ...leadForm,
                        contact_person: e.target.value,
                      })
                    }
                  />
                  <input
                    type="email"
                    aria-label="Email"
                    className={field}
                    placeholder="Email"
                    value={leadForm.email}
                    onChange={(e) =>
                      setLeadForm({ ...leadForm, email: e.target.value })
                    }
                  />
                  <input
                    aria-label="Phone or WhatsApp"
                    className={field}
                    placeholder="Phone / WhatsApp"
                    value={leadForm.phone}
                    onChange={(e) =>
                      setLeadForm({ ...leadForm, phone: e.target.value })
                    }
                  />
                </div>
              </ErpProgressiveSection>
              <ErpProgressiveSection
                title="Sales context"
                summary="Source, territory, opportunity value and requirement"
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <select
                    aria-label="Lead source"
                    className={field}
                    value={leadForm.source}
                    onChange={(e) =>
                      setLeadForm({ ...leadForm, source: e.target.value })
                    }
                  >
                    {(meta?.sources || ["MANUAL"]).map((source) => (
                      <option key={source}>{source}</option>
                    ))}
                  </select>
                  <input
                    aria-label="Campaign or referral"
                    className={field}
                    placeholder="Campaign / referral"
                    value={leadForm.campaign}
                    onChange={(e) =>
                      setLeadForm({ ...leadForm, campaign: e.target.value })
                    }
                  />
                  <input
                    aria-label="Territory or city"
                    className={field}
                    placeholder="Territory / city"
                    value={leadForm.territory}
                    onChange={(e) =>
                      setLeadForm({ ...leadForm, territory: e.target.value })
                    }
                  />
                  <input
                    aria-label="Industry"
                    className={field}
                    placeholder="Industry"
                    value={leadForm.industry}
                    onChange={(e) =>
                      setLeadForm({ ...leadForm, industry: e.target.value })
                    }
                  />
                  <input
                    aria-label="Product interest"
                    className={field}
                    placeholder="Product interest"
                    value={leadForm.product_interest}
                    onChange={(e) =>
                      setLeadForm({
                        ...leadForm,
                        product_interest: e.target.value,
                      })
                    }
                  />
                  <div className="grid grid-cols-[1fr_100px] gap-2">
                    <input
                      type="number"
                      aria-label="Expected opportunity value"
                      min="0"
                      className={field}
                      placeholder="Expected value"
                      value={leadForm.expected_value}
                      onChange={(e) =>
                        setLeadForm({
                          ...leadForm,
                          expected_value: e.target.value,
                        })
                      }
                    />
                    <select
                      aria-label="Opportunity currency"
                      className={field}
                      value={leadForm.currency_code}
                      onChange={(e) =>
                        setLeadForm({
                          ...leadForm,
                          currency_code: e.target.value,
                        })
                      }
                    >
                      <option>INR</option>
                      <option>AED</option>
                      <option>USD</option>
                      <option>EUR</option>
                    </select>
                  </div>
                  <textarea
                    aria-label="Requirement or desired outcome"
                    className={`${field} md:col-span-2`}
                    rows={3}
                    placeholder="Requirement / desired outcome"
                    value={leadForm.requirement}
                    onChange={(e) =>
                      setLeadForm({ ...leadForm, requirement: e.target.value })
                    }
                  />
                </div>
              </ErpProgressiveSection>
              <ErpProgressiveSection
                title="Priority and follow-up"
                summary="Optional planning dates and the first customer action"
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <select
                    aria-label="Lead priority"
                    className={field}
                    value={leadForm.priority}
                    onChange={(e) =>
                      setLeadForm({ ...leadForm, priority: e.target.value })
                    }
                  >
                    <option>LOW</option>
                    <option>MEDIUM</option>
                    <option>HIGH</option>
                    <option>URGENT</option>
                  </select>
                  <input
                    type="date"
                    aria-label="Expected close date"
                    className={field}
                    value={leadForm.expected_close_date}
                    onChange={(e) =>
                      setLeadForm({
                        ...leadForm,
                        expected_close_date: e.target.value,
                      })
                    }
                  />
                  <label className="text-xs font-bold uppercase text-[#6F5A49] md:col-span-2">
                    First follow-up
                    <input
                      type="datetime-local"
                      className={`${field} mt-1`}
                      value={leadForm.next_follow_up_at}
                      onChange={(e) =>
                        setLeadForm({
                          ...leadForm,
                          next_follow_up_at: e.target.value,
                        })
                      }
                    />
                  </label>
                </div>
              </ErpProgressiveSection>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => void closeLeadCreate()}
                className="rounded-xl border px-4 py-2.5 font-bold"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                className="rounded-xl bg-[#3E2A1F] px-5 py-2.5 font-bold text-white disabled:opacity-50"
              >
                {saving
                  ? "Creating…"
                  : intakeSettings.auto_assign_enabled
                    ? "Create & auto-assign"
                    : "Create unassigned lead"}
              </button>
            </div>
          </form>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-[1000] bg-black/45">
          <button
            aria-label="Close lead"
            className="absolute inset-0"
            onClick={closeLeadPanel}
          />
          <aside className="absolute inset-y-0 right-0 w-full max-w-2xl overflow-y-auto bg-[#F8F4EC] shadow-2xl">
            <div className="sticky top-0 z-10 border-b bg-white p-4 md:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-[#8B6F47]">
                    {selected.lead_number}
                  </p>
                  <h2 className="text-2xl font-black">
                    {selected.company_name}
                  </h2>
                  <p className="text-sm text-[#6F5A49]">
                    {selected.contact_person || "No contact"} ·{" "}
                    {selected.phone || selected.email || "No contact details"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {allowed("delete") && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => permanentlyDeleteLeads([selected.id])}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm font-black text-red-700 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  )}
                  <button
                    onClick={closeLeadPanel}
                    className="rounded-full bg-[#F2EBDD] p-2"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-4 p-4 md:p-5">
              {error && (
                <ErpActionableError
                  title="CRM action needs attention"
                  message={error}
                  nextStep="Correct the highlighted field in this open record, then retry. Your entered information is preserved."
                  actionLabel="Dismiss"
                  onAction={() => setError("")}
                />
              )}
              <section className="rounded-2xl border bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase text-[#7A6555]">
                      Stage & probability
                    </p>
                    <select
                      disabled={
                        saving ||
                        !allowed("edit") ||
                        !!selected.stage?.is_closed
                      }
                      className={`${field} mt-1`}
                      value={selected.stage_id}
                      onChange={(e) => changeStage(e.target.value)}
                    >
                      {meta?.stages.map((stage) => (
                        <option key={stage.id} value={stage.id}>
                          {stage.stage_name} · {stage.probability}%
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase text-[#7A6555]">
                      Expected value
                    </p>
                    <b className="text-xl">
                      {money(selected.expected_value, selected.currency_code)}
                    </b>
                    <p className="mt-1 text-xs font-bold text-indigo-700">
                      Lead score {Math.round(Number(selected.lead_score || 0))}
                      /100
                    </p>
                  </div>
                </div>
                {Array.isArray(selected.score_explanation) &&
                  selected.score_explanation.length > 0 && (
                    <details className="mt-3 rounded-xl bg-indigo-50 p-3 text-xs text-indigo-900">
                      <summary className="cursor-pointer font-bold">
                        Why this score?
                      </summary>
                      <ul className="mt-2 list-disc space-y-1 pl-4">
                        {selected.score_explanation.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-bold uppercase text-[#6F5A49]">
                    Owner
                    <select
                      disabled={!allowed("edit")}
                      className={`${field} mt-1`}
                      value={selected.owner_user_id || ""}
                      onChange={(e) => assign(e.target.value)}
                    >
                      <option value="">Auto-assign</option>
                      {meta?.users.map((user) => (
                        <option data-i18n-skip key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div>
                    <p className="text-xs font-bold uppercase text-[#6F5A49]">
                      Next follow-up
                    </p>
                    <p className="mt-2 text-sm font-bold">
                      {when(selected.next_follow_up_at)}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  <p>
                    <span className="text-[#806D5C]">Source:</span>{" "}
                    {selected.source}
                  </p>
                  <p>
                    <span className="text-[#806D5C]">Territory:</span>{" "}
                    {selected.territory || "—"}
                  </p>
                  <p>
                    <span className="text-[#806D5C]">Product:</span>{" "}
                    {selected.product_interest || "—"}
                  </p>
                  <p>
                    <span className="text-[#806D5C]">Industry:</span>{" "}
                    {selected.industry || "—"}
                  </p>
                </div>
                {selected.requirement && (
                  <p className="mt-4 rounded-xl bg-[#F7F3EA] p-3 text-sm">
                    {selected.requirement}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {selected.customer_id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openCustomer360(selected.customer_id)}
                        className="rounded-xl bg-[#203A43] px-4 py-2 text-sm font-bold text-white"
                      >
                        Customer 360
                      </button>
                      <Link
                        className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white"
                        href={`/dashboard/sales?tab=customers&customer=${selected.customer_id}`}
                      >
                        Open customer
                      </Link>
                      <Link
                        className="rounded-xl border border-[#8B6F47] px-4 py-2 text-sm font-bold"
                        href={`/dashboard/sales?tab=quotations&customer=${selected.customer_id}&create=quotation&crmLead=${selected.id}&crmRef=${encodeURIComponent(selected.lead_number)}`}
                      >
                        Prepare quotation
                      </Link>
                    </>
                  ) : (
                    allowed("create") && (
                      <button
                        onClick={() => {
                          setConversionForm({
                            customer_name: selected.company_name,
                            contact_person: selected.contact_person || "",
                            email: selected.email || "",
                            phone: selected.phone || "",
                            territory: selected.territory || "",
                            industry: selected.industry || "",
                            product_interest: selected.product_interest || "",
                          });
                          setShowConversion(true);
                        }}
                        className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white"
                      >
                        Convert to customer
                      </button>
                    )
                  )}
                </div>
                {showConversion && !selected.customer_id && (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      void convert();
                    }}
                    className="mt-4 space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-black text-emerald-900">
                          Customer details for conversion
                        </p>
                        <p className="text-xs text-emerald-800">
                          Correct the customer master details before converting this lead.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowConversion(false)}
                        className="text-sm font-bold text-emerald-800"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        required
                        value={conversionForm.customer_name || ""}
                        onChange={(e) => setConversionForm({ ...conversionForm, customer_name: e.target.value })}
                        className={field}
                        placeholder="Customer/company name"
                      />
                      <input
                        value={conversionForm.contact_person || ""}
                        onChange={(e) => setConversionForm({ ...conversionForm, contact_person: e.target.value })}
                        className={field}
                        placeholder="Contact person"
                      />
                      <input
                        type="email"
                        value={conversionForm.email || ""}
                        onChange={(e) => setConversionForm({ ...conversionForm, email: e.target.value })}
                        className={field}
                        placeholder="Email"
                      />
                      <input
                        value={conversionForm.phone || ""}
                        onChange={(e) => setConversionForm({ ...conversionForm, phone: e.target.value })}
                        className={field}
                        placeholder="Phone"
                      />
                      <input
                        value={conversionForm.territory || ""}
                        onChange={(e) => setConversionForm({ ...conversionForm, territory: e.target.value })}
                        className={field}
                        placeholder="Territory"
                      />
                      <input
                        value={conversionForm.industry || ""}
                        onChange={(e) => setConversionForm({ ...conversionForm, industry: e.target.value })}
                        className={field}
                        placeholder="Industry"
                      />
                      <input
                        value={conversionForm.product_interest || ""}
                        onChange={(e) => setConversionForm({ ...conversionForm, product_interest: e.target.value })}
                        className={`${field} sm:col-span-2`}
                        placeholder="Product / solution"
                      />
                    </div>
                    <button
                      disabled={saving}
                      className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                    >
                      {saving ? "Converting…" : "Confirm conversion"}
                    </button>
                  </form>
                )}
                {allowed("edit") && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs font-bold uppercase text-amber-900">
                      Duplicate control
                    </p>
                    <div className="mt-2 flex gap-2">
                      <select
                        className={field}
                        value={mergeTargetId}
                        onChange={(event) =>
                          setMergeTargetId(event.target.value)
                        }
                      >
                        <option value="">Select the lead to retain</option>
                        {(data?.leads || [])
                          .filter((lead) => lead.id !== selected.id)
                          .map((lead) => (
                            <option key={lead.id} value={lead.id}>
                              {lead.lead_number} — {lead.company_name}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        disabled={!mergeTargetId || saving}
                        onClick={mergeSelectedLead}
                        className="shrink-0 rounded-xl border border-amber-700 px-3 text-xs font-bold text-amber-900 disabled:opacity-40"
                      >
                        Merge
                      </button>
                    </div>
                  </div>
                )}
              </section>
              {allowed("create") && (
                <form
                  onSubmit={addActivity}
                  className="rounded-2xl border bg-white p-4"
                >
                  <h3 className="flex items-center gap-2 font-black">
                    <MessageSquareText className="h-4 w-4" /> Record activity /
                    next action
                  </h3>
                  {recoverableActivityDraft && (
                    <div className="mt-3 flex flex-col gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 sm:flex-row sm:items-center sm:justify-between">
                      <span>
                        Unfinished activity from {new Date(recoverableActivityDraft.savedAt).toLocaleString()} is available.
                      </span>
                      <div className="flex gap-2">
                        <button type="button" onClick={restoreActivityDraft} className="rounded-lg bg-blue-700 px-3 py-1.5 font-bold text-white">
                          Restore
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            localStorage.removeItem(activityDraftStorageKey);
                            setRecoverableActivityDraft(null);
                          }}
                          className="rounded-lg border border-blue-300 bg-white px-3 py-1.5 font-bold"
                        >
                          Discard
                        </button>
                      </div>
                    </div>
                  )}
                  <div className="mt-3 grid gap-2 sm:grid-cols-[150px_1fr]">
                    <select
                      className={field}
                      value={activityForm.activity_type}
                      onChange={(e) =>
                        setActivityForm({
                          ...activityForm,
                          activity_type: e.target.value,
                        })
                      }
                    >
                      {[
                        "FOLLOW_UP",
                        "CALL",
                        "EMAIL",
                        "WHATSAPP",
                        "MEETING",
                        "SITE_VISIT",
                        "TASK",
                        "NOTE",
                        "DEMO",
                      ].map((type) => (
                        <option key={type}>{type.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                    <input
                      required
                      className={field}
                      placeholder="Subject / next action"
                      value={activityForm.subject}
                      onChange={(e) =>
                        setActivityForm({
                          ...activityForm,
                          subject: e.target.value,
                        })
                      }
                    />
                    <textarea
                      className={`${field} sm:col-span-2`}
                      rows={2}
                      placeholder="Notes / conversation summary"
                      value={activityForm.notes}
                      onChange={(e) =>
                        setActivityForm({
                          ...activityForm,
                          notes: e.target.value,
                        })
                      }
                    />
                    <input
                      type="datetime-local"
                      className={`${field} sm:col-span-2`}
                      value={activityForm.scheduled_at}
                      onChange={(e) =>
                        setActivityForm({
                          ...activityForm,
                          scheduled_at: e.target.value,
                        })
                      }
                    />
                  </div>
                  <button
                    disabled={saving}
                    className="mt-3 rounded-xl bg-[#3E2A1F] px-4 py-2 text-sm font-bold text-white"
                  >
                    Save activity
                  </button>
                </form>
              )}
              <section className="rounded-2xl border bg-white p-4">
                <h3 className="font-black">Relationship timeline</h3>
                <div className="mt-3 space-y-3">
                  {(selected.activities || []).map((activity) => (
                    <div
                      key={activity.id}
                      className="relative border-l-2 border-[#D8C5A7] pl-4"
                    >
                      <span className="absolute -left-[6px] top-1 h-2.5 w-2.5 rounded-full bg-[#8B6F47]" />
                      <div className="flex items-start justify-between gap-3">
                        <span>
                          <b className="text-sm">{activity.subject}</b>
                          <small className="block text-[#806D5C]">
                            {activity.activity_type.replace(/_/g, " ")} ·{" "}
                            {when(
                              activity.scheduled_at || activity.completed_at,
                            )}
                          </small>
                          {activity.notes && (
                            <p className="mt-1 text-sm">{activity.notes}</p>
                          )}
                        </span>
                        {activity.status === "OPEN" && allowed("edit") && (
                          <div className="flex shrink-0 gap-1">
                            <button
                              onClick={() => editActivity(activity)}
                              className="rounded-lg border px-2 py-1 text-xs font-bold"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => completeActivity(activity)}
                              className="rounded-lg border px-2 py-1 text-xs font-bold"
                            >
                              Complete
                            </button>
                            {allowed("delete") && (
                              <button
                                onClick={() => deleteActivity(activity)}
                                className="rounded-lg border border-red-200 px-2 py-1 text-xs font-bold text-red-700"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {!selected.activities?.length && (
                    <p className="text-sm text-[#806D5C]">
                      No activities recorded yet.
                    </p>
                  )}
                </div>
              </section>
            </div>
          </aside>
        </div>
      )}
      {editingActivity && (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/55 p-4">
          <button
            type="button"
            aria-label="Close follow-up editor"
            className="absolute inset-0"
            onClick={() => setEditingActivity(null)}
          />
          <form
            onSubmit={saveEditedActivity}
            className="relative w-full max-w-2xl space-y-4 rounded-3xl bg-white p-5 shadow-2xl md:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#8B6F47]">
                  Relationship timeline
                </p>
                <h3 className="text-xl font-black">Edit follow-up</h3>
                <p className="mt-1 text-sm text-[#6F5A49]">
                  Update all details before saving.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingActivity(null)}
                className="rounded-full bg-[#F2EBDD] p-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold uppercase text-[#6F5A49]">
                Activity type
                <select
                  className={`${field} mt-1`}
                  value={editedActivityForm.activity_type}
                  onChange={(event) =>
                    setEditedActivityForm({ ...editedActivityForm, activity_type: event.target.value })
                  }
                >
                  {["FOLLOW_UP", "CALL", "EMAIL", "WHATSAPP", "MEETING", "SITE_VISIT", "TASK", "NOTE", "DEMO"].map(
                    (type) => (
                      <option key={type} value={type}>
                        {type.replace(/_/g, " ")}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label className="text-xs font-bold uppercase text-[#6F5A49]">
                Status
                <select
                  className={`${field} mt-1`}
                  value={editedActivityForm.status}
                  onChange={(event) =>
                    setEditedActivityForm({ ...editedActivityForm, status: event.target.value })
                  }
                >
                  <option value="OPEN">Open</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </label>
              <label className="text-xs font-bold uppercase text-[#6F5A49] sm:col-span-2">
                Subject / next action
                <input
                  required
                  className={`${field} mt-1`}
                  value={editedActivityForm.subject}
                  onChange={(event) =>
                    setEditedActivityForm({ ...editedActivityForm, subject: event.target.value })
                  }
                />
              </label>
              <label className="text-xs font-bold uppercase text-[#6F5A49] sm:col-span-2">
                Notes / outcome
                <textarea
                  rows={4}
                  className={`${field} mt-1`}
                  value={editedActivityForm.notes}
                  onChange={(event) =>
                    setEditedActivityForm({ ...editedActivityForm, notes: event.target.value })
                  }
                />
              </label>
              {editedActivityForm.status === "OPEN" && (
                <label className="text-xs font-bold uppercase text-[#6F5A49] sm:col-span-2">
                  Scheduled date and time
                  <input
                    type="datetime-local"
                    className={`${field} mt-1`}
                    value={editedActivityForm.scheduled_at}
                    onChange={(event) =>
                      setEditedActivityForm({ ...editedActivityForm, scheduled_at: event.target.value })
                    }
                  />
                </label>
              )}
            </div>
            {editedActivityForm.status === "COMPLETED" && (
              <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                Saving will record the notes as the completion outcome and close this follow-up.
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditingActivity(null)} className="rounded-xl border px-4 py-2.5 font-bold">
                Cancel
              </button>
              <button disabled={saving} className="rounded-xl bg-[#3E2A1F] px-5 py-2.5 font-bold text-white disabled:opacity-50">
                {saving ? "Saving…" : "Save follow-up"}
              </button>
            </div>
          </form>
        </div>
      )}
      {customer360 && (
        <div className="fixed inset-0 z-[1100] overflow-y-auto bg-black/55 p-3 md:p-8">
          <button
            aria-label="Close Customer 360"
            className="fixed inset-0"
            onClick={() => setCustomer360(null)}
          />
          <section className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-[#F8F4EC] shadow-2xl">
            <header className="flex items-start justify-between gap-4 bg-[#203A43] p-5 text-white">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-teal-200">
                  Customer 360
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {customer360.customer.customer_name}
                </h2>
                <p className="text-sm text-teal-50">
                  {customer360.customer.customer_code ||
                    customer360.customer.email ||
                    "Connected customer record"}
                </p>
              </div>
              <button
                onClick={() => setCustomer360(null)}
                className="rounded-full bg-white/10 p-2"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi
                label="CRM leads"
                value={customer360.crm.leads.length}
                icon={UsersRound}
              />
              <Kpi
                label="Quotations"
                value={customer360.sales.quotations.length}
                icon={GitBranch}
                tone="amber"
              />
              <Kpi
                label="Sales orders"
                value={customer360.sales.orders.length}
                icon={CheckCircle2}
                tone="green"
              />
              <Kpi
                label="Outstanding"
                value={money(customer360.finance.outstanding)}
                icon={CircleDollarSign}
                tone="red"
              />
            </div>
            <div className="grid gap-4 p-4 pt-0 lg:grid-cols-2">
              {[
                [
                  "Commercial journey",
                  [
                    ...customer360.sales.quotations.map(
                      (row) => `${row.quotation_number} · ${row.status}`,
                    ),
                    ...customer360.sales.orders.map(
                      (row) => `${row.so_number} · ${row.status}`,
                    ),
                  ],
                ],
                [
                  "Finance",
                  customer360.finance.invoices.map(
                    (row) =>
                      `${row.invoice_number} · ${money(row.balance_amount)}`,
                  ),
                ],
                [
                  "Installed assets",
                  customer360.service.installed_assets.map(
                    (row) => `${row.asset_number || row.uid} · ${row.status}`,
                  ),
                ],
                [
                  "Service tickets",
                  customer360.service.tickets.map(
                    (row) => `${row.ticket_number} · ${row.status}`,
                  ),
                ],
              ].map(([title, rows]: any) => (
                <article
                  key={title}
                  className="rounded-2xl border border-[#E7DBC5] bg-white p-4"
                >
                  <h3 className="font-black">{title}</h3>
                  <div className="mt-3 space-y-2 text-sm">
                    {(rows as string[]).slice(0, 10).map((row, index) => (
                      <p
                        key={`${title}-${index}`}
                        className="rounded-lg bg-[#F7F3EA] px-3 py-2"
                      >
                        {row}
                      </p>
                    ))}
                    {!rows.length && (
                      <p className="text-[#806D5C]">No records yet.</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default function CrmPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#F7F3EA] p-3 md:p-6">
          <ErpWorkspaceState
            mode="loading"
            title="Loading CRM workspace"
            description="Preparing your customer workspace."
            className="mx-auto mt-20 max-w-xl"
          />
        </main>
      }
    >
      <CrmPageContent />
    </Suspense>
  );
}
