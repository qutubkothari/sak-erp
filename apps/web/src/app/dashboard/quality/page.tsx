'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../lib/api-client';

interface Inspection {
  id: string;
  inspection_number: string;
  inspection_type: 'INCOMING' | 'IN_PROCESS' | 'FINAL';
  inspection_status: 'PENDING' | 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'ON_HOLD';
  inspection_date: string;
  item_name: string;
  quantity_inspected: number;
  quantity_accepted: number;
  quantity_rejected: number;
  defect_rate: number;
  inspector_name: string;
}

interface NCR {
  id: string;
  ncr_number: string;
  ncr_status: 'OPEN' | 'UNDER_REVIEW' | 'ACTION_PLANNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  raised_date: string;
  issue_description: string;
  root_cause: string;
  corrective_action: string;
  raised_by_name: string;
}

interface VendorRating {
  vendor_name: string;
  total_inspections: number;
  passed_inspections: number;
  pass_rate: number;
  total_defects: number;
  defect_rate_ppm: number;
  ncr_count: number;
  quality_score: number;
  quality_grade: string;
}

interface QualityDashboard {
  total_inspections: number;
  passed_inspections: number;
  failed_inspections: number;
  pass_rate: number;
  open_ncrs: number;
  closed_ncrs: number;
  top_defects: Array<{ defect_type: string; count: number }>;
}

