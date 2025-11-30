'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../lib/api-client';

interface Inspection {
  id: string;
  inspection_number: string;
  inspection_type: 'INCOMING' | 'IN_PROCESS' | 'FINAL';
  status: 'PENDING' | 'IN_PROGRESS' | 'PASSED' | 'FAILED' | 'ON_HOLD';
  inspection_date: string;
  item_name: string;
  inspected_quantity: number;
  accepted_quantity: number;
  rejected_quantity: number;
  on_hold_quantity: number;
  defect_rate: number;
  inspector_name: string;
  grn_id?: string;
  uid?: string;
  completion_date?: string;
  inspector_remarks?: string;
}

interface NCR {
  id: string;
  ncr_number: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'ACTION_PLANNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  ncr_date: string;
  description: string;
  root_cause: string;
  corrective_action: string;
  containment_action: string;
  preventive_action: string;
  raised_by: string;
  nonconformance_type: string;
  item_name?: string;
  quantity_affected?: number;
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
  
  // Dropdown data
  const [grns, setGrns] = useState<any[]>([]);
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

  // Edit/Delete state
  const [editingInspection, setEditingInspection] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [viewingInspection, setViewingInspection] = useState<any>(null);
  const [viewingNCR, setViewingNCR] = useState<any>(null);
  const [editingNCR, setEditingNCR] = useState<any>(null);

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
      // Fetch all UIDs for inspection (with forInspection flag)
      const uidsData = await apiClient.get('/uid?forInspection=true');
      setUids(uidsData || []);
      
