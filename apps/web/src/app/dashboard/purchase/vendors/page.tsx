"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Download,
  Edit,
  Eye,
  Plus,
  Save,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "../../../../../lib/api-client";
import DuplicateWarning, {
  useDuplicateDetection,
} from "../../../../components/DuplicateWarning";
import SearchableSelect from "../../../../components/SearchableSelect";
import { confirmDialog } from "../../../../components/ui/ConfirmDialog";
import {
  ErpButton,
  ErpMetricStrip,
  ErpPageHeader,
  ErpStatusBadge,
} from "../../../../components/ui/ErpPrimitives";
import {
  ListTable,
  type ListTableColumn,
} from "../../../../components/ui/ListTable";
import { SlidePanel } from "../../../../components/ui/SlidePanel";
import { exportToExcel } from "../../../../lib/export-excel";
import { hasModulePermission, isAdminLike } from "@/lib/rbac";
import { useAuthStore } from "@/stores/auth.store";

interface VendorContact {
  salutation?: string;
  name: string;
  phone: string;
  email: string;
  isDefault?: boolean;
}

interface GstVerificationResult {
  gstin?: string;
  valid?: boolean;
  portalVerified?: boolean;
  legalNameMatch?: boolean | null;
  verificationMode?: string;
  message?: string;
  details?: {
    stateName?: string | null;
    pan?: string | null;
    portalLegalName?: string | null;
    portalTradeName?: string | null;
    portalStatus?: string | null;
    portalAddress?: {
      addressLine?: string;
      street?: string;
      city?: string;
      state?: string;
      pincode?: string;
      country?: string;
      fullAddress?: string;
    } | null;
  };
}

interface Vendor {
  id: string;
  code: string;
  name: string;
  legal_name: string;
  tax_id?: string;
  category: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  billing_line2?: string;
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  payment_terms: string;
  credit_limit: number;
  rating: number;
  is_active: boolean;
  is_verified?: boolean;
  verified_at?: string | null;
  verified_by?: string | null;
  contacts?: VendorContact[];
  gst_verification?: GstVerificationResult | null;
  salutation?: string;
  country_code?: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_ifsc_code?: string;
  bank_branch?: string;
  bank_account_type?: string;
  metadata?: Record<string, any>;
}

type VendorContactForm = Required<
  Pick<VendorContact, "name" | "phone" | "email" | "isDefault">
> & {
  salutation: string;
};

type VendorFormState = {
  salutation: string;
  name: string;
  legalName: string;
  taxId: string;
  category: string;
  address: string;
  billingLine2: string;
  street: string;
  city: string;
  state: string;
  country: string;
  countryCode: string;
  pincode: string;
  paymentTerms: string;
  creditLimit: number;
  rating: number;
  isActive: boolean;
  contacts: VendorContactForm[];
  gstVerification: GstVerificationResult | null;
  bankName: string;
  bankAccountNumber: string;
  bankIfscCode: string;
  bankBranch: string;
  bankAccountType: string;
};

type FormSection =
  | "business"
  | "tax-address"
  | "contacts"
  | "commercial"
  | "bank"
  | "review";

const FORM_SECTIONS: Array<{ id: FormSection; label: string }> = [
  { id: "business", label: "Business" },
  { id: "tax-address", label: "Tax & Address" },
  { id: "contacts", label: "Contacts" },
  { id: "commercial", label: "Commercial" },
  { id: "bank", label: "Bank" },
  { id: "review", label: "Review" },
];

const CATEGORY_OPTIONS = [
  { value: "RAW_MATERIAL", label: "Raw Material" },
  { value: "COMPONENTS", label: "Components" },
  { value: "COMPONENT", label: "Component" },
  { value: "SERVICE", label: "Service" },
  { value: "CONSUMABLE", label: "Consumable" },
  { value: "SUBCONTRACTOR", label: "Subcontractor" },
  { value: "OTHER", label: "Other" },
];

const PAYMENT_TERM_OPTIONS = [
  { value: "NET_30", label: "Net 30" },
  { value: "NET_60", label: "Net 60" },
  { value: "NET_90", label: "Net 90" },
  { value: "ADVANCE", label: "Advance" },
  { value: "COD", label: "Cash on Delivery" },
];

const ACCOUNT_TYPE_OPTIONS = [
  { value: "CURRENT", label: "Current" },
  { value: "SAVINGS", label: "Savings" },
  { value: "CC", label: "Cash Credit" },
  { value: "OD", label: "Overdraft" },
];

const SALUTATION_OPTIONS = ["", "Mr.", "Mrs.", "Ms.", "Dr."].map((value) => ({
  value,
  label: value || "No title",
}));

const COUNTRY_CODE_OPTIONS = [
  "+91",
  "+1",
  "+44",
  "+971",
  "+65",
  "+60",
  "+61",
  "+49",
  "+81",
  "+86",
].map((value) => ({
  value,
  label: value,
}));

const FILTER_CATEGORY_OPTIONS = [
  { value: "ALL", label: "All categories" },
  ...CATEGORY_OPTIONS,
];
const FILTER_STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];
const FILTER_VERIFICATION_OPTIONS = [
  { value: "ALL", label: "All verification" },
  { value: "VERIFIED", label: "Verified" },
  { value: "PENDING", label: "Pending verification" },
];

const inputClass =
  "min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

function createEmptyContact(isDefault = false): VendorContactForm {
  return { salutation: "", name: "", phone: "", email: "", isDefault };
}

