'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Download } from 'lucide-react';
import { apiClient } from '../../../../../lib/api-client';
import { useSelection } from '../../../../hooks/useSelection';
import DuplicateWarning, { useDuplicateDetection } from '../../../../components/DuplicateWarning';
import { confirmDialog } from '../../../../components/ui/ConfirmDialog';
import { PageHeader, PrimaryButton, DangerButton, SecondaryButton } from '../../../../components/ui/PageHeader';
import { TableSkeleton } from '../../../../components/ui/Skeleton';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { downloadCSV } from '@/lib/utils';
import { hasModulePermission, readStoredUser } from '@/lib/rbac';

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
  name: string;
  phone: string;
  email: string;
  isDefault: boolean;
};

type GstVerificationResult = {
  gstin?: string;
  valid?: boolean;
  verificationMode?: string;
  message?: string;
  details?: {
    formatValid?: boolean;
    checksumValid?: boolean;
    stateCode?: string | null;
    stateName?: string | null;
    pan?: string | null;
    entityCode?: string | null;
  };
};

type VendorFormState = {
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
  pincode: string;
  paymentTerms: string;
  creditLimit: number;
  rating: number;
  isActive: boolean;
  contacts: VendorContactForm[];
  gstVerification: GstVerificationResult | null;
};

function createEmptyContact(isDefault = false): VendorContactForm {
  return {
    name: '',
    phone: '',
    email: '',
    isDefault,
  };
}

function createInitialFormState(): VendorFormState {
  return {
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
    pincode: '',
    paymentTerms: 'NET_30',
    creditLimit: 0,
    rating: 0,
    isActive: true,
    contacts: [createEmptyContact(true)],
    gstVerification: null,
  };
}

function buildVendorPayload(formData: VendorFormState): VendorFormState {
  const name = String(formData.name || '').trim();
  const legalName = String(formData.legalName || '').trim() || name;
  const taxId = String(formData.taxId || '').trim().toUpperCase();
  const contacts = formData.contacts
    .map((contact) => ({
      name: String(contact.name || '').trim(),
      phone: String(contact.phone || '').trim(),
      email: String(contact.email || '').trim(),
      isDefault: Boolean(contact.isDefault),
    }))
    .filter((contact) => contact.name || contact.phone || contact.email);

  return {
    ...formData,
    name,
    legalName,
    taxId,
    address: String(formData.address || '').trim(),
    billingLine2: String(formData.billingLine2 || '').trim(),
    street: String(formData.street || '').trim(),
    city: String(formData.city || '').trim(),
    state: String(formData.state || '').trim(),
    country: String(formData.country || '').trim() || 'India',
    pincode: String(formData.pincode || '').trim(),
    contacts,
  };
}

