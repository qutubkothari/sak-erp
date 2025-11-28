'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '../../../../lib/api-client';

type TabType = 'customers' | 'quotations' | 'orders' | 'dispatch' | 'warranties';

interface Customer {
  id: string;
  customer_code: string;
  customer_name: string;
  customer_type: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  gst_number?: string;
  city?: string;
  state?: string;
  credit_limit: number;
  credit_days: number;
  is_active: boolean;
}

interface QuotationItem {
  item_id: string;
  item_description: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  tax_percentage: number;
}

interface Quotation {
  id: string;
  quotation_number: string;
  customer_id: string;
  customer_name?: string;
  quotation_date: string;
  valid_until: string;
  status: string;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  net_amount: number;
  payment_terms?: string;
  delivery_terms?: string;
  created_at: string;
}

interface SalesOrder {
  id: string;
  so_number: string;
  customer_id: string;
  customer_name?: string;
  order_date: string;
  expected_delivery_date?: string;
  status: string;
  total_amount: number;
  net_amount: number;
  advance_paid: number;
  balance_amount: number;
  created_at: string;
}

interface DispatchNote {
  id: string;
  dn_number: string;
  sales_order_id: string;
  so_number?: string;
  customer_id: string;
  customer_name?: string;
  dispatch_date: string;
  transporter_name?: string;
  vehicle_number?: string;
  lr_number?: string;
  created_at: string;
}