export default function QualityPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'inspections' | 'ncr' | 'vendors' | 'dashboard'>('inspections');
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [ncrs, setNcrs] = useState<NCR[]>([]);
  const [vendorRatings, setVendorRatings] = useState<VendorRating[]>([]);
  const [dashboard, setDashboard] = useState<QualityDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Dropdown data
  const [grns, setGrns] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [uids, setUids] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [selectedGRN, setSelectedGRN] = useState<any>(null);
  
  // Inspection form state
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [inspectionForm, setInspectionForm] = useState({
    inspection_type: 'INCOMING',
    reference_type: 'GRN',
    reference_id: '',
    item_id: '',
    uid: '',
    quantity_inspected: 0,
    inspector_id: '',
    inspection_date: new Date().toISOString().split('T')[0],
    remarks: ''
  });

  // NCR form state
  const [showNcrForm, setShowNcrForm] = useState(false);
  const [ncrForm, setNcrForm] = useState({
    related_to: 'INSPECTION',
    reference_id: '',
    issue_description: '',
    severity: 'MEDIUM',
    root_cause: '',
    containment_action: '',
    corrective_action: '',
    preventive_action: ''
  });

  // Complete inspection form state
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [completeInspectionId, setCompleteInspectionId] = useState('');
  const [completeForm, setCompleteForm] = useState({
    inspection_status: 'PASSED',
    quantity_accepted: 0,
    quantity_rejected: 0,
    quantity_on_hold: 0,
    inspector_remarks: '',
    generate_ncr: false,
    ncr_description: ''
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    if (showInspectionForm) {
      fetchFormData();
    }
  }, [showInspectionForm]);

  const fetchFormData = async () => {
    try {
      // Fetch GRNs
      const grnsData = await apiClient.get('/purchase/grns');
      setGrns(grnsData.filter((g: any) => g.status === 'COMPLETED'));
      
      // Fetch all items
      const itemsData = await apiClient.get('/items');
      setItems(itemsData);
      
      // Fetch users (for inspectors)
      const usersData = await apiClient.get('/users');
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching form data:', error);
    }
  };

  const handleGRNChange = async (grnId: string) => {
    setInspectionForm({ ...inspectionForm, reference_id: grnId, item_id: '', uid: '' });
    
    try {
      // Fetch selected GRN details to get items and UIDs
      const grnDetails = await apiClient.get(`/purchase/grns/${grnId}`);
      setSelectedGRN(grnDetails);
      
      // Fetch UIDs generated for this GRN
      const uidsData = await apiClient.get(`/uid/search?grn=${grnDetails.grn_number}`);
      setUids(uidsData || []);
    } catch (error) {
      console.error('Error fetching GRN details:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'inspections') {
        const data = await apiClient.get('/quality/inspections');
        setInspections(data);
      } else if (activeTab === 'ncr') {
        const data = await apiClient.get('/quality/ncr');
        setNcrs(data);
      } else if (activeTab === 'vendors') {
        const data = await apiClient.get('/quality/vendor-ratings');
        setVendorRatings(data);
      } else if (activeTab === 'dashboard') {
        const data = await apiClient.get('/quality/dashboard');
        setDashboard(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/quality/inspections', inspectionForm);
      setShowInspectionForm(false);
      setInspectionForm({
        inspection_type: 'INCOMING',
        reference_type: 'GRN',
        reference_id: '',
        item_id: '',
        uid: '',
        quantity_inspected: 0,
        inspector_id: '',
        inspection_date: new Date().toISOString().split('T')[0],
        remarks: ''
      });
      fetchData();
      alert('Inspection created successfully');
    } catch (error) {
      console.error('Error creating inspection:', error);
      alert('Failed to create inspection');
    }
  };

  const handleCompleteInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post(`/quality/inspections/${completeInspectionId}/complete`, completeForm);
      setShowCompleteForm(false);
      setCompleteInspectionId('');
      setCompleteForm({
        inspection_status: 'PASSED',
        quantity_accepted: 0,
        quantity_rejected: 0,
        quantity_on_hold: 0,
        inspector_remarks: '',
        generate_ncr: false,
        ncr_description: ''
      });
      fetchData();
      alert('Inspection completed successfully');
    } catch (error) {
      console.error('Error completing inspection:', error);
      alert('Failed to complete inspection');
    }
  };

  const handleCreateNcr = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/quality/ncr', ncrForm);
      setShowNcrForm(false);
      setNcrForm({
        related_to: 'INSPECTION',
        reference_id: '',
        issue_description: '',
        severity: 'MEDIUM',
        root_cause: '',
        containment_action: '',
        corrective_action: '',
        preventive_action: ''
      });
      fetchData();
      alert('NCR created successfully');
    } catch (error) {
      console.error('Error creating NCR:', error);
      alert('Failed to create NCR');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'IN_PROGRESS': 'bg-blue-100 text-blue-800',
      'PASSED': 'bg-green-100 text-green-800',
      'FAILED': 'bg-red-100 text-red-800',
      'ON_HOLD': 'bg-gray-100 text-gray-800',
      'OPEN': 'bg-red-100 text-red-800',
      'UNDER_REVIEW': 'bg-yellow-100 text-yellow-800',
      'ACTION_PLANNED': 'bg-blue-100 text-blue-800',
      'RESOLVED': 'bg-purple-100 text-purple-800',
      'CLOSED': 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getGradeColor = (grade: string) => {
    const colors: { [key: string]: string } = {
      'A+': 'bg-green-600 text-white',
      'A': 'bg-green-500 text-white',
      'B': 'bg-blue-500 text-white',
      'C': 'bg-yellow-500 text-white',
      'D': 'bg-orange-500 text-white',
      'F': 'bg-red-500 text-white'
    };
    return colors[grade] || 'bg-gray-500 text-white';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-amber-600 hover:text-amber-800 text-sm mb-2"
        >
          ← Back to Dashboard
        </button>
      </div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Quality & Inspection Management</h1>
        <div className="space-x-2">
          {activeTab === 'inspections' && (
            <button
              onClick={() => setShowInspectionForm(true)}
              className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700"
            >
              + New Inspection
            </button>
          )}
          {activeTab === 'ncr' && (
            <button
              onClick={() => setShowNcrForm(true)}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              + New NCR
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <div className="flex space-x-8">
          <button
            onClick={() => setActiveTab('inspections')}
            className={`pb-4 px-2 ${activeTab === 'inspections' ? 'border-b-2 border-amber-600 text-amber-600 font-semibold' : 'text-gray-600'}`}
          >
            Inspections
          </button>
          <button
            onClick={() => setActiveTab('ncr')}
            className={`pb-4 px-2 ${activeTab === 'ncr' ? 'border-b-2 border-amber-600 text-amber-600 font-semibold' : 'text-gray-600'}`}
          >
            NCR
          </button>
          <button
            onClick={() => setActiveTab('vendors')}
            className={`pb-4 px-2 ${activeTab === 'vendors' ? 'border-b-2 border-amber-600 text-amber-600 font-semibold' : 'text-gray-600'}`}
          >
            Vendor Ratings
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`pb-4 px-2 ${activeTab === 'dashboard' ? 'border-b-2 border-amber-600 text-amber-600 font-semibold' : 'text-gray-600'}`}
          >
            Dashboard
          </button>
        </div>
      </div>

      {/* Inspections Tab */}
      {activeTab === 'inspections' && (
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inspection #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty Inspected</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Accepted</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rejected</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Defect Rate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inspector</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {inspections.map((inspection) => (
                  <tr key={inspection.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-amber-600">{inspection.inspection_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-800">
                        {inspection.inspection_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(inspection.inspection_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm">{inspection.item_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{inspection.quantity_inspected}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">{inspection.quantity_accepted}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">{inspection.quantity_rejected}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {inspection.defect_rate ? `${inspection.defect_rate.toFixed(2)}%` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${getStatusColor(inspection.inspection_status)}`}>
                        {inspection.inspection_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{inspection.inspector_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {(inspection.inspection_status === 'PENDING' || inspection.inspection_status === 'IN_PROGRESS') && (
                        <button
                          onClick={() => {
                            setCompleteInspectionId(inspection.id);
                            setCompleteForm({
                              ...completeForm,
                              quantity_accepted: inspection.quantity_inspected
                            });
                            setShowCompleteForm(true);
                          }}
                          className="text-amber-600 hover:text-amber-800"
                        >
                          Complete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NCR Tab */}
      {activeTab === 'ncr' && (
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">NCR #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Raised Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Root Cause</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Corrective Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Raised By</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ncrs.map((ncr) => (
                  <tr key={ncr.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">{ncr.ncr_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(ncr.raised_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm max-w-xs truncate">{ncr.issue_description}</td>
                    <td className="px-6 py-4 text-sm max-w-xs truncate">{ncr.root_cause || '-'}</td>
                    <td className="px-6 py-4 text-sm max-w-xs truncate">{ncr.corrective_action || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${getStatusColor(ncr.ncr_status)}`}>
                        {ncr.ncr_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{ncr.raised_by_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vendor Ratings Tab */}
      {activeTab === 'vendors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendorRatings.map((vendor, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">{vendor.vendor_name}</h3>
                <span className={`px-3 py-1 rounded-full font-bold ${getGradeColor(vendor.quality_grade)}`}>
                  {vendor.quality_grade}
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Quality Score:</span>
                  <span className="font-semibold">{vendor.quality_score.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Pass Rate:</span>
                  <span className="font-semibold text-green-600">{vendor.pass_rate.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Defect Rate (PPM):</span>
                  <span className="font-semibold text-orange-600">{vendor.defect_rate_ppm.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Inspections:</span>
                  <span className="font-semibold">{vendor.total_inspections}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Passed:</span>
                  <span className="font-semibold text-green-600">{vendor.passed_inspections}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">NCR Count:</span>
                  <span className="font-semibold text-red-600">{vendor.ncr_count}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && dashboard && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-2">Total Inspections</div>
              <div className="text-3xl font-bold text-amber-600">{dashboard.total_inspections}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-2">Pass Rate</div>
              <div className="text-3xl font-bold text-green-600">{dashboard.pass_rate.toFixed(1)}%</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-2">Open NCRs</div>
              <div className="text-3xl font-bold text-red-600">{dashboard.open_ncrs}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600 mb-2">Closed NCRs</div>
              <div className="text-3xl font-bold text-gray-600">{dashboard.closed_ncrs}</div>
            </div>
          </div>

          {/* Inspection Breakdown */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Inspection Results</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-600">{dashboard.passed_inspections}</div>
                <div className="text-sm text-gray-600">Passed</div>
              </div>
              <div className="text-center p-4 bg-red-50 rounded">
                <div className="text-2xl font-bold text-red-600">{dashboard.failed_inspections}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded">
                <div className="text-2xl font-bold text-gray-600">
                  {dashboard.total_inspections - dashboard.passed_inspections - dashboard.failed_inspections}
                </div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
            </div>
          </div>

          {/* Top Defects */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Top 5 Defect Types</h3>
            <div className="space-y-3">
              {dashboard.top_defects.map((defect, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-semibold">
                      {index + 1}
                    </div>
                    <span className="font-medium">{defect.defect_type}</span>
                  </div>
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                    {defect.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Inspection Modal */}
      {showInspectionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create New Inspection</h2>
            <form onSubmit={handleCreateInspection} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Inspection Type</label>
                  <select
                    value={inspectionForm.inspection_type}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, inspection_type: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    <option value="INCOMING">Incoming (IQC)</option>
                    <option value="IN_PROCESS">In-Process (IPQC)</option>
                    <option value="FINAL">Final (FQC)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Reference Type</label>
                  <select
                    value={inspectionForm.reference_type}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, reference_type: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    <option value="GRN">GRN</option>
                    <option value="PRODUCTION">Production Order</option>
                    <option value="SALES_ORDER">Sales Order</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">GRN / Reference</label>
                <select
                  value={inspectionForm.reference_id}
                  onChange={(e) => handleGRNChange(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="">Select GRN...</option>
                  {grns.map(grn => (
                    <option key={grn.id} value={grn.id}>
                      {grn.grn_number} - {grn.vendor?.name} ({new Date(grn.grn_date).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Item</label>
                  <select
                    value={inspectionForm.item_id}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, item_id: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                    disabled={!selectedGRN}
                  >
                    <option value="">Select Item...</option>
                    {selectedGRN?.items?.map((item: any) => (
                      <option key={item.item_id} value={item.item_id}>
                        {item.item_code} - {item.item_name}
                      </option>
                    ))}
                  </select>
                  {!selectedGRN && (
                    <p className="text-xs text-gray-500 mt-1">Select a GRN first</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">UID (Optional)</label>
                  <select
                    value={inspectionForm.uid}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, uid: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    disabled={!selectedGRN}
                  >
                    <option value="">Select UID...</option>
                    {uids.map((uid: any) => (
                      <option key={uid.uid} value={uid.uid}>
                        {uid.uid}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity to Inspect</label>
                  <input
                    type="number"
                    value={inspectionForm.quantity_inspected}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, quantity_inspected: parseFloat(e.target.value) })}
                    className="w-full border rounded px-3 py-2"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Inspector</label>
                  <select
                    value={inspectionForm.inspector_id}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, inspector_id: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    <option value="">Select Inspector...</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Inspection Date</label>
                <input
                  type="date"
                  value={inspectionForm.inspection_date}
                  onChange={(e) => setInspectionForm({ ...inspectionForm, inspection_date: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Remarks</label>
                <textarea
                  value={inspectionForm.remarks}
                  onChange={(e) => setInspectionForm({ ...inspectionForm, remarks: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInspectionForm(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
                >
                  Create Inspection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Inspection Modal */}
      {showCompleteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Complete Inspection</h2>
            <form onSubmit={handleCompleteInspection} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Inspection Status</label>
                <select
                  value={completeForm.inspection_status}
                  onChange={(e) => setCompleteForm({ ...completeForm, inspection_status: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="PASSED">Passed</option>
                  <option value="FAILED">Failed</option>
                  <option value="ON_HOLD">On Hold</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity Accepted</label>
                  <input
                    type="number"
                    value={completeForm.quantity_accepted}
                    onChange={(e) => setCompleteForm({ ...completeForm, quantity_accepted: parseFloat(e.target.value) })}
                    className="w-full border rounded px-3 py-2"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity Rejected</label>
                  <input
                    type="number"
                    value={completeForm.quantity_rejected}
                    onChange={(e) => setCompleteForm({ ...completeForm, quantity_rejected: parseFloat(e.target.value) })}
                    className="w-full border rounded px-3 py-2"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity On Hold</label>
                  <input
                    type="number"
                    value={completeForm.quantity_on_hold}
                    onChange={(e) => setCompleteForm({ ...completeForm, quantity_on_hold: parseFloat(e.target.value) })}
                    className="w-full border rounded px-3 py-2"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Inspector Remarks</label>
                <textarea
                  value={completeForm.inspector_remarks}
                  onChange={(e) => setCompleteForm({ ...completeForm, inspector_remarks: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={completeForm.generate_ncr}
                  onChange={(e) => setCompleteForm({ ...completeForm, generate_ncr: e.target.checked })}
                  className="rounded"
                />
                <label className="text-sm font-medium">Generate NCR (Non-Conformance Report)</label>
              </div>

              {completeForm.generate_ncr && (
                <div>
                  <label className="block text-sm font-medium mb-1">NCR Description</label>
                  <textarea
                    value={completeForm.ncr_description}
                    onChange={(e) => setCompleteForm({ ...completeForm, ncr_description: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    rows={3}
                    placeholder="Describe the non-conformance issue..."
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCompleteForm(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Complete Inspection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create NCR Modal */}
      {showNcrForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create Non-Conformance Report (NCR)</h2>
            <form onSubmit={handleCreateNcr} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Related To</label>
                  <select
                    value={ncrForm.related_to}
                    onChange={(e) => setNcrForm({ ...ncrForm, related_to: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    <option value="INSPECTION">Inspection</option>
                    <option value="VENDOR">Vendor</option>
                    <option value="PRODUCTION">Production</option>
                    <option value="CUSTOMER_COMPLAINT">Customer Complaint</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Severity</label>
                  <select
                    value={ncrForm.severity}
                    onChange={(e) => setNcrForm({ ...ncrForm, severity: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Reference ID (UUID)</label>
                <input
                  type="text"
                  value={ncrForm.reference_id}
                  onChange={(e) => setNcrForm({ ...ncrForm, reference_id: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Issue Description</label>
                <textarea
                  value={ncrForm.issue_description}
                  onChange={(e) => setNcrForm({ ...ncrForm, issue_description: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Root Cause Analysis</label>
                <textarea
                  value={ncrForm.root_cause}
                  onChange={(e) => setNcrForm({ ...ncrForm, root_cause: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                  placeholder="5 Whys, Fishbone analysis, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Containment Action (Immediate)</label>
                <textarea
                  value={ncrForm.containment_action}
                  onChange={(e) => setNcrForm({ ...ncrForm, containment_action: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                  placeholder="Immediate actions to contain the issue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Corrective Action (Eliminate Root Cause)</label>
                <textarea
                  value={ncrForm.corrective_action}
                  onChange={(e) => setNcrForm({ ...ncrForm, corrective_action: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                  placeholder="Actions to eliminate root cause"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Preventive Action (Prevent Recurrence)</label>
                <textarea
                  value={ncrForm.preventive_action}
                  onChange={(e) => setNcrForm({ ...ncrForm, preventive_action: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                  placeholder="Actions to prevent recurrence"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNcrForm(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Create NCR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
