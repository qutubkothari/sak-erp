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
  service_type: string;
  priority: string;
  status: string;
  complaint_date: string;
  complaint_description: string;
  reported_by?: string;
  contact_number?: string;
  product_name?: string;
  is_under_warranty: boolean;
  warranty_valid_until?: string;
  estimated_cost: number;
  actual_cost: number;
  expected_completion_date?: string;
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

  // Forms
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [showTechnicianForm, setShowTechnicianForm] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    customer_id: '',
    uid: '',
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

  const [technicianForm, setTechnicianForm] = useState({
    technician_name: '',
    specialization: '',
    contact_number: '',
    email: '',
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
  }, []);

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
      // Remove product_id before sending - backend only needs product_name
      const { product_id, ...ticketData } = ticketForm;
      await apiClient.post('/service/tickets', ticketData);
      setShowTicketForm(false);
      setTicketForm({
        customer_id: '',
        uid: '',
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
      fetchTickets();
    } catch (err: any) {
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
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Service Tickets</h2>
            <button
              onClick={() => setShowTicketForm(true)}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            >
              + Create Ticket
            </button>
          </div>

          {loading ? (
            <p className="text-gray-600">Loading service tickets...</p>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Ticket Form Modal */}
          {showTicketForm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">Create Service Ticket</h3>
                <form onSubmit={handleCreateTicket}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Customer ID *</label>
                      <SearchableSelect
                        options={customers.map(c => ({ value: c.id, label: `${c.customer_code} - ${c.customer_name}` }))}
                        value={ticketForm.customer_id}
                        onChange={(value) => setTicketForm({ ...ticketForm, customer_id: value })}
                        placeholder="Select Customer"
                        required
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">UID (Optional)</label>
                      {availableUIDs.length > 0 ? (
                        <SearchableSelect
                          options={availableUIDs.map(u => ({ 
                            value: u.uid, 
                            label: `${u.uid}${u.batch_number ? ` - Batch: ${u.batch_number}` : ''}${u.location ? ` - ${u.location}` : ''}` 
                          }))}
                          value={ticketForm.uid}
                          onChange={(value) => setTicketForm({ ...ticketForm, uid: value })}
                          placeholder="Select UID for warranty check"
                        />
                      ) : (
                        <input
                          type="text"
                          value={ticketForm.uid}
                          onChange={(e) => setTicketForm({ ...ticketForm, uid: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                          placeholder={ticketForm.product_id ? "No UIDs available for this product" : "Select a product first"}
                          disabled
                        />
                      )}
                      {availableUIDs.length === 0 && ticketForm.product_id && (
                        <p className="text-xs text-gray-500 mt-1">No available UIDs for this product - manual entry disabled</p>
                      )}
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
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Complaint Description *</label>
                      <textarea
                        required
                        value={ticketForm.complaint_description}
                        onChange={(e) => setTicketForm({ ...ticketForm, complaint_description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        rows={3}
                      />
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
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            tech.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {tech.is_active ? 'Active' : 'Inactive'}
                        </span>
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