function createInitialFormState(): VendorFormState {
  return {
    salutation: "",
    name: "",
    legalName: "",
    taxId: "",
    category: "RAW_MATERIAL",
    address: "",
    billingLine2: "",
    street: "",
    city: "",
    state: "",
    country: "India",
    countryCode: "+91",
    pincode: "",
    paymentTerms: "NET_30",
    creditLimit: 0,
    rating: 0,
    isActive: true,
    contacts: [createEmptyContact(true)],
    gstVerification: null,
    bankName: "",
    bankAccountNumber: "",
    bankIfscCode: "",
    bankBranch: "",
    bankAccountType: "CURRENT",
  };
}

function normalizeContacts(contacts?: VendorContact[]): VendorContactForm[] {
  const normalized = (contacts || [])
    .map((contact) => ({
      salutation: String(contact.salutation || ""),
      name: String(contact.name || ""),
      phone: String(contact.phone || ""),
      email: String(contact.email || ""),
      isDefault: Boolean(contact.isDefault),
    }))
    .filter((contact) => contact.name || contact.phone || contact.email);
  if (!normalized.length) return [createEmptyContact(true)];
  const defaultIndex = normalized.findIndex((contact) => contact.isDefault);
  return normalized.map((contact, index) => ({
    ...contact,
    isDefault: index === (defaultIndex < 0 ? 0 : defaultIndex),
  }));
}

function buildPayload(form: VendorFormState) {
  const name = form.name.trim();
  return {
    ...form,
    name,
    legalName: form.legalName.trim() || name,
    taxId: form.taxId.trim().toUpperCase(),
    address: form.address.trim(),
    billingLine2: form.billingLine2.trim(),
    street: form.street.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    country: form.country.trim() || "India",
    pincode: form.pincode.trim(),
    bankName: form.bankName.trim(),
    bankAccountNumber: form.bankAccountNumber.trim(),
    bankIfscCode: form.bankIfscCode.trim().toUpperCase(),
    bankBranch: form.bankBranch.trim(),
    contacts: form.contacts
      .map((contact) => {
        const phone = contact.phone.trim();
        return {
          ...contact,
          salutation: contact.salutation.trim(),
          name: contact.name.trim(),
          phone:
            phone && !phone.startsWith("+")
              ? `${form.countryCode}${phone.replace(/\D/g, "")}`
              : phone,
          email: contact.email.trim(),
        };
      })
      .filter((contact) => contact.name || contact.phone || contact.email),
  };
}

function formatAddress(vendor: Vendor): string {
  return [
    vendor.billing_line2,
    vendor.street || vendor.address,
    vendor.city,
    vendor.state,
    vendor.pincode,
    vendor.country,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");
}

function formatCategory(value: string): string {
  return (
    CATEGORY_OPTIONS.find((option) => option.value === value)?.label ||
    value?.replace(/_/g, " ") ||
    "-"
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 border-b border-slate-100 py-2.5 last:border-b-0">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-0.5 break-words text-sm font-medium text-slate-900">
        {value || "-"}
      </div>
    </div>
  );
}

function SectionTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4 border-b border-slate-200 pb-2">
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      {description ? (
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      ) : null}
    </div>
  );
}

