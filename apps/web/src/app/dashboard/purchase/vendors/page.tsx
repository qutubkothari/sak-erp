'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle, Eye, Plus, Trash2, XCircle } from 'lucide-react';
import { apiClient } from '../../../../../lib/api-client';
import { useSelection } from '../../../../hooks/useSelection';
import DuplicateWarning, { useDuplicateDetection } from '../../../../components/DuplicateWarning';
import { confirmDialog } from '../../../../components/ui/ConfirmDialog';
import { PageHeader, PrimaryButton, DangerButton, SecondaryButton } from '../../../../components/ui/PageHeader';
import { TableSkeleton } from '../../../../components/ui/Skeleton';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { hasModulePermission, isAdminLike, readStoredUser } from '@/lib/rbac';
import { ListTable, type ListTableColumn } from '../../../../components/ui/ListTable';
import { useEscapeKey } from '../../../../hooks/useEscapeKey';
import { exportToExcel } from '../../../../lib/export-excel';

interface Vendor {
  id: string;
  code: string;
  name: string;
  legal_name: string;
  tax_id?: string;
  category: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
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
  billing_line2?: string;
  gst_verification?: {
    valid?: boolean;
    verificationMode?: string;
    message?: string;
    details?: {
      stateName?: string | null;
      pan?: string | null;
    };
  } | null;
  contacts?: Array<{
    name: string;
    phone: string;
    email: string;
    isDefault?: boolean;
  }>;
}

type VendorContactForm = {
  salutation: string;
  name: string;
  phone: string;
  email: string;
  isDefault: boolean;
};

