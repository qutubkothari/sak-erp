'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../lib/api-client';
import SearchableSelect from '../../../components/SearchableSelect';

type TabType = 'tickets' | 'technicians' | 'warranty-check' | 'reports';

interface ServiceTicket {
  id: string;
  ticket_number: string;
  customer: { customer_name: string };
  uid?: string;
  ship_name?: string;
  location?: string;
  service_type: string;
  priority: string;
  status: string;
  complaint_date: string;
  complaint_description: string;
  reported_by?: string;
  contact_number?: string;
  email?: string;
  product_name?: string;
  model_number?: string;
  service_location?: string;
  expected_completion_date?: string;
  is_under_warranty: boolean;
  warranty_valid_until?: string;
  estimated_cost: number;
  actual_cost: number;
  attachments?: string[];
  created_at: string;
}

interface Technician {
  id: string;
  technician_code: string;
  technician_name: string;
  specialization?: string;
  contact_number?: string;
  email?: string;
  is_active: boolean;
  total_assignments: number;
  completed_services: number;
  average_rating: number;
}

interface WarrantyValidation {
  is_valid: boolean;
  warranty: any;
  message: string;
  days_remaining?: number;
}

interface Customer {
  id: string;
  customer_code: string;
  customer_name: string;
  customer_type: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  mobile?: string;
}

interface Item {
  id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
}

interface UIDRecord {
  uid: string;
  entity_id: string;
  status: string;
  location?: string;
  batch_number?: string;
}

interface DeploymentStatusRecord {
  uid_id: string;
  uid: string;
  client_part_number: string | null;
  job_order_id: string | null;
  item_name: string | null;
  item_code: string | null;
  current_level: string | null;
  current_organization: string | null;
  current_location: string | null;
  current_deployment_date: string | null;
  warranty_expiry_date: string | null;
}

function getAttachmentKind(url: string): 'image' | 'video' | 'other' {
  const normalized = (url || '').split('?')[0].toLowerCase();
  if (normalized.match(/\.(mp4|mov|webm|mkv|avi|m4v)$/)) return 'video';
  if (normalized.match(/\.(png|jpe?g|gif|webp|bmp|svg)$/)) return 'image';
  // Fallback: if backend returns clean /uploads/... without extension
  if (normalized.includes('/uploads/') && normalized.includes('/service/')) return 'image';
  return 'other';
}