      // Fetch users (for inspectors)
      const usersData = await apiClient.get('/users');
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching form data:', error);
    }
  };

  const handleUIDChange = async (uid: string) => {
    if (!uid) {
      setSelectedGRN(null);
      return;
    }
    
    try {
      // Fetch UID details which contains vendor, item, GRN info
      const uidDetails = await apiClient.get(`/uid/details/${uid}`);
      console.log('UID Details:', uidDetails);
      
      // Fetch GRN details if available
      if (uidDetails.grnId) {
        const grnDetails = await apiClient.get(`/purchase/grn/${uidDetails.grnId}`);
        setSelectedGRN(grnDetails);
        
        // Auto-fill form with UID data
        setInspectionForm({
          ...inspectionForm,
          uid: uid,
          reference_id: uidDetails.grnId,
          item_id: uidDetails.itemId || grnDetails.grn_items?.[0]?.item_id || '',
          quantity_inspected: 1, // UID represents 1 unit
        });
      } else {
        // UID without GRN (from production)
        setInspectionForm({
          ...inspectionForm,
          uid: uid,
          item_id: uidDetails.itemId || '',
          quantity_inspected: 1,
        });
      }
    } catch (error) {
      console.error('Error fetching UID details:', error);
      alert('Failed to fetch UID information. Please check if the UID exists.');
    }
  };

  const fetchData = async () => {
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
    }
  };

  const handleCreateInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate UID is selected
    if (!inspectionForm.uid) {
      alert('UID is required for quality inspection. UID enables complete traceability.');
      return;
    }
    
    try {
      // Fetch UID details to get all vendor/item information
      const uidDetails = await apiClient.get(`/uid/${inspectionForm.uid}`);
      
      // Find selected inspector details
      const selectedInspector = users.find((user: any) => user.id === inspectionForm.inspector_id);
      
      // Find item details from GRN if available
      let itemName = '';
      let itemCode = '';
      let vendorId = null;
      let vendorName = '';
      
      if (selectedGRN) {
        const selectedItem = selectedGRN.grn_items?.find((item: any) => item.item_id === inspectionForm.item_id);
        itemName = selectedItem?.item_name || '';
        itemCode = selectedItem?.item_code || '';
        vendorId = selectedGRN.vendor_id;
        vendorName = selectedGRN.vendor_name || '';
      }
      
      // Prepare data with all required fields from UID
      const inspectionData = {
        inspection_type: inspectionForm.inspection_type,
        inspection_date: inspectionForm.inspection_date,
        grn_id: inspectionForm.reference_id || uidDetails.grnId || null,
        uid: inspectionForm.uid, // UID is now mandatory
        item_id: inspectionForm.item_id || uidDetails.itemId,
        item_name: itemName,
        item_code: itemCode,
        vendor_id: vendorId,
        vendor_name: vendorName,
        batch_number: uidDetails.batchNumber || selectedGRN?.batch_number || '',
        lot_number: uidDetails.lotNumber || selectedGRN?.lot_number || '',
        inspected_quantity: inspectionForm.quantity_inspected || 1,
        inspector_name: selectedInspector?.full_name || selectedInspector?.email || '',
        inspection_checklist: inspectionForm.remarks || '',
      };
      
      console.log('Creating inspection with UID:', inspectionForm.uid);
      console.log('Inspection data:', inspectionData);
      await apiClient.post('/quality/inspections', inspectionData);
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
      setSelectedGRN(null);
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

  const handleEditInspection = (inspection: any) => {
    setEditingInspection(inspection);
    setInspectionForm({
      inspection_type: inspection.inspection_type,
      reference_type: 'GRN', // Assuming GRN for now
      reference_id: inspection.grn_id || '',
      item_id: inspection.item_id || '',
      uid: inspection.uid || '',
      quantity_inspected: inspection.quantity_inspected || 0,
      inspector_id: inspection.inspector_id || '',
      inspection_date: inspection.inspection_date ? new Date(inspection.inspection_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      remarks: inspection.remarks || ''
    });
    setShowInspectionForm(true);
  };

  const handleUpdateInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInspection) return;

    try {
      // Defensive: Ensure item_id is always UUID
      let itemId = inspectionForm.item_id;
      if (selectedGRN?.grn_items) {
        const found = selectedGRN.grn_items.find((item: any) => item.item_id === itemId);
        if (!found) {
          const fallback = selectedGRN.grn_items.find((item: any) => item.item_name === itemId || item.item_code === itemId);
          if (fallback) {
            itemId = fallback.item_id;
          }
        }
      }

      const selectedItem = selectedGRN?.grn_items?.find((item: any) => item.item_id === itemId);
      const selectedInspector = users.find((user: any) => user.id === inspectionForm.inspector_id);

      const updateData = {
        inspection_type: inspectionForm.inspection_type,
        inspection_date: inspectionForm.inspection_date,
        grn_id: inspectionForm.reference_id,
        uid: inspectionForm.uid || null,
        item_id: itemId,
        item_name: selectedItem?.item_name || '',
        item_code: selectedItem?.item_code || '',
        vendor_id: selectedGRN?.vendor_id || null,
        vendor_name: selectedGRN?.vendor_name || '',
        batch_number: selectedGRN?.batch_number || '',
        lot_number: selectedGRN?.lot_number || '',
        inspected_quantity: inspectionForm.quantity_inspected || 0,
        inspector_id: inspectionForm.inspector_id,
        inspector_name: selectedInspector?.full_name || selectedInspector?.email || '',
        inspection_checklist: inspectionForm.remarks || '',
        remarks: inspectionForm.remarks
      };

      await apiClient.put(`/quality/inspections/${editingInspection.id}`, updateData);
      setShowInspectionForm(false);
      setEditingInspection(null);
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
      setSelectedGRN(null);
      fetchData();
      alert('Inspection updated successfully');
    } catch (error) {
      console.error('Error updating inspection:', error);
      alert('Failed to update inspection');
    }
  };

  const handleDeleteInspection = async (inspectionId: string) => {
    try {
      await apiClient.delete(`/quality/inspections/${inspectionId}`);
      setShowDeleteConfirm(null);
      fetchData();
      alert('Inspection deleted successfully');
    } catch (error) {
      console.error('Error deleting inspection:', error);
      alert('Failed to delete inspection');
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{inspection.inspected_quantity}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">{inspection.accepted_quantity || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">{inspection.rejected_quantity || 0}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      {inspection.defect_rate ? `${inspection.defect_rate.toFixed(2)}%` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${getStatusColor(inspection.status)}`}>
                        {inspection.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{inspection.inspector_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setViewingInspection(inspection)}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          View
                        </button>
                        {inspection.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleEditInspection(inspection)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(inspection.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </>
                        )}
                        {(inspection.status === 'PENDING' || inspection.status === 'IN_PROGRESS') && (
                          <button
                            onClick={() => {
                              setCompleteInspectionId(inspection.id);
                              setCompleteForm({
                                ...completeForm,
                                quantity_accepted: inspection.inspected_quantity
                              });
                              setShowCompleteForm(true);
                            }}
                            className="text-amber-600 hover:text-amber-800"
                          >
                            Complete
                          </button>
                        )}
                      </div>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item/Part</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Root Cause</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ncrs.map((ncr) => (
                  <tr key={ncr.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">{ncr.ncr_number}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{new Date(ncr.ncr_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm">
                      {ncr.item_name ? (
                        <div>
                          <div className="font-medium">{ncr.item_name}</div>
                          {ncr.quantity_affected && (
                            <div className="text-xs text-gray-500">Qty: {ncr.quantity_affected}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm max-w-xs truncate">{ncr.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${getStatusColor(ncr.status)}`}>
                        {ncr.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm max-w-xs truncate">{ncr.root_cause || <span className="text-gray-400">Pending investigation</span>}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setViewingNCR(ncr)}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          View
                        </button>
                        {ncr.status !== 'CLOSED' && (
                          <button
                            onClick={() => setEditingNCR(ncr)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Update
                          </button>
                        )}
                      </div>
                    </td>
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
            <h2 className="text-xl font-bold mb-4">
              {editingInspection ? 'Edit Inspection' : 'Create New Inspection'}
            </h2>
            <form onSubmit={editingInspection ? handleUpdateInspection : handleCreateInspection} className="space-y-4">
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
                  <label className="block text-sm font-medium mb-1">Inspection Date</label>
                  <input
                    type="date"
                    value={inspectionForm.inspection_date}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, inspection_date: e.target.value })}
                    className="w-full border rounded px-3 py-2"
                    required
                  />
                </div>
              </div>

              {/* UID Selection - PRIMARY FIELD - MANDATORY FOR TRACEABILITY */}
              <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
                <label className="block text-sm font-semibold mb-2 text-amber-900">
                  🔍 Select UID (Required for Traceability) *
                </label>
                <select
                  value={inspectionForm.uid}
                  onChange={(e) => handleUIDChange(e.target.value)}
                  className="w-full border-2 border-amber-400 rounded px-3 py-2 focus:border-amber-600 focus:ring-2 focus:ring-amber-200"
                  required
                >
                  <option value="">Search and select UID...</option>
                  {uids.map((uid: any) => (
                    <option key={uid.uid} value={uid.uid}>
                      {uid.uid} - {uid.entityType} ({uid.status})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-amber-700 mt-1">
                  ℹ️ UID is mandatory as it enables complete product traceability from receipt through warranty to repairs
                </p>
              </div>

              {/* Auto-populated Vendor Information (read-only) */}
              {selectedGRN && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold mb-2 text-blue-900">📦 Auto-populated from UID</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-blue-700 mb-1">Vendor</label>
                      <input
                        type="text"
                        value={selectedGRN.vendor_name || 'Loading...'}
                        className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-700"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-blue-700 mb-1">Item Code</label>
                      <input
                        type="text"
                        value={selectedGRN.grn_items?.[0]?.item_code || 'Loading...'}
                        className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-700"
                        readOnly
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs text-blue-700 mb-1">Item Name</label>
                      <input
                        type="text"
                        value={selectedGRN.grn_items?.[0]?.item_name || 'Loading...'}
                        className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-700"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-blue-700 mb-1">Batch Number</label>
                      <input
                        type="text"
                        value={selectedGRN.batch_number || '-'}
                        className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-700"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-blue-700 mb-1">GRN Number</label>
                      <input
                        type="text"
                        value={selectedGRN.grn_number || '-'}
                        className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-700"
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              )}

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
                  <p className="text-xs text-gray-500 mt-1">Usually 1 for UID-based inspection</p>
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
                <label className="block text-sm font-medium mb-1">Remarks</label>
                <textarea
                  value={inspectionForm.remarks}
                  onChange={(e) => setInspectionForm({ ...inspectionForm, remarks: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  placeholder="Visual inspection notes, dimensional checks, functional tests..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowInspectionForm(false);
                    setEditingInspection(null);
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
                    setSelectedGRN(null);
                  }}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700"
                  disabled={!inspectionForm.uid}
                >
                  {editingInspection ? 'Update Inspection' : 'Create Inspection'}
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Confirm Delete</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this inspection? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteInspection(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Inspection Details Modal */}
      {viewingInspection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">Inspection Details</h2>
              <button
                onClick={() => setViewingInspection(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm font-medium text-gray-600">Inspection Number</label>
                <p className="text-lg font-semibold text-amber-600">{viewingInspection.inspection_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <p>
                  <span className={`px-3 py-1 text-sm rounded ${getStatusColor(viewingInspection.status)}`}>
                    {viewingInspection.status}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Type</label>
                <p className="font-medium">{viewingInspection.inspection_type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Date</label>
                <p className="font-medium">{new Date(viewingInspection.inspection_date).toLocaleDateString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Item</label>
                <p className="font-medium">{viewingInspection.item_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Inspector</label>
                <p className="font-medium">{viewingInspection.inspector_name}</p>
              </div>
            </div>

            <div className="border-t pt-4 mb-4">
              <h3 className="font-semibold mb-3">Inspection Results</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 p-3 rounded">
                  <div className="text-sm text-gray-600">Inspected</div>
                  <div className="text-xl font-bold text-blue-600">{viewingInspection.inspected_quantity}</div>
                </div>
                <div className="bg-green-50 p-3 rounded">
                  <div className="text-sm text-gray-600">Accepted</div>
                  <div className="text-xl font-bold text-green-600">{viewingInspection.accepted_quantity || 0}</div>
                </div>
                <div className="bg-red-50 p-3 rounded">
                  <div className="text-sm text-gray-600">Rejected</div>
                  <div className="text-xl font-bold text-red-600">{viewingInspection.rejected_quantity || 0}</div>
                </div>
                <div className="bg-yellow-50 p-3 rounded">
                  <div className="text-sm text-gray-600">On Hold</div>
                  <div className="text-xl font-bold text-yellow-600">{viewingInspection.on_hold_quantity || 0}</div>
                </div>
              </div>
            </div>

            {viewingInspection.defect_rate && (
              <div className="border-t pt-4 mb-4">
                <label className="text-sm font-medium text-gray-600">Defect Rate</label>
                <p className="text-2xl font-bold text-red-600">{viewingInspection.defect_rate.toFixed(2)}%</p>
              </div>
            )}

            {viewingInspection.inspector_remarks && (
              <div className="border-t pt-4 mb-4">
                <label className="text-sm font-medium text-gray-600">Inspector Remarks</label>
                <p className="mt-1 text-gray-800">{viewingInspection.inspector_remarks}</p>
              </div>
            )}

            {viewingInspection.uid && (
              <div className="border-t pt-4 mb-4">
                <label className="text-sm font-medium text-gray-600">UID</label>
                <p className="font-mono text-sm bg-gray-100 p-2 rounded">{viewingInspection.uid}</p>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                onClick={() => setViewingInspection(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View NCR Details Modal */}
      {viewingNCR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">NCR Details</h2>
              <button
                onClick={() => setViewingNCR(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm font-medium text-gray-600">NCR Number</label>
                <p className="text-lg font-semibold text-red-600">{viewingNCR.ncr_number}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Status</label>
                <p>
                  <span className={`px-3 py-1 text-sm rounded ${getStatusColor(viewingNCR.status)}`}>
                    {viewingNCR.status}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Type</label>
                <p className="font-medium">{viewingNCR.nonconformance_type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Date Raised</label>
                <p className="font-medium">{new Date(viewingNCR.ncr_date).toLocaleDateString()}</p>
              </div>
              {viewingNCR.item_name && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Item</label>
                  <p className="font-medium">{viewingNCR.item_name}</p>
                </div>
              )}
              {viewingNCR.quantity_affected && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Quantity Affected</label>
                  <p className="font-medium">{viewingNCR.quantity_affected}</p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="border-t pt-4">
                <label className="text-sm font-medium text-gray-600 block mb-2">Issue Description</label>
                <p className="text-gray-800 bg-gray-50 p-3 rounded">{viewingNCR.description}</p>
              </div>

              {/* NCR Workflow Status */}
              <div className="border-t pt-4">
                <label className="text-sm font-medium text-gray-600 block mb-2">NCR Workflow</label>
                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-3 py-1 text-sm rounded ${getStatusColor(viewingNCR.status)}`}>
                      {viewingNCR.status.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm text-gray-600">
                      {viewingNCR.status === 'OPEN' && '→ Issue identified, awaiting review'}
                      {viewingNCR.status === 'UNDER_REVIEW' && '→ Being investigated by quality team'}
                      {viewingNCR.status === 'ACTION_PLANNED' && '→ Corrective actions planned, awaiting execution'}
                      {viewingNCR.status === 'IN_PROGRESS' && '→ Corrective actions being implemented'}
                      {viewingNCR.status === 'RESOLVED' && '→ Actions completed, awaiting verification'}
                      {viewingNCR.status === 'CLOSED' && '→ Verified and closed'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-2">
                    <p className="font-medium mb-1">Next Steps:</p>
                    {viewingNCR.status === 'OPEN' && (
                      <ul className="list-disc list-inside space-y-1">
                        <li>Conduct root cause analysis</li>
                        <li>Update status to "Under Review"</li>
                      </ul>
                    )}
                    {viewingNCR.status === 'UNDER_REVIEW' && (
                      <ul className="list-disc list-inside space-y-1">
                        <li>Complete root cause investigation</li>
                        <li>Plan corrective and preventive actions</li>
                        <li>Update status to "Action Planned"</li>
                      </ul>
                    )}
                    {viewingNCR.status === 'ACTION_PLANNED' && (
                      <ul className="list-disc list-inside space-y-1">
                        <li>Begin implementing corrective actions</li>
                        <li>Update status to "In Progress"</li>
                      </ul>
                    )}
                    {viewingNCR.status === 'IN_PROGRESS' && (
                      <ul className="list-disc list-inside space-y-1">
                        <li>Complete all corrective actions</li>
                        <li>Verify effectiveness</li>
                        <li>Update status to "Resolved"</li>
                      </ul>
                    )}
                    {viewingNCR.status === 'RESOLVED' && (
                      <ul className="list-disc list-inside space-y-1">
                        <li>Final verification by quality manager</li>
                        <li>Close NCR if satisfactory</li>
                      </ul>
                    )}
                    {viewingNCR.status === 'CLOSED' && (
                      <p className="text-green-700">✓ NCR completed and verified</p>
                    )}
                  </div>
                </div>
              </div>

              {viewingNCR.root_cause && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-gray-600 block mb-2">Root Cause Analysis</label>
                  <p className="text-gray-800 bg-gray-50 p-3 rounded">{viewingNCR.root_cause}</p>
                </div>
              )}

              {viewingNCR.containment_action && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-gray-600 block mb-2">Containment Action (Immediate)</label>
                  <p className="text-gray-800 bg-gray-50 p-3 rounded">{viewingNCR.containment_action}</p>
                </div>
              )}

              {viewingNCR.corrective_action && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-gray-600 block mb-2">Corrective Action (Eliminate Root Cause)</label>
                  <p className="text-gray-800 bg-gray-50 p-3 rounded">{viewingNCR.corrective_action}</p>
                </div>
              )}

              {viewingNCR.preventive_action && (
                <div className="border-t pt-4">
                  <label className="text-sm font-medium text-gray-600 block mb-2">Preventive Action (Prevent Recurrence)</label>
                  <p className="text-gray-800 bg-gray-50 p-3 rounded">{viewingNCR.preventive_action}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t mt-6">
              {viewingNCR.status !== 'CLOSED' && (
                <button
                  onClick={() => {
                    setEditingNCR(viewingNCR);
                    setViewingNCR(null);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Update NCR
                </button>
              )}
              <button
                onClick={() => setViewingNCR(null)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit NCR Modal */}
      {editingNCR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Update NCR - {editingNCR.ncr_number}</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await apiClient.put(`/quality/ncr/${editingNCR.id}`, {
                    status: editingNCR.status,
                    root_cause: editingNCR.root_cause,
                    containment_action: editingNCR.containment_action,
                    corrective_action: editingNCR.corrective_action,
                    preventive_action: editingNCR.preventive_action,
                  });
                  setEditingNCR(null);
                  fetchData();
                  alert('NCR updated successfully');
                } catch (error) {
                  console.error('Error updating NCR:', error);
                  alert('Failed to update NCR');
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={editingNCR.status}
                  onChange={(e) => setEditingNCR({ ...editingNCR, status: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  required
                >
                  <option value="OPEN">Open</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="ACTION_PLANNED">Action Planned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Root Cause Analysis</label>
                <textarea
                  value={editingNCR.root_cause || ''}
                  onChange={(e) => setEditingNCR({ ...editingNCR, root_cause: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Containment Action</label>
                <textarea
                  value={editingNCR.containment_action || ''}
                  onChange={(e) => setEditingNCR({ ...editingNCR, containment_action: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Corrective Action</label>
                <textarea
                  value={editingNCR.corrective_action || ''}
                  onChange={(e) => setEditingNCR({ ...editingNCR, corrective_action: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Preventive Action</label>
                <textarea
                  value={editingNCR.preventive_action || ''}
                  onChange={(e) => setEditingNCR({ ...editingNCR, preventive_action: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingNCR(null)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Update NCR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