type GstVerificationResult = {
  gstin?: string;
  valid?: boolean;
  portalVerified?: boolean;
  legalNameChecked?: boolean;
  legalNameMatch?: boolean | null;
  verificationMode?: string;
  message?: string;
  details?: {
    formatValid?: boolean;
    checksumValid?: boolean;
    stateCode?: string | null;
    stateName?: string | null;
    pan?: string | null;
    entityCode?: string | null;
    enteredLegalName?: string | null;
    portalLegalName?: string | null;
    portalTradeName?: string | null;
    portalAddress?: {
      addressLine?: string;
      street?: string;
      city?: string;
      district?: string;
      state?: string;
      pincode?: string;
      country?: string;
      fullAddress?: string;
    } | null;
    portalStatus?: string | null;
    portalRegistrationDate?: string | null;
    portalTaxpayerType?: string | null;
  };
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

function createEmptyContact(isDefault = false): VendorContactForm {
  return {
    salutation: '',
    name: '',
    phone: '',
    email: '',
    isDefault,
  };
}

function createInitialFormState(): VendorFormState {
  return {
    salutation: '',
    name: '',
    legalName: '',
    taxId: '',
    category: 'RAW_MATERIAL',
    address: '',
    billingLine2: '',
    street: '',
    city: '',
    state: '',
    country: 'India',
    countryCode: '+91',
    pincode: '',
    paymentTerms: 'NET_30',
    creditLimit: 0,
    rating: 0,
    isActive: true,
    contacts: [createEmptyContact(true)],
    gstVerification: null,
    bankName: '',
    bankAccountNumber: '',
    bankIfscCode: '',
    bankBranch: '',
    bankAccountType: 'CURRENT',
  };
}

function buildVendorPayload(formData: VendorFormState): VendorFormState {
  const name = String(formData.name || '').trim();
  const legalName = String(formData.legalName || '').trim() || name;
  const taxId = String(formData.taxId || '').trim().toUpperCase();
  const contacts = formData.contacts
    .map((contact) => ({
      salutation: String(contact.salutation || '').trim(),
      name: String(contact.name || '').trim(),
      phone: String(contact.phone || '').trim(),
      email: String(contact.email || '').trim(),
      isDefault: Boolean(contact.isDefault),
    }))
    .filter((contact) => contact.name || contact.phone || contact.email);

  return {
    ...formData,
    salutation: String(formData.salutation || '').trim(),
    name,
    legalName,
    taxId,
    address: String(formData.address || '').trim(),
    billingLine2: String(formData.billingLine2 || '').trim(),
    street: String(formData.street || '').trim(),
    city: String(formData.city || '').trim(),
    state: String(formData.state || '').trim(),
    country: String(formData.country || '').trim() || 'India',
    countryCode: String(formData.countryCode || '+91').trim(),
    pincode: String(formData.pincode || '').trim(),
    contacts,
    bankName: String(formData.bankName || '').trim(),
    bankAccountNumber: String(formData.bankAccountNumber || '').trim(),
    bankIfscCode: String(formData.bankIfscCode || '').trim().toUpperCase(),
    bankBranch: String(formData.bankBranch || '').trim(),
    bankAccountType: String(formData.bankAccountType || 'CURRENT').trim(),
  };
}

function normalizeVendorContacts(contacts?: Vendor['contacts']): VendorContactForm[] {
  const list = Array.isArray(contacts)
    ? contacts
        .map((contact) => ({
          salutation: String((contact as any)?.salutation || '').trim(),
          name: String(contact?.name || '').trim(),
          phone: String(contact?.phone || '').trim(),
          email: String(contact?.email || '').trim(),
          isDefault: Boolean(contact?.isDefault),
        }))
        .filter((contact) => contact.name || contact.phone || contact.email)
    : [];

  if (list.length === 0) {
    return [createEmptyContact(true)];
  }

  const defaultIndex = list.findIndex((contact) => contact.isDefault);
  return list.map((contact, index) => ({
    ...contact,
    isDefault: index === (defaultIndex >= 0 ? defaultIndex : 0),
  }));
}

function formatVendorAddress(vendor: Vendor): string {
  return [
    vendor.billing_line2,
    vendor.street || vendor.address,
    vendor.city,
    vendor.state,
    vendor.pincode,
    vendor.country,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(', ');
}

function VendorDetailRow({ label, value }: { label: string; value?: string | number | null }) {
  const displayValue = value === undefined || value === null || value === '' ? '-' : value;
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-medium text-gray-900 break-words">{displayValue}</div>
    </div>
  );
}

function applyGstinPortalDataToVendorForm(prev: VendorFormState, result: GstVerificationResult): VendorFormState {
  const portalLegalName = String(result.details?.portalLegalName || '').trim();
  const portalTradeName = String(result.details?.portalTradeName || '').trim();
  const portalAddress = result.details?.portalAddress || null;
  const existingName = String(prev.name || '').trim();
  const nextName = existingName || portalTradeName || portalLegalName;
  const nextLegalName = portalLegalName || prev.legalName || prev.name;

  return {
    ...prev,
    name: nextName,
    legalName: nextLegalName,
    taxId: result.gstin || prev.taxId,
    address: portalAddress?.fullAddress || prev.address,
    billingLine2: portalAddress?.addressLine || prev.billingLine2,
    street: portalAddress?.street || prev.street,
    city: portalAddress?.city || prev.city,
    state: portalAddress?.state || prev.state || result.details?.stateName || '',
    country: portalAddress?.country || prev.country || 'India',
    pincode: portalAddress?.pincode || prev.pincode,
    gstVerification: result,
  };
}

export default function VendorsPage() {
  const currentUser = readStoredUser();
  const canCreate = hasModulePermission(currentUser, 'Purchase Management', 'create');
  const canEdit = hasModulePermission(currentUser, 'Purchase Management', 'edit');
  const canDelete = hasModulePermission(currentUser, 'Purchase Management', 'delete');
  const canVerify = isAdminLike(currentUser) && hasModulePermission(currentUser, 'Purchase Management', 'approve');
  const canExport = isAdminLike(currentUser); // Only admins can export data

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [viewingVendor, setViewingVendor] = useState<Vendor | null>(null);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [formData, setFormData] = useState<VendorFormState>(createInitialFormState());

  const selection = useSelection(vendors);
  const { duplicateState, checkDuplicates, handleProceed, handleCancel } = useDuplicateDetection();

  // Close modals on Escape key
  useEscapeKey(showModal, () => setShowModal(false));
  useEscapeKey(!!viewingVendor, () => setViewingVendor(null));

  useEffect(() => {
    fetchVendors();
  }, [filterCategory]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterCategory]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterCategory !== 'ALL') params.append('category', filterCategory);
      const queryString = params.toString();
      const data = await apiClient.get<Vendor[]>(`/purchase/vendors${queryString ? `?${queryString}` : ''}`);
      setVendors(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load vendors');
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingVendor(null);
    setFormData(createInitialFormState());
  };

  const actuallySaveVendor = async (payload = buildVendorPayload(formData)) => {

    try {
      if (editingVendor) {
        await apiClient.put(`/purchase/vendors/${editingVendor.id}`, payload);
        toast.success('Vendor updated successfully');
      } else {
        await apiClient.post('/purchase/vendors', payload);
        toast.success('Vendor created successfully');
      }

      setShowModal(false);
      resetForm();
      fetchVendors();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save vendor. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (editingVendor ? !canEdit : !canCreate) {
      toast.error(`You do not have permission to ${editingVendor ? 'edit' : 'create'} vendors`);
      return;
    }

    const payload = buildVendorPayload(formData);

    if (!payload.name) {
      toast.error('Vendor name is required');
      return;
    }

    setFormData(payload);

    if (editingVendor) {
      await actuallySaveVendor(payload);
      return;
    }

    try {
      await checkDuplicates(
        () => apiClient.post('/purchase/vendors/check-duplicates', payload),
        () => actuallySaveVendor(payload),
      );
    } catch (error: any) {
      toast.error(error?.message || 'Failed to check for duplicate vendors. Please try again.');
    }
  };

  const handleEdit = (vendor: Vendor) => {
    if (!canEdit) {
      toast.error('You do not have permission to edit vendors');
      return;
    }

    setEditingVendor(vendor);
    const meta = (vendor as any).metadata || {};
    setFormData({
      salutation: (vendor as any).salutation || meta.salutation || '',
      name: vendor.name,
      legalName: vendor.legal_name,
      taxId: vendor.tax_id || '',
      category: vendor.category,
      address: vendor.address || '',
      billingLine2: vendor.billing_line2 || '',
      street: vendor.street || '',
      city: vendor.city || '',
      state: vendor.state || '',
      country: vendor.country || 'India',
      countryCode: (vendor as any).country_code || meta.countryCode || '+91',
      pincode: vendor.pincode || '',
      paymentTerms: vendor.payment_terms,
      creditLimit: vendor.credit_limit || 0,
      rating: vendor.rating || 0,
      isActive: vendor.is_active,
      contacts: normalizeVendorContacts(vendor.contacts),
      gstVerification: vendor.gst_verification || null,
      bankName: (vendor as any).bank_name || meta.bankName || '',
      bankAccountNumber: (vendor as any).bank_account_number || meta.bankAccountNumber || '',
      bankIfscCode: (vendor as any).bank_ifsc_code || meta.bankIfscCode || '',
      bankBranch: (vendor as any).bank_branch || meta.bankBranch || '',
      bankAccountType: (vendor as any).bank_account_type || meta.bankAccountType || 'CURRENT',
    });
    setShowModal(true);
  };

  const handleView = (vendor: Vendor) => {
    setViewingVendor(vendor);
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) {
      toast.error('You do not have permission to delete vendors');
      return;
    }

    const confirmed = await confirmDialog({
      title: 'Delete Vendor',
      message: 'Are you sure you want to delete this vendor? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await apiClient.delete(`/purchase/vendors/${id}`);
      toast.success('Vendor deleted');
      fetchVendors();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete vendor');
    }
  };

  const handleDeleteAll = async () => {
    if (!canDelete) {
      toast.error('You do not have permission to delete vendors');
      return;
    }

    const confirmed = await confirmDialog({
      title: `Delete ${selection.selectedItems.length} Vendors`,
      message: `This will permanently delete ${selection.selectedItems.length} vendor${selection.selectedItems.length > 1 ? 's' : ''}. This action cannot be undone.`,
      confirmLabel: 'Delete All',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      await Promise.all(selection.selectedItems.map((vendor) => apiClient.delete(`/purchase/vendors/${vendor.id}`)));
      toast.success(`Deleted ${selection.selectedItems.length} vendor${selection.selectedItems.length > 1 ? 's' : ''}`);
      selection.deselectAll();
      fetchVendors();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete some vendors');
    }
  };

  const handleVerification = async (vendor: Vendor, shouldVerify: boolean) => {
    if (!canVerify) {
      toast.error('Only admin users with approval permission can verify vendors');
      return;
    }

    const confirmed = await confirmDialog({
      title: shouldVerify ? 'Verify Vendor' : 'Remove Vendor Verification',
      message: shouldVerify
        ? `Allow ${vendor.name} to be used in purchases and item-vendor mappings?`
        : `Block ${vendor.name} from new purchase usage until verified again?`,
      confirmLabel: shouldVerify ? 'Verify' : 'Unverify',
      variant: shouldVerify ? 'info' : 'warning',
    });
    if (!confirmed) return;

    try {
      await apiClient.put(`/purchase/vendors/${vendor.id}/${shouldVerify ? 'verify' : 'unverify'}`, {});
      toast.success(shouldVerify ? 'Vendor verified' : 'Vendor verification removed');
      fetchVendors();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update vendor verification');
    }
  };

  const verifyGstin = async () => {
    const gstin = String(formData.taxId || '').trim().toUpperCase();
    const legalName = String(formData.legalName || formData.name || '').trim();
    if (!gstin) {
      toast.error('Enter GSTIN first');
      return;
    }

    try {
      const result = await apiClient.post<GstVerificationResult>('/purchase/vendors/verify-gstin', { gstin, legalName });
      setFormData((prev) => applyGstinPortalDataToVendorForm(prev, result));

      if (result.portalVerified && result.details?.portalAddress) {
        toast.success('GSTIN verified. Legal and address details filled; vendor name preserved.');
      } else if (result.portalVerified) {
        toast.success('GSTIN verified. Registered legal name filled from portal.');
      } else if (result.valid) {
        toast.success(result.message || 'GSTIN basic validation passed');
      } else {
        toast.error(result.message || 'GSTIN verification failed');
      }
    } catch {
      toast.error('Failed to verify GSTIN');
    }
  };

  const updateContact = (index: number, field: keyof VendorContactForm, value: string | boolean) => {
    setFormData((prev) => {
      const nextContacts = prev.contacts.map((contact, contactIndex) => {
        if (contactIndex !== index) {
          return field === 'isDefault' && value === true ? { ...contact, isDefault: false } : contact;
        }

        return {
          ...contact,
          [field]: value,
        };
      });

      if (!nextContacts.some((contact) => contact.isDefault) && nextContacts[0]) {
        nextContacts[0] = { ...nextContacts[0], isDefault: true };
      }

      return {
        ...prev,
        contacts: nextContacts,
      };
    });
  };

  const addContact = () => {
    setFormData((prev) => ({
      ...prev,
      contacts: [...prev.contacts, createEmptyContact(false)],
    }));
  };

  const removeContact = (index: number) => {
    setFormData((prev) => {
      const nextContacts = prev.contacts.filter((_, contactIndex) => contactIndex !== index);
      if (nextContacts.length === 0) {
        return {
          ...prev,
          contacts: [createEmptyContact(true)],
        };
      }

      if (!nextContacts.some((contact) => contact.isDefault)) {
        nextContacts[0] = { ...nextContacts[0], isDefault: true };
      }

      return {
        ...prev,
        contacts: nextContacts,
      };
    });
  };

  const sortedVendors = [...vendors].sort((left, right) => {
    let leftValue: string | number = '';
    let rightValue: string | number = '';

    switch (sortColumn) {
      case 'code':
        leftValue = left.code || '';
        rightValue = right.code || '';
        break;
      case 'category':
        leftValue = left.category || '';
        rightValue = right.category || '';
        break;
      case 'rating':
        leftValue = left.rating || 0;
        rightValue = right.rating || 0;
        break;
      case 'is_active':
        leftValue = left.is_active ? 1 : 0;
        rightValue = right.is_active ? 1 : 0;
        break;
      default:
        leftValue = left.name || '';
        rightValue = right.name || '';
        break;
    }

    if (typeof leftValue === 'string') leftValue = leftValue.toLowerCase();
    if (typeof rightValue === 'string') rightValue = rightValue.toLowerCase();

    if (leftValue < rightValue) return sortDirection === 'asc' ? -1 : 1;
    if (leftValue > rightValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const totalItems = sortedVendors.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedVendors = sortedVendors.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const vendorTableColumns = useMemo<Array<ListTableColumn<Vendor>>>(() => [
    {
      id: 'select',
      label: '',
      hideable: false,
      sortable: false,
      minWidth: 44,
      align: 'center',
      cell: (vendor) => (
        <input
          type="checkbox"
          checked={selection.isSelected(vendor.id)}
          onChange={() => selection.toggleSelection(vendor.id)}
          className="h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
        />
      ),
    },
    {
      id: 'code',
      label: 'Code',
      accessor: (vendor) => vendor.code || '',
      sortable: true,
      minWidth: 100,
      cell: (vendor) => <span className="font-medium text-gray-900 break-words">{vendor.code || '-'}</span>,
    },
    {
      id: 'name',
      label: 'Name',
      accessor: (vendor) => vendor.name || '',
      sortable: true,
      minWidth: 220,
      searchAccessor: (vendor) => `${vendor.name || ''} ${vendor.legal_name || ''} ${vendor.tax_id || ''}`,
      cell: (vendor) => (
        <div className="min-w-0">
          <div className="font-medium text-gray-900 break-words">{vendor.name || '-'}</div>
          {vendor.legal_name && vendor.legal_name !== vendor.name && (
            <div className="text-xs text-gray-500 break-words">{vendor.legal_name}</div>
          )}
          {vendor.tax_id && <div className="text-[11px] text-gray-500 break-words">GSTIN: {vendor.tax_id}</div>}
        </div>
      ),
    },
    {
      id: 'category',
      label: 'Category',
      accessor: (vendor) => vendor.category || '',
      sortable: true,
      minWidth: 130,
      cell: (vendor) => <span className="break-words">{vendor.category || '-'}</span>,
    },
    {
      id: 'contact',
      label: 'Contact',
      accessor: (vendor) => vendor.contact_person || '',
      sortable: true,
      minWidth: 160,
      searchAccessor: (vendor) => `${vendor.contact_person || ''} ${(vendor.contacts || []).map((contact) => `${contact.name} ${contact.phone} ${contact.email}`).join(' ')}`,
      cell: (vendor) => (
        <div className="break-words">
          <div>{vendor.contact_person || '-'}</div>
          {Array.isArray(vendor.contacts) && vendor.contacts.length > 1 && (
            <div className="text-xs text-gray-500">+{vendor.contacts.length - 1} more</div>
          )}
        </div>
      ),
    },
    {
      id: 'email',
      label: 'Email',
      accessor: (vendor) => vendor.email || '',
      sortable: true,
      minWidth: 190,
      cell: (vendor) => <span className="break-all">{vendor.email || '-'}</span>,
    },
    {
      id: 'phone',
      label: 'Phone',
      accessor: (vendor) => vendor.phone || '',
      sortable: true,
      minWidth: 120,
      cell: (vendor) => <span className="break-words">{vendor.phone || '-'}</span>,
    },
    {
      id: 'location',
      label: 'Location',
      accessor: (vendor) => [vendor.city, vendor.state, vendor.pincode].filter(Boolean).join(', '),
      sortable: true,
      minWidth: 170,
      searchAccessor: (vendor) => formatVendorAddress(vendor),
      cell: (vendor) => <span className="break-words">{[vendor.city, vendor.state].filter(Boolean).join(', ') || '-'}</span>,
    },
    {
      id: 'payment_terms',
      label: 'Terms',
      accessor: (vendor) => vendor.payment_terms || '',
      sortable: true,
      defaultVisible: false,
      minWidth: 120,
      cell: (vendor) => <span className="break-words">{vendor.payment_terms || '-'}</span>,
    },
    {
      id: 'credit_limit',
      label: 'Credit',
      accessor: (vendor) => vendor.credit_limit || 0,
      sortable: true,
      defaultVisible: false,
      align: 'right',
      minWidth: 110,
      cell: (vendor) => (vendor.credit_limit ? `₹${vendor.credit_limit.toLocaleString()}` : '-'),
    },
    {
      id: 'rating',
      label: 'Rating',
      accessor: (vendor) => vendor.rating || 0,
      sortable: true,
      align: 'center',
      minWidth: 90,
      cell: (vendor) => (vendor.rating > 0 ? <span className="text-yellow-600">★ {vendor.rating.toFixed(1)}</span> : '-'),
    },
    {
      id: 'status',
      label: 'Status',
      accessor: (vendor) => (vendor.is_active ? 'Active' : 'Inactive'),
      sortable: true,
      align: 'center',
      minWidth: 100,
      cell: (vendor) => (
        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${vendor.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {vendor.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      id: 'verification',
      label: 'Verification',
      accessor: (vendor) => (vendor.is_verified ? 'Verified' : 'Pending'),
      sortable: true,
      align: 'center',
      minWidth: 130,
      cell: (vendor) => (
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${vendor.is_verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
          {vendor.is_verified ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          {vendor.is_verified ? 'Verified' : 'Pending'}
        </span>
      ),
    },
    {
      id: 'gst_status',
      label: 'GST Check',
      accessor: (vendor) => vendor.gst_verification?.valid ? 'Verified' : 'Not verified',
      sortable: true,
      defaultVisible: false,
      minWidth: 130,
      cell: (vendor) => vendor.gst_verification?.valid ? (
        <span className="text-emerald-700">Verified{vendor.gst_verification.details?.stateName ? ` · ${vendor.gst_verification.details.stateName}` : ''}</span>
      ) : '-',
    },
    {
      id: 'actions',
      label: 'Actions',
      hideable: false,
      sortable: false,
      align: 'center',
      minWidth: 150,
      cell: (vendor) => (
        <div className="flex flex-wrap justify-center gap-2">
          <button onClick={() => handleView(vendor)} className="text-blue-600 hover:text-blue-800 font-medium">
            View
          </button>
          {canEdit && (
            <button onClick={() => handleEdit(vendor)} className="text-amber-600 hover:text-amber-800 font-medium">
              Edit
            </button>
          )}
          {canVerify && (
            <button
              onClick={() => handleVerification(vendor, !vendor.is_verified)}
              className={vendor.is_verified ? 'text-gray-600 hover:text-gray-800 font-medium' : 'text-emerald-700 hover:text-emerald-900 font-medium'}
            >
              {vendor.is_verified ? 'Unverify' : 'Verify'}
            </button>
          )}
          {canDelete && (
            <button onClick={() => handleDelete(vendor.id)} className="text-red-600 hover:text-red-800 font-medium">
              Delete
            </button>
          )}
        </div>
      ),
    },
  ], [canDelete, canEdit, canVerify, selection]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Vendor Management"
        subtitle="Manage supplier and vendor information"
        badge={vendors.length > 0 ? `${vendors.length}` : undefined}
        action={canCreate ? (
          <PrimaryButton onClick={() => { resetForm(); setShowModal(true); }}>
            <Plus className="h-4 w-4" />
            Add Vendor
          </PrimaryButton>
        ) : undefined}
        secondaryAction={
          <div className="flex items-center gap-2">
            {canExport && (
              <button
                onClick={() => {
                  exportToExcel(
                    vendors,
                    [
                      { header: 'Vendor Code', key: 'code' },
                      { header: 'Name', key: 'name' },
                      { header: 'Legal Name', key: 'legal_name' },
                      { header: 'Category', key: 'category' },
                      { header: 'GST / Tax ID', key: 'tax_id' },
                      { header: 'Contact Person', key: 'contact_person' },
                      { header: 'Email', key: 'email' },
                      { header: 'Phone', key: 'phone' },
                      { header: 'Address', key: 'address' },
                      { header: 'Street', key: 'street' },
                      { header: 'City', key: 'city' },
                      { header: 'State', key: 'state' },
                      { header: 'Country', key: 'country' },
                      { header: 'Pincode', key: 'pincode' },
                      { header: 'Payment Terms', key: 'payment_terms' },
                      { header: 'Credit Limit', key: 'credit_limit' },
                      { header: 'Rating', key: 'rating' },
                      { header: 'Active', key: 'is_active' },
                      { header: 'Verified', key: 'is_verified' },
                    ],
                    `Vendors_${new Date().toISOString().slice(0, 10)}.csv`
                  );
                }}
                className="rounded-md bg-green-700 px-3 py-2 text-xs font-semibold text-white hover:bg-green-800"
              >
                ⬇ Download Excel
              </button>
            )}
            {selection.hasSelections && canDelete && (
              <DangerButton onClick={handleDeleteAll}>
                <Trash2 className="h-4 w-4" />
                Delete ({selection.selectedItems.length})
              </DangerButton>
            )}
            <div className="flex rounded-lg overflow-hidden border border-gray-300 bg-white">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  viewMode === 'table' ? 'bg-amber-700 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  viewMode === 'cards' ? 'bg-amber-700 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cards
              </button>
            </div>
          </div>
        }
      />

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select
              value={filterCategory}
              onChange={(event) => setFilterCategory(event.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            >
              <option value="ALL">All Categories</option>
              <option value="RAW_MATERIAL">Raw Material</option>
              <option value="COMPONENT">Component</option>
              <option value="SERVICE">Service</option>
              <option value="CONSUMABLE">Consumable</option>
            </select>
          </div>
        </div>
        {vendors.length > 0 && (
          <div className="mt-4 flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selection.isAllSelected}
                onChange={selection.toggleSelectAll}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">Select All ({vendors.length} vendors)</span>
            </label>
            {selection.hasSelections && (
              <button onClick={selection.deselectAll} className="text-sm text-amber-600 hover:text-amber-800">
                Deselect All
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : vendors.length === 0 ? (
        <EmptyState
          variant="empty"
          title="No Vendors Found"
          description="Add your first vendor to get started."
          action={canCreate ? (
            <PrimaryButton onClick={() => { resetForm(); setShowModal(true); }}>
              <Plus className="h-4 w-4" />
              Add First Vendor
            </PrimaryButton>
          ) : undefined}
        />
      ) : (
        <>
          {viewMode === 'cards' && <div className="mb-4 flex gap-2 items-center justify-between bg-white p-4 rounded-lg shadow">
            <div className="flex gap-2 items-center">
              <label className="text-sm font-medium text-gray-700">Sort by:</label>
              <select
                value={sortColumn}
                onChange={(event) => setSortColumn(event.target.value)}
                className="border border-gray-300 rounded px-3 py-1 text-sm"
              >
                <option value="name">Name</option>
                <option value="code">Code</option>
                <option value="category">Category</option>
                <option value="rating">Rating</option>
                <option value="is_active">Status</option>
              </select>
              <button
                onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100"
              >
                {sortDirection === 'asc' ? '↑ Ascending' : '↓ Descending'}
              </button>
            </div>
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(endIndex, totalItems)} of {totalItems} vendors
            </div>
          </div>}

          {viewMode === 'table' ? (
            <ListTable
              storageKey="vendorsTable:compact:v1"
              rows={vendors}
              columns={vendorTableColumns}
              getRowId={(vendor) => vendor.id}
              defaultPageSize={25}
              pageSizeOptions={[10, 25, 50, 100]}
              searchPlaceholder="Search by vendor, code, GSTIN, contact, email, location..."
              exportFilename={`vendors-${new Date().toISOString().slice(0, 10)}`}
              emptyState="No vendors found"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedVendors.map((vendor) => (
                <div key={vendor.id} className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow ${selection.isSelected(vendor.id) ? 'ring-2 ring-amber-500' : ''}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selection.isSelected(vendor.id)}
                        onChange={() => selection.toggleSelection(vendor.id)}
                        className="w-4 h-4"
                      />
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{vendor.name}</h3>
                        <p className="text-sm text-gray-500">{vendor.code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {vendor.rating > 0 && <span className="text-yellow-500">★ {vendor.rating.toFixed(1)}</span>}
                      <span className={`px-2 py-1 text-xs rounded-full ${vendor.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {vendor.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${vendor.is_verified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {vendor.is_verified ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {vendor.is_verified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium w-24">Category:</span>
                      <span>{vendor.category}</span>
                    </div>
                    {vendor.contact_person && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium w-24">Contact:</span>
                        <span>{vendor.contact_person}{Array.isArray(vendor.contacts) && vendor.contacts.length > 1 ? ` (+${vendor.contacts.length - 1})` : ''}</span>
                      </div>
                    )}
                    {vendor.email && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium w-24">Email:</span>
                        <span className="truncate">{vendor.email}</span>
                      </div>
                    )}
                    {vendor.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium w-24">Phone:</span>
                        <span>{vendor.phone}</span>
                      </div>
                    )}
                    {(vendor.city || vendor.state) && (
                      <div className="flex items-start text-sm text-gray-600">
                        <span className="font-medium w-24">Location:</span>
                        <span>{[vendor.city, vendor.state, vendor.pincode].filter(Boolean).join(', ')}</span>
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium w-24">Terms:</span>
                      <span>{vendor.payment_terms}</span>
                    </div>
                    {vendor.tax_id && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium w-24">GSTIN:</span>
                        <span>{vendor.tax_id}</span>
                      </div>
                    )}
                    {vendor.gst_verification?.valid && (
                      <div className="flex items-center text-sm text-emerald-700">
                        <span className="font-medium w-24">GST Check:</span>
                        <span>Verified{vendor.gst_verification.details?.stateName ? ` · ${vendor.gst_verification.details.stateName}` : ''}</span>
                      </div>
                    )}
                    {vendor.credit_limit > 0 && (
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium w-24">Credit:</span>
                        <span>₹{vendor.credit_limit.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4 border-t">
                    <button onClick={() => handleView(vendor)} className="flex-1 bg-blue-100 text-blue-700 px-4 py-2 rounded hover:bg-blue-200">
                      View
                    </button>
                    {canEdit && (
                      <button onClick={() => handleEdit(vendor)} className="flex-1 bg-amber-100 text-amber-700 px-4 py-2 rounded hover:bg-amber-200">
                        Edit
                      </button>
                    )}
                    {canVerify && (
                      <button
                        onClick={() => handleVerification(vendor, !vendor.is_verified)}
                        className="flex-1 bg-emerald-100 text-emerald-700 px-4 py-2 rounded hover:bg-emerald-200"
                      >
                        {vendor.is_verified ? 'Unverify' : 'Verify'}
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => handleDelete(vendor.id)} className="flex-1 bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200">
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === 'cards' && totalPages > 1 && (
            <div className="mt-6 bg-white px-4 py-3 rounded-lg shadow flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div className="flex gap-4 items-center">
                  <div className="text-sm text-gray-700">
                    Showing <span className="font-medium">{startIndex + 1}</span> to <span className="font-medium">{Math.min(endIndex, totalItems)}</span> of <span className="font-medium">{totalItems}</span> results
                  </div>
                  <select
                    value={itemsPerPage}
                    onChange={(event) => {
                      setItemsPerPage(Number(event.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value={10}>10 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => goToPage(1)} disabled={currentPage === 1} className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">First</button>
                  <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
                      let pageNumber;
                      if (totalPages <= 5) {
                        pageNumber = index + 1;
                      } else if (currentPage <= 3) {
                        pageNumber = index + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNumber = totalPages - 4 + index;
                      } else {
                        pageNumber = currentPage - 2 + index;
                      }

                      return (
                        <button
                          key={pageNumber}
                          onClick={() => goToPage(pageNumber)}
                          className={`px-3 py-1 border rounded text-sm ${currentPage === pageNumber ? 'bg-amber-600 text-white border-amber-600' : 'border-gray-300 hover:bg-gray-100'}`}
                        >
                          {pageNumber}
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
                  <button onClick={() => goToPage(totalPages)} disabled={currentPage === totalPages} className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">Last</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {viewingVendor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-gray-900">{viewingVendor.name}</h2>
                  <span className={`px-2 py-1 text-xs rounded-full ${viewingVendor.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {viewingVendor.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">{viewingVendor.code}</p>
              </div>
              <button
                onClick={() => setViewingVendor(null)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>

            <div className="p-6 space-y-6">
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 mb-3">Vendor Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <VendorDetailRow label="Vendor Name" value={viewingVendor.name} />
                  <VendorDetailRow label="Legal Name" value={viewingVendor.legal_name} />
                  <VendorDetailRow label="Category" value={viewingVendor.category} />
                  <VendorDetailRow label="Payment Terms" value={viewingVendor.payment_terms} />
                  <VendorDetailRow label="Credit Limit" value={viewingVendor.credit_limit > 0 ? `Rs. ${viewingVendor.credit_limit.toLocaleString()}` : '-'} />
                  <VendorDetailRow label="Rating" value={viewingVendor.rating > 0 ? viewingVendor.rating.toFixed(1) : '-'} />
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 mb-3">Tax And GST</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <VendorDetailRow label="GSTIN / Tax ID" value={viewingVendor.tax_id} />
                  <VendorDetailRow
                    label="GST Status"
                    value={viewingVendor.gst_verification?.valid ? 'Verified' : viewingVendor.tax_id ? 'Not verified' : '-'}
                  />
                  <VendorDetailRow label="GST State" value={viewingVendor.gst_verification?.details?.stateName || viewingVendor.state} />
                  <VendorDetailRow label="PAN" value={viewingVendor.gst_verification?.details?.pan} />
                  <VendorDetailRow label="Verification Mode" value={viewingVendor.gst_verification?.verificationMode} />
                  <VendorDetailRow label="GST Message" value={viewingVendor.gst_verification?.message} />
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 mb-3">Contact Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <VendorDetailRow label="Primary Contact" value={viewingVendor.contact_person} />
                  <VendorDetailRow label="Email" value={viewingVendor.email} />
                  <VendorDetailRow label="Phone" value={viewingVendor.phone} />
                </div>
                {Array.isArray(viewingVendor.contacts) && viewingVendor.contacts.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {viewingVendor.contacts.map((contact, index) => (
                      <div key={`${contact.name}-${index}`} className="rounded-lg border border-gray-200 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="font-semibold text-gray-900">{contact.name || `Contact ${index + 1}`}</div>
                          {contact.isDefault && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800">Default</span>}
                        </div>
                        <div className="mt-2 text-sm text-gray-600">Phone: {contact.phone || '-'}</div>
                        <div className="text-sm text-gray-600">Email: {contact.email || '-'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 mb-3">Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <VendorDetailRow label="Full Address" value={formatVendorAddress(viewingVendor)} />
                  <VendorDetailRow label="Address Line" value={viewingVendor.billing_line2} />
                  <VendorDetailRow label="Street" value={viewingVendor.street || viewingVendor.address} />
                  <VendorDetailRow label="City" value={viewingVendor.city} />
                  <VendorDetailRow label="State" value={viewingVendor.state} />
                  <VendorDetailRow label="PIN Code" value={viewingVendor.pincode} />
                  <VendorDetailRow label="Country" value={viewingVendor.country} />
                </div>
              </section>

              {((viewingVendor as any).bank_name || (viewingVendor as any).metadata?.bankName) && (
                <section>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-700 mb-3">Bank Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <VendorDetailRow label="Bank Name" value={(viewingVendor as any).bank_name || (viewingVendor as any).metadata?.bankName} />
                    <VendorDetailRow label="Account Number" value={(viewingVendor as any).bank_account_number || (viewingVendor as any).metadata?.bankAccountNumber} />
                    <VendorDetailRow label="IFSC Code" value={(viewingVendor as any).bank_ifsc_code || (viewingVendor as any).metadata?.bankIfscCode} />
                    <VendorDetailRow label="Branch" value={(viewingVendor as any).bank_branch || (viewingVendor as any).metadata?.bankBranch} />
                    <VendorDetailRow label="Account Type" value={(viewingVendor as any).bank_account_type || (viewingVendor as any).metadata?.bankAccountType} />
                  </div>
                </section>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              {canEdit && (
                <button
                  onClick={() => {
                    const vendor = viewingVendor;
                    setViewingVendor(null);
                    handleEdit(vendor);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
                >
                  <Eye className="h-4 w-4" />
                  Edit Vendor
                </button>
              )}
              <button
                onClick={() => setViewingVendor(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Legal Name</label>
                  <input
                    type="text"
                    value={formData.legalName}
                    onChange={(event) => setFormData({ ...formData, legalName: event.target.value, gstVerification: null })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tax ID / GSTIN</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.taxId}
                      onChange={(event) => setFormData({ ...formData, taxId: event.target.value.toUpperCase(), gstVerification: null })}
                      className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
                    />
                    <button type="button" onClick={verifyGstin} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Verify
                    </button>
                  </div>
                  {formData.gstVerification && (() => {
                    const gv = formData.gstVerification;
                    const nameMatch = gv.legalNameMatch;
                    const portalVerified = gv.portalVerified;
                    const bgClass = !gv.valid
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : portalVerified && nameMatch === true
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : portalVerified && nameMatch === false
                      ? 'bg-orange-50 text-orange-800 border border-orange-200'
                      : 'bg-amber-50 text-amber-900 border border-amber-200';
                    return (
                      <div className={`mt-2 rounded-lg px-3 py-2 text-sm ${bgClass}`}>
                        <div className="font-medium">{gv.message || (gv.valid ? 'GSTIN basic validation passed' : 'GSTIN invalid')}</div>
                        {gv.details?.stateName && <div className="text-xs mt-1">State: {gv.details.stateName}</div>}
                        {gv.details?.pan && <div className="text-xs">PAN: {gv.details.pan}</div>}
                        {portalVerified && gv.details?.portalLegalName && (
                          <div className="text-xs mt-1">
                            <span className="font-semibold">Portal name:</span> {gv.details.portalLegalName}
                            {gv.details.portalTradeName && gv.details.portalTradeName !== gv.details.portalLegalName && (
                              <span className="ml-1">(Trade: {gv.details.portalTradeName})</span>
                            )}
                          </div>
                        )}
                        {portalVerified && gv.details?.portalAddress?.fullAddress && (
                          <div className="text-xs mt-1">
                            <span className="font-semibold">Portal address:</span> {gv.details.portalAddress.fullAddress}
                          </div>
                        )}
                        {portalVerified && gv.details?.portalStatus && (
                          <div className="text-xs mt-1">GST status: {gv.details.portalStatus}</div>
                        )}
                        {portalVerified && nameMatch === true && (
                          <div className="text-xs mt-1 font-semibold">✓ Name verified</div>
                        )}
                        {portalVerified && nameMatch === false && gv.details?.enteredLegalName && (
                          <div className="text-xs mt-1">Entered: {gv.details.enteredLegalName}</div>
                        )}
                        {!portalVerified && gv.valid && (
                          <div className="mt-1 text-xs">Only GSTIN format and checksum were validated.</div>
                        )}
                      </div>
                    );
                  })()}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={formData.category}
                    onChange={(event) => setFormData({ ...formData, category: event.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="RAW_MATERIAL">Raw Material</option>
                    <option value="COMPONENT">Component</option>
                    <option value="SERVICE">Service</option>
                    <option value="CONSUMABLE">Consumable</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Terms</label>
                  <select
                    value={formData.paymentTerms}
                    onChange={(event) => setFormData({ ...formData, paymentTerms: event.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  >
                    <option value="NET_30">Net 30</option>
                    <option value="NET_60">Net 60</option>
                    <option value="NET_90">Net 90</option>
                    <option value="ADVANCE">Advance</option>
                    <option value="COD">Cash on Delivery</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Credit Limit</label>
                  <input
                    type="number"
                    value={formData.creditLimit}
                    onChange={(event) => setFormData({ ...formData, creditLimit: Number(event.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rating (0-5)</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={formData.rating}
                    onChange={(event) => setFormData({ ...formData, rating: Number(event.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Contact Persons</h3>
                  <button type="button" onClick={addContact} className="px-3 py-2 text-sm bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200">
                    + Add Contact
                  </button>
                </div>
                <div className="space-y-3">
                  {formData.contacts.map((contact, index) => (
                    <div key={`contact-${index}`} className="rounded-lg border border-gray-200 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                          <div className="flex gap-2">
                            <select
                              value={contact.salutation}
                              onChange={(e) => updateContact(index, 'salutation', e.target.value)}
                              className="border border-gray-300 rounded-lg px-2 py-2 w-24 flex-shrink-0 text-sm"
                            >
                              <option value="">Title</option>
                              <option value="Mr.">Mr.</option>
                              <option value="Mrs.">Mrs.</option>
                              <option value="Ms.">Ms.</option>
                              <option value="Dr.">Dr.</option>
                            </select>
                            <input
                              type="text"
                              value={contact.name}
                              onChange={(event) => updateContact(index, 'name', event.target.value)}
                              className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                          <div className="flex gap-1">
                            <select
                              value={formData.countryCode}
                              onChange={(e) => setFormData({ ...formData, countryCode: e.target.value })}
                              className="border border-gray-300 rounded-lg px-2 py-2 w-20 flex-shrink-0 text-sm"
                            >
                              <option value="+91">🇮🇳 +91</option>
                              <option value="+1">🇺🇸 +1</option>
                              <option value="+44">🇬🇧 +44</option>
                              <option value="+971">🇦🇪 +971</option>
                              <option value="+65">🇸🇬 +65</option>
                              <option value="+60">🇲🇾 +60</option>
                              <option value="+61">🇦🇺 +61</option>
                              <option value="+49">🇩🇪 +49</option>
                              <option value="+81">🇯🇵 +81</option>
                              <option value="+86">🇨🇳 +86</option>
                            </select>
                            <input
                              type="tel"
                              value={contact.phone}
                              onChange={(event) => updateContact(index, 'phone', event.target.value)}
                              className="flex-1 border border-gray-300 rounded-lg px-4 py-2"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                          <input
                            type="email"
                            value={contact.email}
                            onChange={(event) => updateContact(index, 'email', event.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2"
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm text-gray-700">
                          <input type="radio" checked={contact.isDefault} onChange={() => updateContact(index, 'isDefault', true)} />
                          Default contact
                        </label>
                        {formData.contacts.length > 1 && (
                          <button type="button" onClick={() => removeContact(index)} className="text-sm text-red-600 hover:text-red-800">
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendor Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address Line</label>
                    <input
                      type="text"
                      value={formData.billingLine2}
                      onChange={(event) => setFormData({ ...formData, billingLine2: event.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      placeholder="Building, landmark, area, etc."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Street</label>
                    <input
                      type="text"
                      value={formData.street}
                      onChange={(event) => setFormData({ ...formData, street: event.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                      placeholder="Street address, building name, floor, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(event) => setFormData({ ...formData, city: event.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(event) => setFormData({ ...formData, state: event.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">PIN Code</label>
                    <input
                      type="text"
                      value={formData.pincode}
                      onChange={(event) => setFormData({ ...formData, pincode: event.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(event) => setFormData({ ...formData, country: event.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address (Legacy - will be migrated)</label>
                <textarea
                  value={formData.address}
                  onChange={(event) => setFormData({ ...formData, address: event.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50"
                />
              </div>

              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Bank Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name</label>
                    <input type="text" value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="e.g. HDFC Bank" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Account Type</label>
                    <select value={formData.bankAccountType}
                      onChange={(e) => setFormData({ ...formData, bankAccountType: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2">
                      <option value="CURRENT">Current</option>
                      <option value="SAVINGS">Savings</option>
                      <option value="CC">Cash Credit</option>
                      <option value="OD">Overdraft</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                    <input type="text" value={formData.bankAccountNumber}
                      onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="Bank account number" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code</label>
                    <input type="text" value={formData.bankIfscCode}
                      onChange={(e) => setFormData({ ...formData, bankIfscCode: e.target.value.toUpperCase() })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="e.g. HDFC0001234" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Branch</label>
                    <input type="text" value={formData.bankBranch}
                      onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2" placeholder="Branch name and city" />
                  </div>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(event) => setFormData({ ...formData, isActive: event.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                  Active Vendor
                </label>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={editingVendor ? !canEdit : !canCreate}
                className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                {editingVendor ? 'Update Vendor' : 'Create Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}

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
            <p className="text-xs text-gray-600">GST: {data.tax_id || data.gst_number || 'N/A'}</p>
            <p className="text-xs text-gray-600">Email: {data.email || 'N/A'}</p>
            <p className="text-xs text-gray-600">Phone: {data.phone || 'N/A'}</p>
          </div>
        )}
      />
    </div>
  );
}