export default function ServicePage() {
  const [activeTab, setActiveTab] = useState<TabType>('tickets');
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data for dropdowns
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [availableUIDs, setAvailableUIDs] = useState<UIDRecord[]>([]);
  const [shipNames, setShipNames] = useState<string[]>([]);
  const [shipNameInput, setShipNameInput] = useState('');
  const [filteredShipNames, setFilteredShipNames] = useState<string[]>([]);
  const [showShipNameDropdown, setShowShipNameDropdown] = useState(false);

  // Product/Part Number/UID lookup (searches deployed units)
  const [productLookupInput, setProductLookupInput] = useState('');
  const [productLookupResults, setProductLookupResults] = useState<DeploymentStatusRecord[]>([]);
  const [showProductLookupDropdown, setShowProductLookupDropdown] = useState(false);
  const [productLookupLoading, setProductLookupLoading] = useState(false);
  const [selectedDeployment, setSelectedDeployment] = useState<DeploymentStatusRecord | null>(null);

  // Forms
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [showTechnicianForm, setShowTechnicianForm] = useState(false);
  const [showTicketDetails, setShowTicketDetails] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<ServiceTicket | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEditTicketModal, setShowEditTicketModal] = useState(false);
  const [editTicketForm, setEditTicketForm] = useState({
    priority: 'MEDIUM',
    expected_completion_date: '',
    ship_name: '',
    location: '',
    service_location: '',
    product_name: '',
    model_number: '',
    reported_by: '',
    contact_number: '',
    email: '',
    complaint_description: '',
  });
  const [showTechnicianDetails, setShowTechnicianDetails] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<any>(null);
  const [showEditTechnicianModal, setShowEditTechnicianModal] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    customer_id: '',
    uid: '',
    ship_name: '',
    location: '',
    complaint_description: '',
    reported_by: '',
    contact_number: '',
    email: '',
    product_id: '',
    product_name: '',
    model_number: '',
    service_location: '',
    priority: 'MEDIUM',
    expected_completion_date: '',
  });

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([]);

  const [technicianForm, setTechnicianForm] = useState({
    technician_name: '',
    specialization: '',
    contact_number: '',
    email: '',
    is_active: true,
  });

  // Warranty check
  const [warrantyUID, setWarrantyUID] = useState('');
  const [warrantyResult, setWarrantyResult] = useState<WarrantyValidation | null>(null);

  // Reports
  const [reports, setReports] = useState<any>(null);

  useEffect(() => {
    if (activeTab === 'tickets') {
      fetchTickets();
    } else if (activeTab === 'technicians') {
      fetchTechnicians();
    } else if (activeTab === 'reports') {
      fetchReports();
    }
  }, [activeTab]);

  useEffect(() => {
    // Fetch customers and items when component mounts
    fetchCustomers();
    fetchItems();
    fetchShipNames();
  }, []);

  useEffect(() => {
    if (!showTicketForm) return;

    const query = productLookupInput.trim();
    if (!query) {
      setProductLookupResults([]);
      setShowProductLookupDropdown(false);
      return;
    }

    const handle = setTimeout(async () => {
      try {
        setProductLookupLoading(true);
        const response = await apiClient.get<{
          data: DeploymentStatusRecord[];
          total: number;
          offset: number;
          limit: number;
        }>(
          `/uid/deployment/status?search=${encodeURIComponent(query)}&offset=0&limit=20&sort_by=uid&sort_order=asc`,
        );

        const results = response?.data || [];
        setProductLookupResults(results);
        setShowProductLookupDropdown(results.length > 0);
      } catch (err) {
        console.error('Failed to lookup product/part/uid:', err);
        setProductLookupResults([]);
        setShowProductLookupDropdown(false);
      } finally {
        setProductLookupLoading(false);
      }
    }, 250);

    return () => clearTimeout(handle);
  }, [productLookupInput, showTicketForm]);

  const formatWarrantyDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return dateStr;
    // 20-Jan-2026 style
    return date
      .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      .replace(/ /g, '-');
  };

  const getWarrantyStatusText = (warrantyExpiryDate: string | null | undefined) => {
    if (!warrantyExpiryDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(warrantyExpiryDate);
    if (Number.isNaN(expiry.getTime())) return null;
    expiry.setHours(0, 0, 0, 0);

    if (expiry >= today) {
      return `In warranty, expiring by ${formatWarrantyDate(warrantyExpiryDate)}`;
    }
    return `Warranty expired on ${formatWarrantyDate(warrantyExpiryDate)}`;
  };

  const selectDeployment = (deployment: DeploymentStatusRecord) => {
    setSelectedDeployment(deployment);
    setProductLookupInput(
      deployment.client_part_number
        ? `${deployment.client_part_number}`
        : deployment.uid,
    );
    setShowProductLookupDropdown(false);

    const matchedItem = deployment.item_code
      ? items.find((item) => item.code === deployment.item_code)
      : undefined;

    setTicketForm((prev) => ({
      ...prev,
      uid: deployment.uid,
      product_id: matchedItem?.id || prev.product_id,
      product_name: deployment.item_name || matchedItem?.name || prev.product_name,
      model_number: deployment.client_part_number || prev.model_number,
    }));
  };

  const fetchCustomers = async () => {
    try {
      const data = await apiClient.get<Customer[]>('/sales/customers');
      setCustomers(data);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const fetchItems = async () => {
    try {
      const data = await apiClient.get<Item[]>('/items');
      setItems(data);
    } catch (err) {
      console.error('Failed to fetch items:', err);
    }
  };

  const fetchShipNames = async () => {
    try {
      const data = await apiClient.get<ServiceTicket[]>('/service/tickets');
      const uniqueShipNames = [...new Set(data.map(t => t.ship_name).filter(Boolean))] as string[];
      setShipNames(uniqueShipNames.sort());
    } catch (err) {
      console.error('Failed to fetch ship names:', err);
    }
  };

  const updateShipNameSuggestions = (value: string) => {
    const query = value.trim().toLowerCase();
    const suggestions = query
      ? shipNames.filter((name) => name.toLowerCase().includes(query))
      : shipNames;

    setFilteredShipNames(suggestions);
    setShowShipNameDropdown(suggestions.length > 0);
  };

  const handleShipNameChange = (value: string) => {
    setShipNameInput(value);
    setTicketForm((prev) => ({ ...prev, ship_name: value }));
    updateShipNameSuggestions(value);
  };

  const selectShipName = (name: string) => {
    setShipNameInput(name);
    setTicketForm((prev) => ({ ...prev, ship_name: name }));
    setShowShipNameDropdown(false);
  };

  const fetchAvailableUIDs = async (itemId: string) => {
    if (!itemId) {
      setAvailableUIDs([]);
      return;
    }
    try {
      const data = await apiClient.get<UIDRecord[]>(`/uid?item_id=${itemId}&status=GENERATED`);
      setAvailableUIDs(data);
    } catch (err) {
      console.error('Failed to fetch UIDs:', err);
      setAvailableUIDs([]);
    }
  };

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<ServiceTicket[]>('/service/tickets');
      setTickets(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch service tickets');
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Technician[]>('/service/technicians');
      setTechnicians(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch technicians');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      const isUnder50MB = file.size <= 50 * 1024 * 1024; // 50MB limit
      return (isImage || isVideo) && isUnder50MB;
    });

    if (validFiles.length < files.length) {
      alert('Some files were rejected. Only images and videos under 50MB are allowed.');
    }

    setUploadedFiles(prev => [...prev, ...validFiles]);

    // Create previews
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setUploadPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<any>('/service/reports');
      setReports(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch reports');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Remove product_id and clean up empty date fields before sending
      const { product_id, ...ticketData } = ticketForm;
      
      // Convert empty string dates to null for PostgreSQL
      const cleanedData = {
        ...ticketData,
        expected_completion_date: ticketData.expected_completion_date || null,
      };
      
      console.log('Submitting ticket data:', cleanedData);
      
      // If there are files, upload them first
      let attachmentUrls: string[] = [];
      if (uploadedFiles.length > 0) {
        const formData = new FormData();
        uploadedFiles.forEach(file => {
          formData.append('files', file);
        });
        
        try {
          const token =
            typeof window !== 'undefined'
              ? window.localStorage.getItem('accessToken')
              : null;

          const uploadResponse = await fetch('/api/v1/service/uploads', {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: formData,
          });
          if (!uploadResponse.ok) {
            const errorText = await uploadResponse.text();
            throw new Error(`Upload failed (${uploadResponse.status}): ${errorText || uploadResponse.statusText}`);
          }
          const uploadResult = await uploadResponse.json();
          attachmentUrls = uploadResult?.urls || [];
        } catch (uploadError) {
          console.error('File upload failed:', uploadError);
          alert('Warning: File upload failed. Ticket will be created without attachments.');
        }
      }
      
      // Create ticket with attachment URLs
      const ticketDataWithAttachments = {
        ...cleanedData,
        attachments: attachmentUrls,
      };
      
      const response = await apiClient.post('/service/tickets', ticketDataWithAttachments);
      console.log('Ticket creation response:', response);
      setShowTicketForm(false);
      setTicketForm({
        customer_id: '',
        uid: '',
        ship_name: '',
        location: '',
        complaint_description: '',
        reported_by: '',
        contact_number: '',
        email: '',
        product_id: '',
        product_name: '',
        model_number: '',
        service_location: '',
        priority: 'MEDIUM',
        expected_completion_date: '',
      });
      setUploadedFiles([]);
      setUploadPreviews([]);
      setShipNameInput('');
      fetchTickets();
      fetchShipNames(); // Refresh ship names list
    } catch (err: any) {
      console.error('Ticket creation error:', err);
      setError(err.message || 'Failed to create service ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTechnician = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/service/technicians', technicianForm);
      setShowTechnicianForm(false);
      setTechnicianForm({
        technician_name: '',
        specialization: '',
        contact_number: '',
        email: '',
        is_active: true,
      });
      fetchTechnicians();
    } catch (err: any) {
      setError(err.message || 'Failed to create technician');
    } finally {
      setLoading(false);
    }
  };

  const handleWarrantyCheck = async () => {
    if (!warrantyUID.trim()) {
      setError('Please enter a UID');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<WarrantyValidation>(`/service/warranty/validate/${warrantyUID}`);
      setWarrantyResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to validate warranty');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      OPEN: 'bg-yellow-100 text-yellow-800',
      ASSIGNED: 'bg-blue-100 text-blue-800',
      IN_PROGRESS: 'bg-purple-100 text-purple-800',
      PARTS_PENDING: 'bg-orange-100 text-orange-800',
      COMPLETED: 'bg-green-100 text-green-800',
      CLOSED: 'bg-gray-100 text-gray-800',
      CANCELLED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      LOW: 'bg-blue-100 text-blue-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-orange-100 text-orange-800',
      CRITICAL: 'bg-red-100 text-red-800',
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const router = useRouter();

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-amber-600 hover:text-amber-800 text-sm mb-2"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Service & Warranty Management</h1>
        <p className="text-sm text-gray-600 mt-1">
          Manage service tickets, technicians, and warranty validations
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'tickets', label: 'Service Tickets' },
            { id: 'technicians', label: 'Technicians' },
            { id: 'warranty-check', label: 'Warranty Check' },
            { id: 'reports', label: 'Reports' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Service Tickets Tab */}
      {activeTab === 'tickets' && (
        <div>
          <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <h2 className="text-lg font-semibold">Service Tickets</h2>
            <button
              onClick={() => setShowTicketForm(true)}
              className="w-full sm:w-auto px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-center"
            >
              + Create Ticket
            </button>
          </div>

          {loading ? (
            <p className="text-gray-600">Loading service tickets...</p>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product/UID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warranty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {ticket.ticket_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {ticket.customer?.customer_name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div>{ticket.product_name || '-'}</div>
                        {ticket.uid && <div className="text-xs font-mono text-gray-500">{ticket.uid}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {ticket.service_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(ticket.complaint_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {ticket.is_under_warranty ? (
                          <span className="text-green-600">✓ Valid</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button onClick={() => { setSelectedTicket(ticket); setShowTicketDetails(true); }} className="text-blue-600 hover:text-blue-800" title="View Details">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedTicket(ticket);
                              setEditTicketForm({
                                priority: ticket.priority || 'MEDIUM',
                                expected_completion_date: (ticket as any).expected_completion_date || '',
                                ship_name: ticket.ship_name || '',
                                location: ticket.location || '',
                                service_location: (ticket as any).service_location || '',
                                product_name: ticket.product_name || '',
                                model_number: (ticket as any).model_number || '',
                                reported_by: ticket.reported_by || '',
                                contact_number: ticket.contact_number || '',
                                email: ticket.email || '',
                                complaint_description: ticket.complaint_description || '',
                              });
                              setShowEditTicketModal(true);
                            }}
                            className="text-amber-600 hover:text-amber-800"
                            title="Edit"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => { setSelectedTicket(ticket); setShowStatusModal(true); }} className="text-amber-600 hover:text-amber-800" title="Update Status">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                          </button>
                          {ticket.status === 'OPEN' && (
                            <button onClick={async () => { if (confirm('Delete this ticket?')) { try { await apiClient.delete(`/service/tickets/${ticket.id}`); fetchTickets(); } catch (err: any) { setError(err.message); } } }} className="text-red-600 hover:text-red-800" title="Delete">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              
              {/* Mobile Card View */}
              <div className="md:hidden space-y-4 p-4">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-amber-600">{ticket.ticket_number}</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-900 mb-1">{ticket.customer?.customer_name}</div>
                    <div className="text-xs text-gray-600 space-y-1">
                      {ticket.product_name && <div>📦 {ticket.product_name}</div>}
                      {ticket.uid && <div className="font-mono">🔖 {ticket.uid}</div>}
                      {ticket.ship_name && <div>🚢 {ticket.ship_name}</div>}
                      {ticket.location && <div>📍 {ticket.location}</div>}
                      <div>📅 {new Date(ticket.complaint_date).toLocaleDateString()}</div>
                      <div>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${getPriorityColor(ticket.priority)}`}>
                          {ticket.priority}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button 
                        onClick={() => { setSelectedTicket(ticket); setShowTicketDetails(true); }}
                        className="flex-1 text-xs px-3 py-2 bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                      >
                        View
                      </button>
                      <button
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setEditTicketForm({
                            priority: ticket.priority || 'MEDIUM',
                            expected_completion_date: (ticket as any).expected_completion_date || '',
                            ship_name: ticket.ship_name || '',
                            location: ticket.location || '',
                            service_location: (ticket as any).service_location || '',
                            product_name: ticket.product_name || '',
                            model_number: (ticket as any).model_number || '',
                            reported_by: ticket.reported_by || '',
                            contact_number: ticket.contact_number || '',
                            email: ticket.email || '',
                            complaint_description: ticket.complaint_description || '',
                          });
                          setShowEditTicketModal(true);
                        }}
                        className="flex-1 text-xs px-3 py-2 bg-amber-50 text-amber-700 rounded hover:bg-amber-100"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => { setSelectedTicket(ticket); setShowStatusModal(true); }}
                        className="flex-1 text-xs px-3 py-2 bg-amber-50 text-amber-700 rounded hover:bg-amber-100"
                      >
                        Update
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ticket Form Modal */}
          {showTicketForm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg p-4 md:p-6 max-w-2xl w-full max-h-[95vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg md:text-xl font-semibold">Create Service Ticket</h3>
                  <button onClick={() => setShowTicketForm(false)} className="text-gray-500 hover:text-gray-700">
                    ✕
                  </button>
                </div>
                <form onSubmit={handleCreateTicket}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Customer ID *</label>
                      <SearchableSelect
                        options={customers.map(c => ({ value: c.id, label: `${c.customer_code} - ${c.customer_name}` }))}
                        value={ticketForm.customer_id}
                        onChange={(value) => setTicketForm({ ...ticketForm, customer_id: value })}
                        placeholder="Select Customer"
                        required
                      />
                    </div>

                    {/* NEW FIELDS */}
                    <div className="md:col-span-2 relative">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        🚢 Ship Name * 
                        {shipNameInput && !shipNames.includes(shipNameInput) && (
                          <span className="ml-2 text-xs text-amber-600">✨ New ship (will be saved)</span>
                        )}
                      </label>
                      <input
                        type="text"
                        required
                        value={shipNameInput}
                        onChange={(e) => handleShipNameChange(e.target.value)}
                        onFocus={() => {
                          updateShipNameSuggestions(shipNameInput);
                        }}
                        onBlur={() => setTimeout(() => setShowShipNameDropdown(false), 200)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                        placeholder="Enter or select vessel/ship name"
                      />
                      
                      {/* Autocomplete Dropdown */}
                      {showShipNameDropdown && filteredShipNames.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {filteredShipNames.map((name, index) => (
                            <div
                              key={index}
                              onClick={() => selectShipName(name)}
                              className="px-4 py-2 hover:bg-amber-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                            >
                              🚢 {name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">📍 Location *</label>
                      <input
                        type="text"
                        required
                        value={ticketForm.location}
                        onChange={(e) => setTicketForm({ ...ticketForm, location: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                        placeholder="Port, coordinates, or specific location"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                      <SearchableSelect
                        options={items.map(i => ({ value: i.id, label: i.code, subtitle: i.name }))}
                        value={ticketForm.product_id}
                        onChange={(value) => {
                          const selectedItem = items.find(i => i.id === value);
                          setTicketForm({ 
                            ...ticketForm, 
                            product_id: value,
                            product_name: selectedItem?.name || '' 
                          });
                          fetchAvailableUIDs(value);
                        }}
                        placeholder="Select Product"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Search by Product / Part No / UID</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={productLookupInput}
                          onChange={(e) => {
                            setProductLookupInput(e.target.value);
                            setShowProductLookupDropdown(true);
                          }}
                          onFocus={() => {
                            if (productLookupResults.length > 0) setShowProductLookupDropdown(true);
                          }}
                          onBlur={() => setTimeout(() => setShowProductLookupDropdown(false), 200)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                          placeholder="Type product name, part number, or UID"
                        />

                        {showProductLookupDropdown && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {productLookupLoading ? (
                              <div className="px-4 py-2 text-sm text-gray-500">Searching...</div>
                            ) : productLookupResults.length === 0 ? (
                              <div className="px-4 py-2 text-sm text-gray-500">No matches found</div>
                            ) : (
                              productLookupResults.map((d) => (
                                <div
                                  key={d.uid_id}
                                  onClick={() => selectDeployment(d)}
                                  className="px-4 py-2 hover:bg-amber-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                                >
                                  <div className="font-medium">
                                    {d.item_name || 'Unknown Product'}
                                    {d.item_code ? <span className="text-gray-500"> ({d.item_code})</span> : null}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-0.5">
                                    <span className="font-mono">UID: {d.uid}</span>
                                    {d.client_part_number ? <span className="ml-2">Part: {d.client_part_number}</span> : null}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Use this when the customer shares a part number</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">UID</label>
                      <input
                        type="text"
                        value={selectedDeployment?.uid || ticketForm.uid}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono"
                        placeholder="Select from search above"
                        disabled
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Part Number</label>
                      <input
                        type="text"
                        value={selectedDeployment?.client_part_number || ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        placeholder="Select from search above"
                        disabled
                      />
                      {selectedDeployment?.warranty_expiry_date ? (
                        <p className="text-xs text-gray-600 mt-1">
                          {getWarrantyStatusText(selectedDeployment.warranty_expiry_date)}
                        </p>
                      ) : selectedDeployment ? (
                        <p className="text-xs text-gray-500 mt-1">Warranty status not available</p>
                      ) : null}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Model Number</label>
                      <input
                        type="text"
                        value={ticketForm.model_number}
                        onChange={(e) => setTicketForm({ ...ticketForm, model_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reported By *</label>
                      <input
                        type="text"
                        required
                        value={ticketForm.reported_by}
                        onChange={(e) => setTicketForm({ ...ticketForm, reported_by: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number *</label>
                      <input
                        type="text"
                        required
                        value={ticketForm.contact_number}
                        onChange={(e) => setTicketForm({ ...ticketForm, contact_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={ticketForm.email}
                        onChange={(e) => setTicketForm({ ...ticketForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                      <select
                        value={ticketForm.priority}
                        onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Service Location</label>
                      <textarea
                        value={ticketForm.service_location}
                        onChange={(e) => setTicketForm({ ...ticketForm, service_location: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        rows={2}
                      />
                    </div>
                    <div className="col-span-2 md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Complaint Description *</label>
                      <textarea
                        required
                        value={ticketForm.complaint_description}
                        onChange={(e) => setTicketForm({ ...ticketForm, complaint_description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                        rows={3}
                        placeholder="Describe the issue in detail"
                      />
                    </div>

                    {/* FILE UPLOAD SECTION */}
                    <div className="col-span-2 md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">📸 Photos & Videos</label>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-amber-400 transition">
                        <div className="space-y-1 text-center">
                          <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <div className="flex text-sm text-gray-600">
                            <label className="relative cursor-pointer bg-white rounded-md font-medium text-amber-600 hover:text-amber-500 focus-within:outline-none">
                              <span>Upload files</span>
                              <input
                                type="file"
                                multiple
                                accept="image/*,video/*"
                                onChange={handleFileUpload}
                                className="sr-only"
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-gray-500">Photos or videos up to 50MB each</p>
                        </div>
                      </div>
                      
                      {/* File Previews */}
                      {uploadedFiles.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                          {uploadPreviews.map((preview, index) => (
                            <div key={index} className="relative group">
                              {uploadedFiles[index].type.startsWith('image/') ? (
                                <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                              ) : (
                                <video src={preview} className="w-full h-24 object-cover rounded-lg" />
                              )}
                              <button
                                type="button"
                                onClick={() => removeFile(index)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                              <p className="text-xs text-gray-600 mt-1 truncate">{uploadedFiles[index].name}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowTicketForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                    >
                      {loading ? 'Creating...' : 'Create Ticket'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Ticket Details Modal */}
          {showTicketDetails && selectedTicket && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Ticket Details - {selectedTicket.ticket_number}</h3>
                  <button onClick={() => setShowTicketDetails(false)} className="text-gray-500 hover:text-gray-700">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-600">Customer</label><p className="mt-1 text-sm text-gray-900">{selectedTicket.customer?.customer_name || '-'}</p></div>
                  <div><label className="block text-sm font-medium text-gray-600">Status</label><span className={`mt-1 inline-block px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedTicket.status)}`}>{selectedTicket.status}</span></div>
                  <div><label className="block text-sm font-medium text-gray-600">Priority</label><span className={`mt-1 inline-block px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(selectedTicket.priority)}`}>{selectedTicket.priority}</span></div>
                  <div><label className="block text-sm font-medium text-gray-600">Service Type</label><p className="mt-1 text-sm text-gray-900">{selectedTicket.service_type}</p></div>
                  <div><label className="block text-sm font-medium text-gray-600">Product</label><p className="mt-1 text-sm text-gray-900">{selectedTicket.product_name || '-'}</p></div>
                  <div><label className="block text-sm font-medium text-gray-600">UID</label><p className="mt-1 text-sm font-mono text-gray-900">{selectedTicket.uid || '-'}</p></div>
                  <div><label className="block text-sm font-medium text-gray-600">Reported By</label><p className="mt-1 text-sm text-gray-900">{selectedTicket.reported_by || '-'}</p></div>
                  <div><label className="block text-sm font-medium text-gray-600">Contact</label><p className="mt-1 text-sm text-gray-900">{selectedTicket.contact_number || '-'}</p></div>
                  <div><label className="block text-sm font-medium text-gray-600">Complaint Date</label><p className="mt-1 text-sm text-gray-900">{new Date(selectedTicket.complaint_date).toLocaleDateString()}</p></div>
                  <div><span className="font-medium">Warranty:</span> {selectedTicket.is_under_warranty ? <span className="text-green-600">✓ Valid</span> : <span className="text-gray-600">Not Under Warranty</span>}</div>
                  <div className="col-span-2"><span className="font-medium">Complaint Description:</span> <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded">{selectedTicket.complaint_description}</p></div>
                </div>

                {/* Attachments */}
                {Array.isArray(selectedTicket.attachments) && selectedTicket.attachments.length > 0 && (
                  <div className="mt-6">
                    <div className="text-sm font-medium text-gray-700 mb-2">Attachments</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedTicket.attachments.map((url, idx) => {
                        const kind = getAttachmentKind(url);
                        return (
                          <a
                            key={`${url}-${idx}`}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="block border border-gray-200 rounded-lg overflow-hidden hover:border-amber-400 transition"
                            title="Open in new tab"
                          >
                            {kind === 'video' ? (
                              <video src={url} className="w-full h-32 object-cover bg-black" controls />
                            ) : kind === 'image' ? (
                              <img src={url} alt={`Attachment ${idx + 1}`} className="w-full h-32 object-cover" />
                            ) : (
                              <div className="w-full h-32 flex items-center justify-center text-sm text-gray-600 bg-gray-50">
                                Open Attachment
                              </div>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setEditTicketForm({
                        priority: selectedTicket.priority || 'MEDIUM',
                        expected_completion_date: (selectedTicket as any).expected_completion_date || '',
                        ship_name: selectedTicket.ship_name || '',
                        location: selectedTicket.location || '',
                        service_location: (selectedTicket as any).service_location || '',
                        product_name: selectedTicket.product_name || '',
                        model_number: (selectedTicket as any).model_number || '',
                        reported_by: selectedTicket.reported_by || '',
                        contact_number: selectedTicket.contact_number || '',
                        email: selectedTicket.email || '',
                        complaint_description: selectedTicket.complaint_description || '',
                      });
                      setShowEditTicketModal(true);
                    }}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                  >
                    Edit
                  </button>
                  <button onClick={() => setShowTicketDetails(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Close</button>
                </div>
              </div>
            </div>
          )}

          {/* Edit Ticket Modal */}
          {showEditTicketModal && selectedTicket && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">Edit Ticket - {selectedTicket.ticket_number}</h3>

                {/* Existing attachments (read-only) */}
                {Array.isArray(selectedTicket.attachments) && selectedTicket.attachments.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 mb-2">Existing Attachments</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {selectedTicket.attachments.map((url, idx) => {
                        const kind = getAttachmentKind(url);
                        return (
                          <a
                            key={`${url}-${idx}`}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="block border border-gray-200 rounded-lg overflow-hidden hover:border-amber-400 transition"
                            title="Open in new tab"
                          >
                            {kind === 'video' ? (
                              <video src={url} className="w-full h-28 object-cover bg-black" controls />
                            ) : kind === 'image' ? (
                              <img src={url} alt={`Attachment ${idx + 1}`} className="w-full h-28 object-cover" />
                            ) : (
                              <div className="w-full h-28 flex items-center justify-center text-sm text-gray-600 bg-gray-50">
                                Open Attachment
                              </div>
                            )}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setLoading(true);
                    setError(null);
                    try {
                      const payload = {
                        ...editTicketForm,
                        expected_completion_date:
                          editTicketForm.expected_completion_date || null,
                      };

                      const updated = await apiClient.put<ServiceTicket>(
                        `/service/tickets/${selectedTicket.id}`,
                        payload,
                      );

                      setSelectedTicket(updated);
                      setShowEditTicketModal(false);
                      fetchTickets();
                    } catch (err: any) {
                      setError(err.message || 'Failed to update ticket');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                      <select
                        value={editTicketForm.priority}
                        onChange={(e) =>
                          setEditTicketForm({
                            ...editTicketForm,
                            priority: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="CRITICAL">Critical</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Expected Completion Date</label>
                      <input
                        type="date"
                        value={editTicketForm.expected_completion_date}
                        onChange={(e) =>
                          setEditTicketForm({
                            ...editTicketForm,
                            expected_completion_date: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ship Name</label>
                      <input
                        type="text"
                        value={editTicketForm.ship_name}
                        onChange={(e) =>
                          setEditTicketForm({
                            ...editTicketForm,
                            ship_name: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                      <input
                        type="text"
                        value={editTicketForm.location}
                        onChange={(e) =>
                          setEditTicketForm({
                            ...editTicketForm,
                            location: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Service Location</label>
                      <input
                        type="text"
                        value={editTicketForm.service_location}
                        onChange={(e) =>
                          setEditTicketForm({
                            ...editTicketForm,
                            service_location: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                      <input
                        type="text"
                        value={editTicketForm.product_name}
                        onChange={(e) =>
                          setEditTicketForm({
                            ...editTicketForm,
                            product_name: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Model Number</label>
                      <input
                        type="text"
                        value={editTicketForm.model_number}
                        onChange={(e) =>
                          setEditTicketForm({
                            ...editTicketForm,
                            model_number: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reported By</label>
                      <input
                        type="text"
                        value={editTicketForm.reported_by}
                        onChange={(e) =>
                          setEditTicketForm({
                            ...editTicketForm,
                            reported_by: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                      <input
                        type="text"
                        value={editTicketForm.contact_number}
                        onChange={(e) =>
                          setEditTicketForm({
                            ...editTicketForm,
                            contact_number: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={editTicketForm.email}
                        onChange={(e) =>
                          setEditTicketForm({
                            ...editTicketForm,
                            email: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Complaint Description</label>
                      <textarea
                        value={editTicketForm.complaint_description}
                        onChange={(e) =>
                          setEditTicketForm({
                            ...editTicketForm,
                            complaint_description: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        rows={4}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowEditTicketModal(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                    >
                      {loading ? 'Updating...' : 'Update Ticket'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Update Status Modal */}
          {showStatusModal && selectedTicket && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <h3 className="text-lg font-semibold mb-4">Update Ticket Status</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current: <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedTicket.status)}`}>{selectedTicket.status}</span></label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg" defaultValue={selectedTicket.status} onChange={async (e) => { try { await apiClient.put(`/service/tickets/${selectedTicket.id}`, { status: e.target.value }); setShowStatusModal(false); setSelectedTicket(null); fetchTickets(); } catch (err: any) { setError(err.message); } }}>
                    <option value="OPEN">Open</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="PARTS_PENDING">Parts Pending</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CLOSED">Closed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                <div className="flex justify-end">
                  <button onClick={() => { setShowStatusModal(false); setSelectedTicket(null); }} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Technicians Tab */}
      {activeTab === 'technicians' && (
        <div>
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Technicians</h2>
            <button
              onClick={() => setShowTechnicianForm(true)}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            >
              + Add Technician
            </button>
          </div>

          {loading ? (
            <p className="text-gray-600">Loading technicians...</p>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specialization</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assignments</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {technicians.map((tech) => (
                    <tr key={tech.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {tech.technician_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{tech.technician_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{tech.specialization || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {tech.contact_number || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tech.total_assignments}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tech.completed_services}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tech.average_rating > 0 ? tech.average_rating.toFixed(1) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${tech.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {tech.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex space-x-2">
                          <button onClick={() => { setSelectedTechnician(tech); setShowTechnicianDetails(true); }} className="text-blue-600 hover:text-blue-800" title="View Details">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                          <button onClick={() => { setSelectedTechnician(tech); setTechnicianForm({ technician_name: tech.technician_name, specialization: tech.specialization || '', contact_number: tech.contact_number || '', email: tech.email || '', is_active: tech.is_active }); setShowEditTechnicianModal(true); }} className="text-amber-600 hover:text-amber-800" title="Edit">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={async () => { if (confirm(`Delete ${tech.technician_name}?`)) { try { await apiClient.delete(`/service/technicians/${tech.id}`); fetchTechnicians(); } catch (err: any) { setError(err.message); } } }} className="text-red-600 hover:text-red-800" title="Delete">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Technician Form Modal */}
          {showTechnicianForm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-lg w-full">
                <h3 className="text-lg font-semibold mb-4">Add Technician</h3>
                <form onSubmit={handleCreateTechnician}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                      <input
                        type="text"
                        required
                        value={technicianForm.technician_name}
                        onChange={(e) => setTechnicianForm({ ...technicianForm, technician_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label>
                      <input
                        type="text"
                        value={technicianForm.specialization}
                        onChange={(e) => setTechnicianForm({ ...technicianForm, specialization: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
                      <input
                        type="text"
                        value={technicianForm.contact_number}
                        onChange={(e) => setTechnicianForm({ ...technicianForm, contact_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={technicianForm.email}
                        onChange={(e) => setTechnicianForm({ ...technicianForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowTechnicianForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                    >
                      {loading ? 'Adding...' : 'Add Technician'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Technician Details Modal */}
          {showTechnicianDetails && selectedTechnician && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">Technician Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div><span className="font-medium">Code:</span> {selectedTechnician.technician_code}</div>
                    <div><span className="font-medium">Name:</span> {selectedTechnician.technician_name}</div>
                    <div><span className="font-medium">Specialization:</span> {selectedTechnician.specialization || 'N/A'}</div>
                    <div><span className="font-medium">Contact:</span> {selectedTechnician.contact_number || 'N/A'}</div>
                    <div><span className="font-medium">Email:</span> {selectedTechnician.email || 'N/A'}</div>
                    <div><span className="font-medium">Status:</span> <span className={`px-2 py-1 text-xs font-semibold rounded-full ${selectedTechnician.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{selectedTechnician.is_active ? 'Active' : 'Inactive'}</span></div>
                    <div><span className="font-medium">Total Assignments:</span> {selectedTechnician.total_assignments || 0}</div>
                    <div><span className="font-medium">Completed Jobs:</span> {selectedTechnician.completed_jobs || 0}</div>
                    <div><span className="font-medium">Average Rating:</span> {selectedTechnician.average_rating ? `${selectedTechnician.average_rating.toFixed(1)} ⭐` : 'N/A'}</div>
                    <div><span className="font-medium">Join Date:</span> {selectedTechnician.created_at ? new Date(selectedTechnician.created_at).toLocaleDateString() : 'N/A'}</div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end"><button onClick={() => setShowTechnicianDetails(false)} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Close</button></div>
              </div>
            </div>
          )}

          {/* Edit Technician Modal */}
          {showEditTechnicianModal && selectedTechnician && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
                <h3 className="text-lg font-semibold mb-4">Edit Technician</h3>
                <form onSubmit={async (e) => { e.preventDefault(); setLoading(true); setError(''); try { await apiClient.put(`/service/technicians/${selectedTechnician.id}`, technicianForm); setShowEditTechnicianModal(false); setTechnicianForm({ technician_name: '', specialization: '', contact_number: '', email: '', is_active: true }); fetchTechnicians(); } catch (err: any) { setError(err.message); } finally { setLoading(false); } }} className="space-y-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Technician Name *</label><input type="text" value={technicianForm.technician_name} onChange={(e) => setTechnicianForm({ ...technicianForm, technician_name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Specialization</label><input type="text" value={technicianForm.specialization} onChange={(e) => setTechnicianForm({ ...technicianForm, specialization: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label><input type="text" value={technicianForm.contact_number} onChange={(e) => setTechnicianForm({ ...technicianForm, contact_number: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={technicianForm.email} onChange={(e) => setTechnicianForm({ ...technicianForm, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" /></div>
                  <div><label className="flex items-center"><input type="checkbox" checked={technicianForm.is_active} onChange={(e) => setTechnicianForm({ ...technicianForm, is_active: e.target.checked })} className="mr-2" /><span className="text-sm font-medium text-gray-700">Active</span></label></div>
                  <div className="flex justify-end space-x-3"><button type="button" onClick={() => { setShowEditTechnicianModal(false); setTechnicianForm({ technician_name: '', specialization: '', contact_number: '', email: '', is_active: true }); }} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button><button type="submit" disabled={loading} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50">{loading ? 'Updating...' : 'Update Technician'}</button></div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Warranty Check Tab */}
      {activeTab === 'warranty-check' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Warranty Validation</h2>
          <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Enter Product UID</label>
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={warrantyUID}
                  onChange={(e) => setWarrantyUID(e.target.value)}
                  placeholder="Enter UID to check warranty status"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={handleWarrantyCheck}
                  disabled={loading}
                  className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
                >
                  {loading ? 'Checking...' : 'Check Warranty'}
                </button>
              </div>
            </div>

            {warrantyResult && (
              <div className={`mt-6 p-4 rounded-lg border-2 ${
                warrantyResult.is_valid ? 'bg-green-50 border-green-500' : 'bg-red-50 border-red-500'
              }`}>
                <div className="flex items-center mb-3">
                  <div className={`text-2xl mr-3 ${warrantyResult.is_valid ? 'text-green-600' : 'text-red-600'}`}>
                    {warrantyResult.is_valid ? '✓' : '✗'}
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold ${
                      warrantyResult.is_valid ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {warrantyResult.is_valid ? 'Warranty Valid' : 'Warranty Invalid/Expired'}
                    </h3>
                    <p className={`text-sm ${warrantyResult.is_valid ? 'text-green-700' : 'text-red-700'}`}>
                      {warrantyResult.message}
                    </p>
                  </div>
                </div>

                {warrantyResult.warranty && (
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Warranty Number:</span>
                      <span className="font-medium">{warrantyResult.warranty.warranty_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Start Date:</span>
                      <span className="font-medium">
                        {new Date(warrantyResult.warranty.warranty_start_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">End Date:</span>
                      <span className="font-medium">
                        {new Date(warrantyResult.warranty.warranty_end_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">{warrantyResult.warranty.warranty_duration_months} months</span>
                    </div>
                    {warrantyResult.is_valid && warrantyResult.days_remaining && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Days Remaining:</span>
                        <span className="font-medium text-green-600">{warrantyResult.days_remaining} days</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Service Reports</h2>
          {loading ? (
            <p className="text-gray-600">Loading reports...</p>
          ) : reports ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Ticket Status</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-yellow-600">Open Tickets:</span>
                    <span className="font-bold text-yellow-600">{reports.open_tickets}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-600">Closed Tickets:</span>
                    <span className="font-bold text-green-600">{reports.closed_tickets}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-bold">{reports.total_tickets}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Warranty Claims</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Claims Count:</span>
                    <span className="font-bold">{reports.warranty_claims_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Cost:</span>
                    <span className="font-bold">₹{reports.warranty_claims_cost?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Parts Cost:</span>
                    <span className="font-bold">₹{reports.warranty_parts_cost?.toLocaleString() || 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">Top Issues</h3>
                <div className="space-y-2">
                  {reports.product_reliability?.slice(0, 5).map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="truncate">{item.product}</span>
                      <span className="font-medium text-red-600">{item.issue_count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