interface Warranty {
  id: string;
  warranty_number: string;
  uid: string;
  customer_name?: string;
  item_description?: string;
  warranty_start_date: string;
  warranty_duration_months: number;
  warranty_end_date: string;
  warranty_type: string;
  status: string;
  claim_count: number;
  created_at: string;
}

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('customers');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [dispatches, setDispatches] = useState<DispatchNote[]>([]);
  const [warranties, setWarranties] = useState<Warranty[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Customer form
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    customer_name: '',
    customer_type: 'REGULAR',
    contact_person: '',
    email: '',
    phone: '',
    mobile: '',
    gst_number: '',
    pan_number: '',
    billing_address: '',
    shipping_address: '',
    city: '',
    state: '',
    country: 'India',
    pincode: '',
    credit_limit: 0,
    credit_days: 30,
  });

  // Quotation form
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [quotationForm, setQuotationForm] = useState({
    customer_id: '',
    quotation_date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    payment_terms: '',
    delivery_terms: '',
    notes: '',
    items: [] as QuotationItem[],
  });

  // Dispatch form
  const [showDispatchForm, setShowDispatchForm] = useState(false);
  const [selectedOrderForDispatch, setSelectedOrderForDispatch] = useState<SalesOrder | null>(null);
  const [dispatchForm, setDispatchForm] = useState({
    sales_order_id: '',
    dispatch_date: new Date().toISOString().split('T')[0],
    transporter_name: '',
    vehicle_number: '',
    lr_number: '',
    lr_date: new Date().toISOString().split('T')[0],
    delivery_address: '',
    notes: '',
    items: [] as { sales_order_item_id: string; item_id: string; uid: string; quantity: number; batch_number?: string }[],
  });

  useEffect(() => {
    if (activeTab === 'customers') {
      fetchCustomers();
    } else if (activeTab === 'quotations') {
      fetchQuotations();
    } else if (activeTab === 'orders') {
      fetchOrders();
    } else if (activeTab === 'dispatch') {
      fetchDispatches();
    } else if (activeTab === 'warranties') {
      fetchWarranties();
    }
  }, [activeTab]);

  const fetchCustomers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Customer[]>('/sales/customers');
      setCustomers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuotations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Quotation[]>('/sales/quotations');
      setQuotations(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch quotations');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<SalesOrder[]>('/sales/orders');
      setOrders(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch sales orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchDispatches = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<DispatchNote[]>('/api/v1/sales/dispatch');
      setDispatches(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dispatch notes');
    } finally {
      setLoading(false);
    }
  };

  const fetchWarranties = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiClient.get<Warranty[]>('/api/v1/sales/warranties');
      setWarranties(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch warranties');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/api/v1/sales/customers', customerForm);
      setShowCustomerForm(false);
      setCustomerForm({
        customer_name: '',
        customer_type: 'REGULAR',
        contact_person: '',
        email: '',
        phone: '',
        mobile: '',
        gst_number: '',
        pan_number: '',
        billing_address: '',
        shipping_address: '',
        city: '',
        state: '',
        country: 'India',
        pincode: '',
        credit_limit: 0,
        credit_days: 30,
      });
      fetchCustomers();
    } catch (err: any) {
      setError(err.message || 'Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/api/v1/sales/quotations', quotationForm);
      setShowQuotationForm(false);
      setQuotationForm({
        customer_id: '',
        quotation_date: new Date().toISOString().split('T')[0],
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        payment_terms: '',
        delivery_terms: '',
        notes: '',
        items: [],
      });
      fetchQuotations();
    } catch (err: any) {
      setError(err.message || 'Failed to create quotation');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveQuotation = async (quotationId: string) => {
    if (!confirm('Approve this quotation?')) return;
    setLoading(true);
    setError(null);
    try {
      await apiClient.put(`/api/v1/sales/quotations/${quotationId}/approve`, {});
      fetchQuotations();
    } catch (err: any) {
      setError(err.message || 'Failed to approve quotation');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToSO = async (quotationId: string) => {
    if (!confirm('Convert this quotation to Sales Order?')) return;
    setLoading(true);
    setError(null);
    try {
      await apiClient.post(`/api/v1/sales/quotations/${quotationId}/convert-to-so`, {});
      fetchQuotations();
      fetchOrders();
    } catch (err: any) {
      setError(err.message || 'Failed to convert to sales order');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiClient.post('/api/v1/sales/dispatch', dispatchForm);
      setShowDispatchForm(false);
      setSelectedOrderForDispatch(null);
      setDispatchForm({
        sales_order_id: '',
        dispatch_date: new Date().toISOString().split('T')[0],
        transporter_name: '',
        vehicle_number: '',
        lr_number: '',
        lr_date: new Date().toISOString().split('T')[0],
        delivery_address: '',
        notes: '',
        items: [],
      });
      fetchDispatches();
      fetchOrders();
      fetchWarranties();
    } catch (err: any) {
      setError(err.message || 'Failed to create dispatch');
    } finally {
      setLoading(false);
    }
  };

  const addQuotationItem = () => {
    setQuotationForm({
      ...quotationForm,
      items: [
        ...quotationForm.items,
        {
          item_id: '',
          item_description: '',
          quantity: 1,
          unit_price: 0,
          discount_percentage: 0,
          tax_percentage: 18,
        },
      ],
    });
  };

  const updateQuotationItem = (index: number, field: keyof QuotationItem, value: any) => {
    const newItems = [...quotationForm.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setQuotationForm({ ...quotationForm, items: newItems });
  };

  const removeQuotationItem = (index: number) => {
    setQuotationForm({
      ...quotationForm,
      items: quotationForm.items.filter((_, i) => i !== index),
    });
  };

  const addDispatchItem = () => {
    setDispatchForm({
      ...dispatchForm,
      items: [
        ...dispatchForm.items,
        {
          sales_order_item_id: '',
          item_id: '',
          uid: '',
          quantity: 1,
          batch_number: '',
        },
      ],
    });
  };

  const updateDispatchItem = (index: number, field: string, value: any) => {
    const newItems = [...dispatchForm.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setDispatchForm({ ...dispatchForm, items: newItems });
  };

  const removeDispatchItem = (index: number) => {
    setDispatchForm({
      ...dispatchForm,
      items: dispatchForm.items.filter((_, i) => i !== index),
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      CONVERTED: 'bg-blue-100 text-blue-800',
      CONFIRMED: 'bg-green-100 text-green-800',
      IN_PRODUCTION: 'bg-purple-100 text-purple-800',
      READY_TO_DISPATCH: 'bg-orange-100 text-orange-800',
      DISPATCHED: 'bg-blue-100 text-blue-800',
      DELIVERED: 'bg-green-100 text-green-800',
      ACTIVE: 'bg-green-100 text-green-800',
      EXPIRED: 'bg-gray-100 text-gray-800',
      CLAIMED: 'bg-yellow-100 text-yellow-800',
      VOID: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sales & Dispatch Management</h1>
        <p className="text-sm text-gray-600 mt-1">
          Manage customers, quotations, sales orders, dispatch, and warranties
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
            { id: 'customers', label: 'Customers' },
            { id: 'quotations', label: 'Quotations' },
            { id: 'orders', label: 'Sales Orders' },
            { id: 'dispatch', label: 'Dispatch' },
            { id: 'warranties', label: 'Warranties' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <div>
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Customer List</h2>
            <button
              onClick={() => setShowCustomerForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Add Customer
            </button>
          </div>

          {loading ? (
            <p className="text-gray-600">Loading customers...</p>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">City</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credit Limit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {customer.customer_code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.customer_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{customer.customer_type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {customer.contact_person || '-'}
                        <br />
                        <span className="text-xs">{customer.mobile || customer.phone || '-'}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{customer.city || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        ₹{customer.credit_limit.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            customer.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {customer.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Customer Form Modal */}
          {showCustomerForm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">Add New Customer</h3>
                <form onSubmit={handleCreateCustomer}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
                      <input
                        type="text"
                        required
                        value={customerForm.customer_name}
                        onChange={(e) => setCustomerForm({ ...customerForm, customer_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Customer Type</label>
                      <select
                        value={customerForm.customer_type}
                        onChange={(e) => setCustomerForm({ ...customerForm, customer_type: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="REGULAR">Regular</option>
                        <option value="DISTRIBUTOR">Distributor</option>
                        <option value="DEALER">Dealer</option>
                        <option value="CORPORATE">Corporate</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                      <input
                        type="text"
                        value={customerForm.contact_person}
                        onChange={(e) => setCustomerForm({ ...customerForm, contact_person: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={customerForm.email}
                        onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="text"
                        value={customerForm.phone}
                        onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                      <input
                        type="text"
                        value={customerForm.mobile}
                        onChange={(e) => setCustomerForm({ ...customerForm, mobile: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                      <input
                        type="text"
                        value={customerForm.gst_number}
                        onChange={(e) => setCustomerForm({ ...customerForm, gst_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number</label>
                      <input
                        type="text"
                        value={customerForm.pan_number}
                        onChange={(e) => setCustomerForm({ ...customerForm, pan_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Billing Address</label>
                      <textarea
                        value={customerForm.billing_address}
                        onChange={(e) => setCustomerForm({ ...customerForm, billing_address: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        rows={2}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={customerForm.city}
                        onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input
                        type="text"
                        value={customerForm.state}
                        onChange={(e) => setCustomerForm({ ...customerForm, state: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit</label>
                      <input
                        type="number"
                        value={customerForm.credit_limit}
                        onChange={(e) => setCustomerForm({ ...customerForm, credit_limit: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Credit Days</label>
                      <input
                        type="number"
                        value={customerForm.credit_days}
                        onChange={(e) => setCustomerForm({ ...customerForm, credit_days: parseInt(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowCustomerForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Creating...' : 'Create Customer'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quotations Tab */}
      {activeTab === 'quotations' && (
        <div>
          <div className="mb-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Quotations</h2>
            <button
              onClick={() => setShowQuotationForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              + Create Quotation
            </button>
          </div>

          {loading ? (
            <p className="text-gray-600">Loading quotations...</p>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">QT Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valid Until</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {quotations.map((quotation) => (
                    <tr key={quotation.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {quotation.quotation_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {quotation.customer_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(quotation.quotation_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(quotation.valid_until).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{quotation.net_amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(quotation.status)}`}>
                          {quotation.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {quotation.status === 'DRAFT' && (
                          <button
                            onClick={() => handleApproveQuotation(quotation.id)}
                            className="text-green-600 hover:text-green-900 mr-2"
                          >
                            Approve
                          </button>
                        )}
                        {quotation.status === 'APPROVED' && (
                          <button
                            onClick={() => handleConvertToSO(quotation.id)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Convert to SO
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Quotation Form Modal */}
          {showQuotationForm && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">Create Quotation</h3>
                <form onSubmit={handleCreateQuotation}>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                      <select
                        required
                        value={quotationForm.customer_id}
                        onChange={(e) => setQuotationForm({ ...quotationForm, customer_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">Select Customer</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.customer_name} ({c.customer_code})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quotation Date *</label>
                      <input
                        type="date"
                        required
                        value={quotationForm.quotation_date}
                        onChange={(e) => setQuotationForm({ ...quotationForm, quotation_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until *</label>
                      <input
                        type="date"
                        required
                        value={quotationForm.valid_until}
                        onChange={(e) => setQuotationForm({ ...quotationForm, valid_until: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                      <input
                        type="text"
                        value={quotationForm.payment_terms}
                        onChange={(e) => setQuotationForm({ ...quotationForm, payment_terms: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">Items *</label>
                      <button
                        type="button"
                        onClick={addQuotationItem}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        + Add Item
                      </button>
                    </div>
                    {quotationForm.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-6 gap-2 mb-2 p-3 border border-gray-200 rounded-lg">
                        <input
                          type="text"
                          placeholder="Item ID"
                          required
                          value={item.item_id}
                          onChange={(e) => updateQuotationItem(index, 'item_id', e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Description"
                          required
                          value={item.item_description}
                          onChange={(e) => updateQuotationItem(index, 'item_description', e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Qty"
                          required
                          value={item.quantity}
                          onChange={(e) => updateQuotationItem(index, 'quantity', parseFloat(e.target.value))}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Price"
                          required
                          value={item.unit_price}
                          onChange={(e) => updateQuotationItem(index, 'unit_price', parseFloat(e.target.value))}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Disc%"
                          value={item.discount_percentage}
                          onChange={(e) => updateQuotationItem(index, 'discount_percentage', parseFloat(e.target.value))}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeQuotationItem(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowQuotationForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || quotationForm.items.length === 0}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Creating...' : 'Create Quotation'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sales Orders Tab */}
      {activeTab === 'orders' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Sales Orders</h2>
          {loading ? (
            <p className="text-gray-600">Loading sales orders...</p>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SO Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivery Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {order.so_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.customer_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(order.order_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {order.expected_delivery_date ? new Date(order.expected_delivery_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{order.net_amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ₹{order.balance_amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {(order.status === 'READY_TO_DISPATCH' || order.status === 'CONFIRMED') && (
                          <button
                            onClick={() => {
                              setSelectedOrderForDispatch(order);
                              setDispatchForm({ ...dispatchForm, sales_order_id: order.id });
                              setShowDispatchForm(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Create Dispatch
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Dispatch Form Modal */}
          {showDispatchForm && selectedOrderForDispatch && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">
                  Create Dispatch for {selectedOrderForDispatch.so_number}
                </h3>
                <form onSubmit={handleCreateDispatch}>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dispatch Date *</label>
                      <input
                        type="date"
                        required
                        value={dispatchForm.dispatch_date}
                        onChange={(e) => setDispatchForm({ ...dispatchForm, dispatch_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Transporter Name</label>
                      <input
                        type="text"
                        value={dispatchForm.transporter_name}
                        onChange={(e) => setDispatchForm({ ...dispatchForm, transporter_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
                      <input
                        type="text"
                        value={dispatchForm.vehicle_number}
                        onChange={(e) => setDispatchForm({ ...dispatchForm, vehicle_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">LR Number</label>
                      <input
                        type="text"
                        value={dispatchForm.lr_number}
                        onChange={(e) => setDispatchForm({ ...dispatchForm, lr_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">Dispatch Items *</label>
                      <button
                        type="button"
                        onClick={addDispatchItem}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        + Add Item
                      </button>
                    </div>
                    {dispatchForm.items.map((item, index) => (
                      <div key={index} className="grid grid-cols-6 gap-2 mb-2 p-3 border border-gray-200 rounded-lg">
                        <input
                          type="text"
                          placeholder="SO Item ID"
                          required
                          value={item.sales_order_item_id}
                          onChange={(e) => updateDispatchItem(index, 'sales_order_item_id', e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Item ID"
                          required
                          value={item.item_id}
                          onChange={(e) => updateDispatchItem(index, 'item_id', e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <input
                          type="text"
                          placeholder="UID *"
                          required
                          value={item.uid}
                          onChange={(e) => updateDispatchItem(index, 'uid', e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Qty"
                          required
                          value={item.quantity}
                          onChange={(e) => updateDispatchItem(index, 'quantity', parseFloat(e.target.value))}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Batch"
                          value={item.batch_number}
                          onChange={(e) => updateDispatchItem(index, 'batch_number', e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => removeDispatchItem(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDispatchForm(false);
                        setSelectedOrderForDispatch(null);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || dispatchForm.items.length === 0}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {loading ? 'Creating...' : 'Create Dispatch'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dispatch Tab */}
      {activeTab === 'dispatch' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Dispatch Notes</h2>
          {loading ? (
            <p className="text-gray-600">Loading dispatch notes...</p>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">DN Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SO Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dispatch Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transporter</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle No.</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dispatches.map((dispatch) => (
                    <tr key={dispatch.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {dispatch.dn_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {dispatch.so_number || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {dispatch.customer_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(dispatch.dispatch_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {dispatch.transporter_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {dispatch.vehicle_number || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Warranties Tab */}
      {activeTab === 'warranties' && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Warranties</h2>
          {loading ? (
            <p className="text-gray-600">Loading warranties...</p>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Warranty No.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">UID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">End Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Claims</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {warranties.map((warranty) => (
                    <tr key={warranty.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {warranty.warranty_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {warranty.uid}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {warranty.customer_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(warranty.warranty_start_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {warranty.warranty_duration_months} months
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(warranty.warranty_end_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(warranty.status)}`}>
                          {warranty.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {warranty.claim_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