function normalizeVendorContacts(contacts?: Vendor['contacts']): VendorContactForm[] {
  const list = Array.isArray(contacts)
    ? contacts
        .map((contact) => ({
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

export default function VendorsPage() {
  const currentUser = readStoredUser();
  const canCreate = hasModulePermission(currentUser, 'Purchase Management', 'create');
  const canEdit = hasModulePermission(currentUser, 'Purchase Management', 'edit');
  const canDelete = hasModulePermission(currentUser, 'Purchase Management', 'delete');

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [formData, setFormData] = useState<VendorFormState>(createInitialFormState());

  const selection = useSelection(vendors);
  const { duplicateState, checkDuplicates, handleProceed, handleCancel } = useDuplicateDetection();

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    fetchVendors();
  }, [filterCategory, debouncedSearchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory]);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterCategory !== 'ALL') params.append('category', filterCategory);
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
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
    } catch {
      toast.error('Failed to save vendor. Please try again.');
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

    await checkDuplicates(
      () => apiClient.post('/purchase/vendors/check-duplicates', payload),
      () => actuallySaveVendor(payload),
    );
  };

  const handleEdit = (vendor: Vendor) => {
    if (!canEdit) {
      toast.error('You do not have permission to edit vendors');
      return;
    }

    setEditingVendor(vendor);
    setFormData({
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
      pincode: vendor.pincode || '',
      paymentTerms: vendor.payment_terms,
      creditLimit: vendor.credit_limit || 0,
      rating: vendor.rating || 0,
      isActive: vendor.is_active,
      contacts: normalizeVendorContacts(vendor.contacts),
      gstVerification: vendor.gst_verification || null,
    });
    setShowModal(true);
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
    } catch {
      toast.error('Failed to delete vendor');
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
    } catch {
      toast.error('Failed to delete some vendors');
    }
  };

  const handleExportCSV = () => {
    const rows = vendors.map((vendor) => ({
      Code: vendor.code,
      Name: vendor.name,
      Category: vendor.category,
      Contact: vendor.contact_person,
      Email: vendor.email,
      Phone: vendor.phone,
      GSTIN: vendor.tax_id || '',
      City: vendor.city || '',
      State: vendor.state || '',
      'Payment Terms': vendor.payment_terms,
      Rating: vendor.rating,
      Status: vendor.is_active ? 'Active' : 'Inactive',
    }));

    downloadCSV(rows, `vendors-${new Date().toISOString().slice(0, 10)}`);
    toast.success('Vendors exported to CSV');
  };

  const verifyGstin = async () => {
    const gstin = String(formData.taxId || '').trim().toUpperCase();
    if (!gstin) {
      toast.error('Enter GSTIN first');
      return;
    }

    try {
      const result = await apiClient.post<GstVerificationResult>('/purchase/vendors/verify-gstin', { gstin });
      setFormData((prev) => ({
        ...prev,
        taxId: result.gstin || prev.taxId,
        legalName: prev.legalName.trim() || prev.name.trim(),
        gstVerification: result,
      }));

      if (result.valid) {
        toast.success(result.message || 'GSTIN verified');
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
            {selection.hasSelections && canDelete && (
              <DangerButton onClick={handleDeleteAll}>
                <Trash2 className="h-4 w-4" />
                Delete ({selection.selectedItems.length})
              </DangerButton>
            )}
            <SecondaryButton onClick={handleExportCSV}>
              <Download className="h-4 w-4" />
              Export CSV
            </SecondaryButton>
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
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, code, email..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            />
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
          <div className="mb-4 flex gap-2 items-center justify-between bg-white p-4 rounded-lg shadow">
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
          </div>

          {viewMode === 'table' ? (
            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-amber-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selection.isAllSelected}
                        onChange={selection.toggleSelectAll}
                        className="w-4 h-4"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Rating</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedVendors.map((vendor) => (
                    <tr
                      key={vendor.id}
                      className={`hover:bg-amber-50 transition-colors ${selection.isSelected(vendor.id) ? 'bg-amber-50' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selection.isSelected(vendor.id)}
                          onChange={() => selection.toggleSelection(vendor.id)}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{vendor.code}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{vendor.name}</div>
                        {vendor.legal_name && vendor.legal_name !== vendor.name && (
                          <div className="text-xs text-gray-500">{vendor.legal_name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{vendor.category}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <div>{vendor.contact_person || '-'}</div>
                        {Array.isArray(vendor.contacts) && vendor.contacts.length > 1 && (
                          <div className="text-xs text-gray-500">+{vendor.contacts.length - 1} more</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{vendor.email || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{vendor.phone || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700">{[vendor.city, vendor.state].filter(Boolean).join(', ') || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {vendor.rating > 0 ? <span className="text-yellow-500">★ {vendor.rating.toFixed(1)}</span> : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${vendor.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {vendor.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          {canEdit && (
                            <button onClick={() => handleEdit(vendor)} className="text-amber-600 hover:text-amber-800 font-medium">
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => handleDelete(vendor.id)} className="text-red-600 hover:text-red-800 font-medium">
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                    {canEdit && (
                      <button onClick={() => handleEdit(vendor)} className="flex-1 bg-amber-100 text-amber-700 px-4 py-2 rounded hover:bg-amber-200">
                        Edit
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

          {totalPages > 1 && (
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
                    onChange={(event) => setFormData({ ...formData, legalName: event.target.value })}
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
                  {formData.gstVerification && (
                    <div className={`mt-2 rounded-lg px-3 py-2 text-sm ${formData.gstVerification.valid ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
                      <div className="font-medium">{formData.gstVerification.message || (formData.gstVerification.valid ? 'GSTIN verified' : 'GSTIN invalid')}</div>
                      {formData.gstVerification.details?.stateName && <div className="text-xs mt-1">State: {formData.gstVerification.details.stateName}</div>}
                      {formData.gstVerification.details?.pan && <div className="text-xs">PAN: {formData.gstVerification.details.pan}</div>}
                    </div>
                  )}
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
                          <input
                            type="text"
                            value={contact.name}
                            onChange={(event) => updateContact(index, 'name', event.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                          <input
                            type="tel"
                            value={contact.phone}
                            onChange={(event) => updateContact(index, 'phone', event.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-2"
                          />
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
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
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