export default function VendorsPage() {
  const { user, hydrate } = useAuthStore();
  const canCreate = hasModulePermission(user, "Purchase Management", "create");
  const canEdit = hasModulePermission(user, "Purchase Management", "edit");
  const canDelete = hasModulePermission(user, "Purchase Management", "delete");
  const canVerify =
    isAdminLike(user) &&
    hasModulePermission(user, "Purchase Management", "approve");
  const canExport = isAdminLike(user);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [verificationFilter, setVerificationFilter] = useState("ALL");
  const [viewingVendor, setViewingVendor] = useState<Vendor | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [saving, setSaving] = useState(false);
  const [verifyingGstin, setVerifyingGstin] = useState(false);
  const [formSection, setFormSection] = useState<FormSection>("business");
  const [form, setForm] = useState<VendorFormState>(createInitialFormState());
  const { duplicateState, checkDuplicates, handleProceed, handleCancel } =
    useDuplicateDetection();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<Vendor[]>("/purchase/vendors");
      setVendors(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast.error(error?.message || "Failed to load vendors");
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const filteredVendors = useMemo(
    () =>
      vendors.filter((vendor) => {
        if (categoryFilter !== "ALL" && vendor.category !== categoryFilter)
          return false;
        if (statusFilter === "ACTIVE" && !vendor.is_active) return false;
        if (statusFilter === "INACTIVE" && vendor.is_active) return false;
        if (verificationFilter === "VERIFIED" && !vendor.is_verified)
          return false;
        if (verificationFilter === "PENDING" && vendor.is_verified)
          return false;
        return true;
      }),
    [categoryFilter, statusFilter, verificationFilter, vendors],
  );

  const metrics = useMemo(
    () => [
      { label: "Total Vendors", value: vendors.length },
      {
        label: "Active",
        value: vendors.filter((vendor) => vendor.is_active).length,
        tone: "success" as const,
      },
      {
        label: "Verified",
        value: vendors.filter((vendor) => vendor.is_verified).length,
        tone: "success" as const,
      },
      {
        label: "Pending Verification",
        value: vendors.filter((vendor) => !vendor.is_verified).length,
        tone: "warning" as const,
      },
    ],
    [vendors],
  );

  const openCreate = () => {
    setEditingVendor(null);
    setForm(createInitialFormState());
    setFormSection("business");
    setEditorOpen(true);
  };

  const openEdit = (vendor: Vendor) => {
    const metadata = vendor.metadata || {};
    setEditingVendor(vendor);
    setForm({
      salutation: vendor.salutation || metadata.salutation || "",
      name: vendor.name || "",
      legalName: vendor.legal_name || "",
      taxId: vendor.tax_id || "",
      category: vendor.category || "RAW_MATERIAL",
      address: vendor.address || "",
      billingLine2: vendor.billing_line2 || metadata.billingLine2 || "",
      street: vendor.street || "",
      city: vendor.city || "",
      state: vendor.state || "",
      country: vendor.country || "India",
      countryCode: vendor.country_code || metadata.countryCode || "+91",
      pincode: vendor.pincode || "",
      paymentTerms: vendor.payment_terms || "NET_30",
      creditLimit: Number(vendor.credit_limit || 0),
      rating: Number(vendor.rating || 0),
      isActive: vendor.is_active !== false,
      contacts: normalizeContacts(vendor.contacts),
      gstVerification: vendor.gst_verification || null,
      bankName: vendor.bank_name || metadata.bankName || "",
      bankAccountNumber:
        vendor.bank_account_number || metadata.bankAccountNumber || "",
      bankIfscCode: vendor.bank_ifsc_code || metadata.bankIfscCode || "",
      bankBranch: vendor.bank_branch || metadata.bankBranch || "",
      bankAccountType:
        vendor.bank_account_type || metadata.bankAccountType || "CURRENT",
    });
    setFormSection("business");
    setEditorOpen(true);
  };

  const persistVendor = async (payload: ReturnType<typeof buildPayload>) => {
    setSaving(true);
    try {
      if (editingVendor) {
        await apiClient.put(`/purchase/vendors/${editingVendor.id}`, payload);
        toast.success("Vendor updated successfully");
      } else {
        await apiClient.post("/purchase/vendors", payload);
        toast.success("Vendor created successfully");
      }
      setEditorOpen(false);
      setEditingVendor(null);
      await fetchVendors();
    } catch (error: any) {
      toast.error(error?.message || "Failed to save vendor");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (editingVendor ? !canEdit : !canCreate) {
      toast.error("You do not have permission to save this vendor");
      return;
    }
    const payload = buildPayload(form);
    if (!payload.name) {
      setFormSection("business");
      toast.error("Vendor name is required");
      return;
    }
    setForm(payload);
    if (editingVendor) {
      await persistVendor(payload);
      return;
    }
    await checkDuplicates(
      () => apiClient.post("/purchase/vendors/check-duplicates", payload),
      () => persistVendor(payload),
    );
  };

  const handleDelete = async (ids: string[]) => {
    if (!canDelete || !ids.length) return;
    const confirmed = await confirmDialog({
      title:
        ids.length === 1 ? "Delete Vendor" : `Delete ${ids.length} Vendors`,
      message:
        "This permanently removes the selected vendor master records. Continue?",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await Promise.all(
        ids.map((id) => apiClient.delete(`/purchase/vendors/${id}`)),
      );
      setSelectedIds([]);
      if (viewingVendor && ids.includes(viewingVendor.id))
        setViewingVendor(null);
      toast.success(
        ids.length === 1 ? "Vendor deleted" : `${ids.length} vendors deleted`,
      );
      await fetchVendors();
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete vendor");
    }
  };

  const handleVerification = async (vendor: Vendor, verify: boolean) => {
    const confirmed = await confirmDialog({
      title: verify ? "Verify Vendor" : "Remove Verification",
      message: verify
        ? `Allow ${vendor.name} for new purchasing transactions?`
        : `Block ${vendor.name} from new purchasing transactions until verified again?`,
      confirmLabel: verify ? "Verify" : "Unverify",
      variant: verify ? "info" : "warning",
    });
    if (!confirmed) return;
    try {
      const updated = await apiClient.put<Vendor>(
        `/purchase/vendors/${vendor.id}/${verify ? "verify" : "unverify"}`,
        {},
      );
      toast.success(verify ? "Vendor verified" : "Vendor verification removed");
      if (viewingVendor?.id === vendor.id) setViewingVendor(updated);
      await fetchVendors();
    } catch (error: any) {
      toast.error(error?.message || "Failed to update verification");
    }
  };

  const verifyGstin = async () => {
    if (!form.taxId.trim()) {
      toast.error("Enter GSTIN first");
      return;
    }
    try {
      setVerifyingGstin(true);
      const result = await apiClient.post<GstVerificationResult>(
        "/purchase/vendors/verify-gstin",
        {
          gstin: form.taxId.trim().toUpperCase(),
          legalName: (form.legalName || form.name).trim(),
        },
      );
      const address = result.details?.portalAddress;
      setForm((current) => ({
        ...current,
        legalName: result.details?.portalLegalName || current.legalName,
        taxId: result.gstin || current.taxId,
        billingLine2: address?.addressLine || current.billingLine2,
        street: address?.street || current.street,
        city: address?.city || current.city,
        state: address?.state || result.details?.stateName || current.state,
        country: address?.country || current.country,
        pincode: address?.pincode || current.pincode,
        address: address?.fullAddress || current.address,
        gstVerification: result,
      }));
      toast[result.valid ? "success" : "error"](
        result.message ||
          (result.valid ? "GSTIN verified" : "GSTIN verification failed"),
      );
    } catch (error: any) {
      toast.error(error?.message || "Failed to verify GSTIN");
    } finally {
      setVerifyingGstin(false);
    }
  };

  const updateContact = (
    index: number,
    key: keyof VendorContactForm,
    value: string | boolean,
  ) => {
    setForm((current) => ({
      ...current,
      contacts: current.contacts.map((contact, contactIndex) => ({
        ...contact,
        ...(key === "isDefault" && value === true
          ? { isDefault: contactIndex === index }
          : {}),
        ...(contactIndex === index ? { [key]: value } : {}),
      })),
    }));
  };

  const removeContact = (index: number) => {
    setForm((current) => {
      const contacts = current.contacts.filter(
        (_, contactIndex) => contactIndex !== index,
      );
      if (!contacts.length)
        return { ...current, contacts: [createEmptyContact(true)] };
      if (!contacts.some((contact) => contact.isDefault))
        contacts[0] = { ...contacts[0], isDefault: true };
      return { ...current, contacts };
    });
  };

  const exportVendors = () =>
    exportToExcel(
      vendors,
      [
        { header: "Code", key: "code" },
        { header: "Name", key: "name" },
        { header: "Legal Name", key: "legal_name" },
        { header: "Category", key: "category" },
        { header: "GST / Tax ID", key: "tax_id" },
        { header: "Contact Person", key: "contact_person" },
        { header: "Email", key: "email" },
        { header: "Phone", key: "phone" },
        { header: "City", key: "city" },
        { header: "State", key: "state" },
        { header: "Country", key: "country" },
        { header: "Payment Terms", key: "payment_terms" },
        { header: "Credit Limit", key: "credit_limit" },
        { header: "Rating", key: "rating" },
        { header: "Active", key: "is_active" },
        { header: "Verified", key: "is_verified" },
      ],
      `Vendors_${new Date().toISOString().slice(0, 10)}.csv`,
    );

  const columns = useMemo<Array<ListTableColumn<Vendor>>>(
    () => [
      {
        id: "code",
        label: "Code",
        accessor: (vendor) => vendor.code,
        sortable: true,
        minWidth: 110,
        cell: (vendor) => (
          <button
            className="font-semibold text-indigo-700 hover:underline"
            onClick={() => setViewingVendor(vendor)}
          >
            {vendor.code || "-"}
          </button>
        ),
      },
      {
        id: "name",
        label: "Vendor",
        accessor: (vendor) => vendor.name,
        sortable: true,
        minWidth: 250,
        searchAccessor: (vendor) =>
          `${vendor.name} ${vendor.legal_name} ${vendor.tax_id || ""}`,
        cell: (vendor) => (
          <div>
            <div className="font-semibold text-slate-950">{vendor.name}</div>
            <div className="text-xs text-slate-500">
              {vendor.legal_name || vendor.tax_id || "-"}
            </div>
          </div>
        ),
      },
      {
        id: "category",
        label: "Category",
        accessor: (vendor) => vendor.category,
        sortable: true,
        minWidth: 140,
        cell: (vendor) => formatCategory(vendor.category),
      },
      {
        id: "contact",
        label: "Primary Contact",
        accessor: (vendor) => vendor.contact_person || "",
        sortable: true,
        minWidth: 190,
        searchAccessor: (vendor) =>
          `${vendor.contact_person || ""} ${vendor.email || ""} ${vendor.phone || ""}`,
        cell: (vendor) => (
          <div>
            <div>{vendor.contact_person || "-"}</div>
            <div className="text-xs text-slate-500">
              {vendor.email || vendor.phone || ""}
            </div>
          </div>
        ),
      },
      {
        id: "location",
        label: "Location",
        accessor: (vendor) => `${vendor.city || ""} ${vendor.state || ""}`,
        sortable: true,
        minWidth: 170,
        searchAccessor: formatAddress,
        cell: (vendor) =>
          [vendor.city, vendor.state].filter(Boolean).join(", ") || "-",
      },
      {
        id: "payment_terms",
        label: "Payment Terms",
        accessor: (vendor) => vendor.payment_terms,
        sortable: true,
        minWidth: 130,
        defaultVisible: false,
      },
      {
        id: "credit_limit",
        label: "Credit Limit",
        accessor: (vendor) => vendor.credit_limit,
        sortable: true,
        minWidth: 130,
        defaultVisible: false,
        align: "right",
        cell: (vendor) =>
          vendor.credit_limit
            ? `INR ${Number(vendor.credit_limit).toLocaleString("en-IN")}`
            : "-",
      },
      {
        id: "rating",
        label: "Rating",
        accessor: (vendor) => vendor.rating,
        sortable: true,
        minWidth: 90,
        align: "center",
        cell: (vendor) =>
          vendor.rating ? Number(vendor.rating).toFixed(1) : "-",
      },
      {
        id: "status",
        label: "Status",
        accessor: (vendor) => (vendor.is_active ? "Active" : "Inactive"),
        sortable: true,
        minWidth: 105,
        align: "center",
        cell: (vendor) => (
          <ErpStatusBadge
            status={vendor.is_active ? "ACTIVE" : "INACTIVE"}
            label={vendor.is_active ? "Active" : "Inactive"}
            tone={vendor.is_active ? "success" : "danger"}
          />
        ),
      },
      {
        id: "verification",
        label: "Verification",
        accessor: (vendor) => (vendor.is_verified ? "Verified" : "Pending"),
        sortable: true,
        minWidth: 125,
        align: "center",
        cell: (vendor) => (
          <ErpStatusBadge
            status={vendor.is_verified ? "APPROVED" : "AWAITING_APPROVAL"}
            label={vendor.is_verified ? "Verified" : "Pending"}
          />
        ),
      },
      {
        id: "gst",
        label: "GST Status",
        accessor: (vendor) =>
          vendor.gst_verification?.valid ? "Verified" : "Not verified",
        sortable: true,
        minWidth: 120,
        defaultVisible: false,
        cell: (vendor) => (vendor.gst_verification?.valid ? "Verified" : "-"),
      },
      {
        id: "actions",
        label: "Actions",
        hideable: false,
        sortable: false,
        minWidth: 176,
        align: "right",
        cell: (vendor) => (
          <div className="flex items-center justify-end gap-1">
            <ErpButton
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="View vendor"
              aria-label="View vendor"
              onClick={() => setViewingVendor(vendor)}
            >
              <Eye className="h-4 w-4" />
            </ErpButton>
            {canEdit ? (
              <ErpButton
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title="Edit vendor"
                aria-label="Edit vendor"
                onClick={() => openEdit(vendor)}
              >
                <Edit className="h-4 w-4" />
              </ErpButton>
            ) : null}
            {canVerify ? (
              <ErpButton
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                title={
                  vendor.is_verified ? "Remove verification" : "Verify vendor"
                }
                aria-label={
                  vendor.is_verified ? "Remove verification" : "Verify vendor"
                }
                onClick={() => handleVerification(vendor, !vendor.is_verified)}
              >
                {vendor.is_verified ? (
                  <ShieldOff className="h-4 w-4" />
                ) : (
                  <ShieldCheck className="h-4 w-4 text-emerald-700" />
                )}
              </ErpButton>
            ) : null}
            {canDelete ? (
              <ErpButton
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-red-700"
                title="Delete vendor"
                aria-label="Delete vendor"
                onClick={() => handleDelete([vendor.id])}
              >
                <Trash2 className="h-4 w-4" />
              </ErpButton>
            ) : null}
          </div>
        ),
      },
    ],
    [canDelete, canEdit, canVerify],
  );

  const sectionIndex = FORM_SECTIONS.findIndex(
    (section) => section.id === formSection,
  );
  const defaultContact =
    form.contacts.find((contact) => contact.isDefault) || form.contacts[0];

  return (
    <div className="space-y-4">
      <ErpPageHeader
        eyebrow="PROCUREMENT MASTER DATA"
        title="Vendors"
        description="Maintain supplier identity, tax, contact, commercial, banking, and verification data."
        actions={
          <>
            {canExport && vendors.length ? (
              <ErpButton variant="secondary" onClick={exportVendors}>
                <Download className="h-4 w-4" />
                Export
              </ErpButton>
            ) : null}
            {selectedIds.length && canDelete ? (
              <ErpButton
                variant="danger"
                onClick={() => handleDelete(selectedIds)}
              >
                <Trash2 className="h-4 w-4" />
                Delete ({selectedIds.length})
              </ErpButton>
            ) : null}
            {canCreate ? (
              <ErpButton variant="primary" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                New Vendor
              </ErpButton>
            ) : null}
          </>
        }
      />

      <ErpMetricStrip metrics={metrics} loading={loading} />

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-950">
            Vendor Master
          </h2>
          <span className="text-xs text-slate-500">
            {filteredVendors.length} records
          </span>
        </div>
        <ListTable
          storageKey="vendorsTable:sap:v1"
          rows={filteredVendors}
          columns={columns}
          getRowId={(vendor) => vendor.id}
          selectable
          selectedRowIds={selectedIds}
          onSelectionChange={setSelectedIds}
          defaultPageSize={25}
          pageSizeOptions={[10, 25, 50, 100]}
          searchPlaceholder="Search vendor, code, GSTIN, contact, email, or location..."
          emptyState="No vendors match the current filters"
          variantContext={{
            category: categoryFilter,
            status: statusFilter,
            verification: verificationFilter,
          }}
          onApplyVariantContext={(context) => {
            setCategoryFilter(context.category || "ALL");
            setStatusFilter(context.status || "ALL");
            setVerificationFilter(context.verification || "ALL");
          }}
          toolbarRight={
            <div className="grid w-full gap-2 sm:grid-cols-3 lg:w-[42rem]">
              <SearchableSelect
                options={FILTER_CATEGORY_OPTIONS}
                value={categoryFilter}
                onChange={setCategoryFilter}
                placeholder="Category"
              />
              <SearchableSelect
                options={FILTER_STATUS_OPTIONS}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="Status"
              />
              <SearchableSelect
                options={FILTER_VERIFICATION_OPTIONS}
                value={verificationFilter}
                onChange={setVerificationFilter}
                placeholder="Verification"
              />
            </div>
          }
        />
      </section>

      <SlidePanel
        open={Boolean(viewingVendor)}
        onClose={() => setViewingVendor(null)}
        title={viewingVendor?.name || "Vendor"}
        subtitle={viewingVendor?.code || ""}
        width="full"
      >
        {viewingVendor ? (
          <div className="mx-auto w-full max-w-[1600px] space-y-6">
            <div className="sticky top-0 z-20 -mx-4 flex flex-col gap-3 border-b border-slate-200 bg-white px-4 pb-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <ErpStatusBadge
                  status={viewingVendor.is_active ? "ACTIVE" : "INACTIVE"}
                  label={viewingVendor.is_active ? "Active" : "Inactive"}
                  tone={viewingVendor.is_active ? "success" : "danger"}
                />
                <ErpStatusBadge
                  status={
                    viewingVendor.is_verified ? "APPROVED" : "AWAITING_APPROVAL"
                  }
                  label={
                    viewingVendor.is_verified
                      ? "Verified for Purchasing"
                      : "Verification Pending"
                  }
                />
                {viewingVendor.gst_verification?.valid ? (
                  <ErpStatusBadge status="APPROVED" label="GST Verified" />
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {canEdit ? (
                  <ErpButton
                    variant="secondary"
                    onClick={() => {
                      const vendor = viewingVendor;
                      setViewingVendor(null);
                      openEdit(vendor);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </ErpButton>
                ) : null}
                {canVerify ? (
                  <ErpButton
                    variant={
                      viewingVendor.is_verified ? "secondary" : "approve"
                    }
                    onClick={() =>
                      handleVerification(
                        viewingVendor,
                        !viewingVendor.is_verified,
                      )
                    }
                  >
                    {viewingVendor.is_verified ? (
                      <ShieldOff className="h-4 w-4" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    {viewingVendor.is_verified ? "Unverify" : "Verify"}
                  </ErpButton>
                ) : null}
              </div>
            </div>

            <section>
              <SectionTitle title="Business Identity" />
              <div className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
                <DetailField label="Vendor Code" value={viewingVendor.code} />
                <DetailField label="Trade Name" value={viewingVendor.name} />
                <DetailField
                  label="Legal Name"
                  value={viewingVendor.legal_name}
                />
                <DetailField
                  label="Category"
                  value={formatCategory(viewingVendor.category)}
                />
                <DetailField
                  label="Rating"
                  value={
                    viewingVendor.rating
                      ? `${Number(viewingVendor.rating).toFixed(1)} / 5`
                      : "-"
                  }
                />
                <DetailField
                  label="Account Status"
                  value={viewingVendor.is_active ? "Active" : "Inactive"}
                />
              </div>
            </section>

            <section>
              <SectionTitle title="Tax & Address" />
              <div className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
                <DetailField
                  label="GSTIN / Tax ID"
                  value={viewingVendor.tax_id}
                />
                <DetailField
                  label="GST State"
                  value={
                    viewingVendor.gst_verification?.details?.stateName ||
                    viewingVendor.state
                  }
                />
                <DetailField
                  label="PAN"
                  value={viewingVendor.gst_verification?.details?.pan}
                />
                <DetailField
                  label="Verification Mode"
                  value={viewingVendor.gst_verification?.verificationMode}
                />
                <div className="sm:col-span-2 lg:col-span-4">
                  <DetailField
                    label="Registered Address"
                    value={formatAddress(viewingVendor)}
                  />
                </div>
              </div>
            </section>

            <section>
              <SectionTitle title="Contacts" />
              <div className="overflow-x-auto rounded-md border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Phone</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Default</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(viewingVendor.contacts?.length
                      ? viewingVendor.contacts
                      : [
                          {
                            name: viewingVendor.contact_person || "",
                            phone: viewingVendor.phone || "",
                            email: viewingVendor.email || "",
                            isDefault: true,
                          },
                        ]
                    ).map((contact, index) => (
                      <tr key={`${contact.email}-${index}`}>
                        <td className="px-3 py-2 font-medium">
                          {[contact.salutation, contact.name]
                            .filter(Boolean)
                            .join(" ") || "-"}
                        </td>
                        <td className="px-3 py-2">{contact.phone || "-"}</td>
                        <td className="px-3 py-2 break-all">
                          {contact.email || "-"}
                        </td>
                        <td className="px-3 py-2">
                          {contact.isDefault ? "Yes" : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="grid gap-8 lg:grid-cols-2">
              <section>
                <SectionTitle title="Commercial" />
                <div className="grid gap-x-8 sm:grid-cols-2">
                  <DetailField
                    label="Payment Terms"
                    value={viewingVendor.payment_terms}
                  />
                  <DetailField
                    label="Credit Limit"
                    value={
                      viewingVendor.credit_limit
                        ? `INR ${Number(viewingVendor.credit_limit).toLocaleString("en-IN")}`
                        : "-"
                    }
                  />
                </div>
              </section>
              <section>
                <SectionTitle title="Bank Details" />
                <div className="grid gap-x-8 sm:grid-cols-2">
                  <DetailField
                    label="Bank"
                    value={
                      viewingVendor.bank_name ||
                      viewingVendor.metadata?.bankName
                    }
                  />
                  <DetailField
                    label="Account Type"
                    value={
                      viewingVendor.bank_account_type ||
                      viewingVendor.metadata?.bankAccountType
                    }
                  />
                  <DetailField
                    label="Account Number"
                    value={
                      viewingVendor.bank_account_number ||
                      viewingVendor.metadata?.bankAccountNumber
                    }
                  />
                  <DetailField
                    label="IFSC"
                    value={
                      viewingVendor.bank_ifsc_code ||
                      viewingVendor.metadata?.bankIfscCode
                    }
                  />
                  <DetailField
                    label="Branch"
                    value={
                      viewingVendor.bank_branch ||
                      viewingVendor.metadata?.bankBranch
                    }
                  />
                </div>
              </section>
            </div>
          </div>
        ) : null}
      </SlidePanel>

      <SlidePanel
        open={editorOpen}
        onClose={() => {
          if (!saving) setEditorOpen(false);
        }}
        title={editingVendor ? "Edit Vendor" : "Create Vendor"}
        subtitle={editingVendor?.code || "New supplier master record"}
        width="full"
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              <ErpButton
                variant="secondary"
                disabled={sectionIndex === 0}
                onClick={() =>
                  setFormSection(
                    FORM_SECTIONS[Math.max(0, sectionIndex - 1)].id,
                  )
                }
              >
                Previous
              </ErpButton>
              <ErpButton
                variant="secondary"
                disabled={sectionIndex === FORM_SECTIONS.length - 1}
                onClick={() =>
                  setFormSection(
                    FORM_SECTIONS[
                      Math.min(FORM_SECTIONS.length - 1, sectionIndex + 1)
                    ].id,
                  )
                }
              >
                Next
              </ErpButton>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <ErpButton
                variant="secondary"
                onClick={() => setEditorOpen(false)}
              >
                Cancel
              </ErpButton>
              <ErpButton
                variant="primary"
                disabled={saving || !form.name.trim()}
                onClick={handleSave}
              >
                <Save className="h-4 w-4" />
                {saving
                  ? "Saving..."
                  : editingVendor
                    ? "Update Vendor"
                    : "Create Vendor"}
              </ErpButton>
            </div>
          </div>
        }
      >
        <div className="mx-auto w-full max-w-[1600px]">
          <nav
            className="sticky -top-3 z-20 -mx-4 -mt-3 mb-5 overflow-x-auto border-b border-slate-200 bg-white px-4"
            aria-label="Vendor form sections"
          >
            <div className="flex min-w-max gap-6">
              {FORM_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setFormSection(section.id)}
                  className={`border-b-2 px-1 py-3 text-sm font-semibold ${formSection === section.id ? "border-indigo-700 text-indigo-800" : "border-transparent text-slate-500 hover:text-slate-900"}`}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </nav>

          {formSection === "business" ? (
            <section>
              <SectionTitle
                title="Business Identity"
                description="Core supplier identity and classification."
              />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className={labelClass}>Trade Name *</label>
                  <div className="flex gap-2">
                    <div className="w-32">
                      <SearchableSelect
                        options={SALUTATION_OPTIONS}
                        value={form.salutation}
                        onChange={(value) =>
                          setForm({ ...form, salutation: value })
                        }
                        placeholder="Title"
                      />
                    </div>
                    <input
                      className={inputClass}
                      value={form.name}
                      onChange={(event) =>
                        setForm({ ...form, name: event.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Legal Name</label>
                  <input
                    className={inputClass}
                    value={form.legalName}
                    onChange={(event) =>
                      setForm({ ...form, legalName: event.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Category *</label>
                  <SearchableSelect
                    options={CATEGORY_OPTIONS}
                    value={form.category}
                    onChange={(value) => setForm({ ...form, category: value })}
                    placeholder="Select category"
                  />
                </div>
                <div>
                  <label className={labelClass}>Quality Rating</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    className={inputClass}
                    value={form.rating}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        rating: Number(event.target.value) || 0,
                      })
                    }
                  />
                </div>
                <label className="flex min-h-10 items-center gap-3 rounded-md border border-slate-200 px-3">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm({ ...form, isActive: event.target.checked })
                    }
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Active vendor
                  </span>
                </label>
              </div>
            </section>
          ) : null}

          {formSection === "tax-address" ? (
            <section>
              <SectionTitle
                title="Tax & Registered Address"
                description="Verify GSTIN to populate registered legal and address information."
              />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="md:col-span-2">
                  <label className={labelClass}>GSTIN / Tax ID</label>
                  <div className="flex gap-2">
                    <input
                      className={inputClass}
                      value={form.taxId}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          taxId: event.target.value.toUpperCase(),
                          gstVerification: null,
                        })
                      }
                    />
                    <ErpButton
                      variant="secondary"
                      disabled={verifyingGstin || !form.taxId.trim()}
                      onClick={verifyGstin}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      {verifyingGstin ? "Checking..." : "Verify GSTIN"}
                    </ErpButton>
                  </div>
                  {form.gstVerification ? (
                    <p
                      className={`mt-2 text-xs font-medium ${form.gstVerification.valid ? "text-emerald-700" : "text-red-700"}`}
                    >
                      {form.gstVerification.message ||
                        (form.gstVerification.valid
                          ? "GSTIN verified"
                          : "GSTIN invalid")}
                    </p>
                  ) : null}
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Address Line</label>
                  <input
                    className={inputClass}
                    value={form.billingLine2}
                    onChange={(event) =>
                      setForm({ ...form, billingLine2: event.target.value })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Street / Building</label>
                  <input
                    className={inputClass}
                    value={form.street}
                    onChange={(event) =>
                      setForm({ ...form, street: event.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>City</label>
                  <input
                    className={inputClass}
                    value={form.city}
                    onChange={(event) =>
                      setForm({ ...form, city: event.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <input
                    className={inputClass}
                    value={form.state}
                    onChange={(event) =>
                      setForm({ ...form, state: event.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>PIN Code</label>
                  <input
                    className={inputClass}
                    value={form.pincode}
                    onChange={(event) =>
                      setForm({ ...form, pincode: event.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Country</label>
                  <input
                    className={inputClass}
                    value={form.country}
                    onChange={(event) =>
                      setForm({ ...form, country: event.target.value })
                    }
                  />
                </div>
                <div className="md:col-span-2 xl:col-span-4">
                  <label className={labelClass}>
                    Additional Address Details
                  </label>
                  <textarea
                    rows={3}
                    className={inputClass}
                    value={form.address}
                    onChange={(event) =>
                      setForm({ ...form, address: event.target.value })
                    }
                  />
                </div>
              </div>
            </section>
          ) : null}

          {formSection === "contacts" ? (
            <section>
              <div className="flex items-start justify-between gap-3">
                <SectionTitle
                  title="Contact Persons"
                  description="Maintain one default contact for purchasing communication."
                />
                <ErpButton
                  variant="secondary"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      contacts: [
                        ...current.contacts,
                        createEmptyContact(false),
                      ],
                    }))
                  }
                >
                  <UserPlus className="h-4 w-4" />
                  Add Contact
                </ErpButton>
              </div>
              <div className="space-y-3">
                {form.contacts.map((contact, index) => (
                  <div
                    key={`contact-${index}`}
                    className="rounded-md border border-slate-200 p-4"
                  >
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <label className={labelClass}>Name</label>
                        <div className="flex gap-2">
                          <div className="w-32">
                            <SearchableSelect
                              options={SALUTATION_OPTIONS}
                              value={contact.salutation}
                              onChange={(value) =>
                                updateContact(index, "salutation", value)
                              }
                              placeholder="Title"
                            />
                          </div>
                          <input
                            className={inputClass}
                            value={contact.name}
                            onChange={(event) =>
                              updateContact(index, "name", event.target.value)
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Phone</label>
                        <div className="flex gap-2">
                          <div className="w-28">
                            <SearchableSelect
                              options={COUNTRY_CODE_OPTIONS}
                              value={form.countryCode}
                              onChange={(value) =>
                                setForm({ ...form, countryCode: value })
                              }
                            />
                          </div>
                          <input
                            type="tel"
                            className={inputClass}
                            value={contact.phone}
                            onChange={(event) =>
                              updateContact(index, "phone", event.target.value)
                            }
                          />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Email</label>
                        <input
                          type="email"
                          className={inputClass}
                          value={contact.email}
                          onChange={(event) =>
                            updateContact(index, "email", event.target.value)
                          }
                        />
                      </div>
                      <div className="flex items-end justify-between gap-3">
                        <label className="flex min-h-10 items-center gap-2 text-sm">
                          <input
                            type="radio"
                            checked={contact.isDefault}
                            onChange={() =>
                              updateContact(index, "isDefault", true)
                            }
                          />
                          Default contact
                        </label>
                        {form.contacts.length > 1 ? (
                          <ErpButton
                            variant="danger"
                            size="sm"
                            onClick={() => removeContact(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </ErpButton>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {formSection === "commercial" ? (
            <section>
              <SectionTitle
                title="Commercial Terms"
                description="Default terms used when creating purchasing documents."
              />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className={labelClass}>Payment Terms</label>
                  <SearchableSelect
                    options={PAYMENT_TERM_OPTIONS}
                    value={form.paymentTerms}
                    onChange={(value) =>
                      setForm({ ...form, paymentTerms: value })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Credit Limit (INR)</label>
                  <input
                    type="number"
                    min="0"
                    className={inputClass}
                    value={form.creditLimit}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        creditLimit: Number(event.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Quality Rating</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    className={inputClass}
                    value={form.rating}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        rating: Number(event.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </section>
          ) : null}

          {formSection === "bank" ? (
            <section>
              <SectionTitle
                title="Bank Details"
                description="Payment destination maintained for accounts payable."
              />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <label className={labelClass}>Bank Name</label>
                  <input
                    className={inputClass}
                    value={form.bankName}
                    onChange={(event) =>
                      setForm({ ...form, bankName: event.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Account Type</label>
                  <SearchableSelect
                    options={ACCOUNT_TYPE_OPTIONS}
                    value={form.bankAccountType}
                    onChange={(value) =>
                      setForm({ ...form, bankAccountType: value })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Account Number</label>
                  <input
                    className={inputClass}
                    value={form.bankAccountNumber}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        bankAccountNumber: event.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>IFSC Code</label>
                  <input
                    className={inputClass}
                    value={form.bankIfscCode}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        bankIfscCode: event.target.value.toUpperCase(),
                      })
                    }
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={labelClass}>Branch</label>
                  <input
                    className={inputClass}
                    value={form.bankBranch}
                    onChange={(event) =>
                      setForm({ ...form, bankBranch: event.target.value })
                    }
                  />
                </div>
              </div>
            </section>
          ) : null}

          {formSection === "review" ? (
            <section>
              <SectionTitle
                title="Review Vendor"
                description="Confirm master data before saving."
              />
              <div className="grid gap-8 lg:grid-cols-2">
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-slate-950">
                    Business & Tax
                  </h4>
                  <DetailField
                    label="Trade Name"
                    value={form.name || "Required"}
                  />
                  <DetailField
                    label="Legal Name"
                    value={form.legalName || form.name}
                  />
                  <DetailField
                    label="Category"
                    value={formatCategory(form.category)}
                  />
                  <DetailField label="GSTIN" value={form.taxId} />
                  <DetailField
                    label="Address"
                    value={[
                      form.billingLine2,
                      form.street,
                      form.city,
                      form.state,
                      form.pincode,
                      form.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  />
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-slate-950">
                    Commercial & Contact
                  </h4>
                  <DetailField
                    label="Default Contact"
                    value={
                      defaultContact
                        ? `${defaultContact.name || "-"}${defaultContact.email ? ` | ${defaultContact.email}` : ""}`
                        : "-"
                    }
                  />
                  <DetailField
                    label="Payment Terms"
                    value={form.paymentTerms}
                  />
                  <DetailField
                    label="Credit Limit"
                    value={`INR ${form.creditLimit.toLocaleString("en-IN")}`}
                  />
                  <DetailField
                    label="Bank"
                    value={[form.bankName, form.bankIfscCode]
                      .filter(Boolean)
                      .join(" | ")}
                  />
                  <DetailField
                    label="Status"
                    value={form.isActive ? "Active" : "Inactive"}
                  />
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </SlidePanel>

      <DuplicateWarning
        isOpen={duplicateState.isOpen}
        exactMatches={duplicateState.exactMatches}
        fuzzyMatches={duplicateState.fuzzyMatches}
        entityType="Vendor"
        onProceed={handleProceed}
        onCancel={handleCancel}
        formatRecord={(data) => (
          <div className="text-sm">
            <p className="font-semibold">{data.name || data.legal_name}</p>
            <p className="text-xs text-slate-600">
              GST: {data.tax_id || "N/A"}
            </p>
          </div>
        )}
      />
    </div>
  );
}
