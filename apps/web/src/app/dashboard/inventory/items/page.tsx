'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../../../lib/api-client';
import DrawingManager from '../../../../components/DrawingManager';

interface Item {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  uom: string;
  standard_cost?: number;
  selling_price?: number;
  reorder_level?: number;
  reorder_quantity?: number;
  lead_time_days?: number;
  is_active: boolean;
  created_at: string;
  total_stock?: number;
  uid_tracking?: boolean;
  uid_strategy?: string;
  batch_uom?: string;
  batch_quantity?: number;
  drawing_required?: string;
}

interface Vendor {
  id: string;
  code: string;
  name: string;
}

interface ItemVendor {
  vendor_id: string;
  priority: number;
  unit_price?: number;
  lead_time_days?: number;
  vendor_item_code?: string;
}

export default function ItemsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [showDrawingManager, setShowDrawingManager] = useState(false);
  const [selectedItemForDrawing, setSelectedItemForDrawing] = useState<Item | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [itemVendors, setItemVendors] = useState<ItemVendor[]>([]);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [vendorForm, setVendorForm] = useState({
    vendor_id: '',
    priority: 1,
    unit_price: '',
    lead_time_days: '',
    vendor_item_code: '',
  });

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    category: 'RAW_MATERIAL',
    uom: 'PCS',
    standard_cost: '',
    selling_price: '',
    reorder_level: '',
    reorder_quantity: '',
    lead_time_days: '',
    is_active: true,
    uid_tracking: true,
    uid_strategy: 'SERIALIZED',
    batch_uom: '',
    batch_quantity: '',
    drawing_required: 'OPTIONAL',
  });

  const addCategory = async () => {
    if (newCategory.trim()) {
      try {
        await apiClient.post('/categories', { name: newCategory });
        setNewCategory('');
        await fetchCategories();
        alert('Category added successfully!');
      } catch (error) {
        console.error('Error adding category:', error);
        alert('Failed to add category');
      }
    }
  };

  const updateCategory = async () => {
    if (editingCategory && editingCategory.name.trim()) {
      try {
        await apiClient.put(`/categories/${editingCategory.id}`, { name: editingCategory.name });
        setEditingCategory(null);
        await fetchCategories();
        alert('Category updated successfully!');
      } catch (error) {
        console.error('Error updating category:', error);
        alert('Failed to update category');
      }
    }
  };

  const deleteCategory = async (id: string, name: string) => {
    if (confirm(`Delete category "${name}"? This won't affect existing items.`)) {
      try {
        await apiClient.delete(`/categories/${id}`);
        await fetchCategories();
        alert('Category deleted successfully!');
      } catch (error) {
        console.error('Error deleting category:', error);
        alert('Failed to delete category');
      }
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await apiClient.get('/categories');
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchVendors = async () => {
    try {
      const data = await apiClient.get('/vendors');
      setVendors(data);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    }
  };

  const seedCategories = async () => {
    try {
      await apiClient.post('/categories/seed', {});
      await fetchCategories();
      alert('Default categories restored!');
    } catch (error) {
      console.error('Error seeding categories:', error);
      alert('Failed to restore categories');
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchVendors();
  }, []);

  const uomOptions = [
    'PCS', 'KG', 'GRAM', 'LITER', 'METER', 'CM', 'MM',
    'BOX', 'SET', 'PACK', 'ROLL', 'SHEET', 'FEET', 'INCH'
  ];

  useEffect(() => {
    fetchItems();
  }, [showDeleted]);

  const fetchItems = async () => {
    try {
      const url = showDeleted 
        ? '/inventory/items?includeInactive=true' 
        : '/inventory/items';
      console.log('Fetching items with URL:', url, 'showDeleted:', showDeleted);
      const data = await apiClient.get(url);
      console.log('Received items:', data.length, 'items');
      console.log('Active items:', data.filter((i: Item) => i.is_active).length);
      console.log('Inactive items:', data.filter((i: Item) => !i.is_active).length);
      setItems(data);
    } catch (error) {
      console.error('Error fetching items:', error);
      alert('Failed to fetch items');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        standard_cost: formData.standard_cost ? parseFloat(formData.standard_cost) : null,
        selling_price: formData.selling_price ? parseFloat(formData.selling_price) : null,
        reorder_level: formData.reorder_level ? parseInt(formData.reorder_level) : null,
        reorder_quantity: formData.reorder_quantity ? parseInt(formData.reorder_quantity) : null,
        lead_time_days: formData.lead_time_days ? parseInt(formData.lead_time_days) : null,
        batch_quantity: formData.batch_quantity ? parseFloat(formData.batch_quantity) : null,
      };

      if (editingItem) {
        await apiClient.put(`/inventory/items/${editingItem.id}`, payload);
        alert('Item updated successfully!');
      } else {
        await apiClient.post('/inventory/items', payload);
        alert('Item created successfully!');
      }

      setShowForm(false);
      setEditingItem(null);
      resetForm();
      fetchItems();
    } catch (error: any) {
      console.error('Error saving item:', error);
      alert(error.response?.data?.message || 'Failed to save item');
    }
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      description: item.description || '',
      category: item.category,
      uom: item.uom,
      standard_cost: item.standard_cost?.toString() || '',
      selling_price: item.selling_price?.toString() || '',
      reorder_level: item.reorder_level?.toString() || '',
      reorder_quantity: item.reorder_quantity?.toString() || '',
      lead_time_days: item.lead_time_days?.toString() || '',
      is_active: item.is_active,
      uid_tracking: item.uid_tracking !== false,
      uid_strategy: item.uid_strategy || 'SERIALIZED',
      batch_uom: item.batch_uom || '',
      batch_quantity: item.batch_quantity?.toString() || '',
      drawing_required: item.drawing_required || 'OPTIONAL',
    });
    setShowForm(true);
    fetchItemVendors(item.id);
  };

  const fetchItemVendors = async (itemId: string) => {
    try {
      const data = await apiClient.get(`/items/${itemId}/vendors`);
      setItemVendors(data || []);
    } catch (error) {
      console.error('Error fetching item vendors:', error);
      setItemVendors([]);
    }
  };

  const addItemVendor = async () => {
    if (!editingItem || !vendorForm.vendor_id) {
      alert('Please select a vendor');
      return;
    }

    try {
      await apiClient.post(`/items/${editingItem.id}/vendors`, {
        vendor_id: vendorForm.vendor_id,
        priority: vendorForm.priority,
        unit_price: vendorForm.unit_price ? parseFloat(vendorForm.unit_price) : null,
        lead_time_days: vendorForm.lead_time_days ? parseInt(vendorForm.lead_time_days) : null,
        vendor_item_code: vendorForm.vendor_item_code || null,
      });
      
      alert('Vendor added successfully!');
      setShowVendorForm(false);
      setVendorForm({
        vendor_id: '',
        priority: 1,
        unit_price: '',
        lead_time_days: '',
        vendor_item_code: '',
      });
      fetchItemVendors(editingItem.id);
    } catch (error: any) {
      console.error('Error adding vendor:', error);
      alert(error.message || 'Failed to add vendor');
    }
  };

  const removeItemVendor = async (vendorId: string) => {
    if (!editingItem || !confirm('Remove this vendor?')) return;

    try {
      await apiClient.delete(`/items/${editingItem.id}/vendors/${vendorId}`);
      alert('Vendor removed successfully!');
      fetchItemVendors(editingItem.id);
    } catch (error) {
      console.error('Error removing vendor:', error);
      alert('Failed to remove vendor');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      await apiClient.delete(`/inventory/items/${id}`);
      alert('Item deleted successfully!');
      fetchItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete item');
    }
  };

  const handleRestore = async (id: string) => {
    if (!confirm('Are you sure you want to restore this item?')) return;
    
    try {
      await apiClient.put(`/inventory/items/${id}`, { is_active: true });
      alert('Item restored successfully!');
      fetchItems();
    } catch (error) {
      console.error('Error restoring item:', error);
      alert('Failed to restore item');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      description: '',
      category: 'RAW_MATERIAL',
      uom: 'PCS',
      standard_cost: '',
      selling_price: '',
      reorder_level: '',
      reorder_quantity: '',
      lead_time_days: '',
      is_active: true,
      uid_tracking: true,
      uid_strategy: 'SERIALIZED',
      batch_uom: '',
      batch_quantity: '',
      drawing_required: 'OPTIONAL',
    });
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || item.category === categoryFilter;
    // When showDeleted is true, show only inactive items. When false, show only active items.
    const matchesActiveStatus = showDeleted ? !item.is_active : item.is_active;
    return matchesSearch && matchesCategory && matchesActiveStatus;
  });

  console.log('Total items:', items.length);
  console.log('Filtered items:', filteredItems.length);
  console.log('showDeleted:', showDeleted);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Items Master</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCategoryManager(true)}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 font-medium flex items-center gap-2"
          >
            🏷️ Manage Categories
          </button>
          <button
            onClick={() => router.push('/dashboard/inventory/items/import')}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
          >
            📊 Import Excel
          </button>
          <button
            onClick={() => {
              setEditingItem(null);
              resetForm();
              setShowForm(true);
            }}
            className="bg-amber-600 text-white px-6 py-2 rounded-lg hover:bg-amber-700 font-medium"
          >
            + Add Item
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow flex gap-4">
        <button
          onClick={() => setShowDeleted(!showDeleted)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            showDeleted 
              ? 'bg-red-600 text-white hover:bg-red-700' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {showDeleted ? '🗑️ Showing Deleted' : '📋 Show Deleted'}
        </button>
        <input
          type="text"
          placeholder="Search by code or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat.id} value={cat.name}>{cat.name.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UOM</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                  <p className="text-lg">No items found</p>
                  <p className="text-sm mt-2">Create your first item to get started</p>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.category ? item.category.replace(/_/g, ' ') : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.uom}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold">
                    <span className={item.total_stock && item.total_stock > 0 ? 'text-green-700' : 'text-gray-400'}>
                      {item.total_stock ?? 0} {item.uom}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.standard_cost ? `₹${item.standard_cost.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.selling_price ? `₹${item.selling_price.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {item.is_active ? (
                      <>
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-amber-600 hover:text-amber-900 mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setSelectedItemForDrawing(item);
                            setShowDrawingManager(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Drawings
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleRestore(item.id)}
                        className="text-green-600 hover:text-green-900 font-medium"
                      >
                        ↻ Restore
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-6">
                {editingItem ? 'Edit Item' : 'Create New Item'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="e.g., RM001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="e.g., Steel Sheet"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    placeholder="Optional description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category *
                    </label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit of Measure *
                    </label>
                    <select
                      required
                      value={formData.uom}
                      onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      {uomOptions.map(uom => (
                        <option key={uom} value={uom}>{uom}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Standard Cost (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.standard_cost}
                      onChange={(e) => setFormData({ ...formData, standard_cost: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Selling Price (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.selling_price}
                      onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reorder Level
                    </label>
                    <input
                      type="number"
                      value={formData.reorder_level}
                      onChange={(e) => setFormData({ ...formData, reorder_level: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reorder Qty
                    </label>
                    <input
                      type="number"
                      value={formData.reorder_quantity}
                      onChange={(e) => setFormData({ ...formData, reorder_quantity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lead Time (days)
                    </label>
                    <input
                      type="number"
                      value={formData.lead_time_days}
                      onChange={(e) => setFormData({ ...formData, lead_time_days: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-700">
                    Active
                  </label>
                </div>

                {/* UID Tracking Strategy Section */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">UID Tracking</h3>
                  
                  <div className="flex items-start space-x-2 mb-4">
                    <input
                      type="checkbox"
                      id="uid_tracking"
                      checked={formData.uid_tracking}
                      onChange={(e) => setFormData({ ...formData, uid_tracking: e.target.checked })}
                      className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded mt-1"
                    />
                    <div>
                      <label htmlFor="uid_tracking" className="block text-sm font-medium text-gray-700">
                        Track with UIDs
                      </label>
                      <p className="text-xs text-gray-500">Enable unique identifier tracking for this item</p>
                    </div>
                  </div>

                  {formData.uid_tracking && (
                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">How to track?</label>
                        <div className="space-y-2">
                          <div className="flex items-start">
                            <input
                              type="radio"
                              id="uid_serialized"
                              name="uid_strategy"
                              value="SERIALIZED"
                              checked={formData.uid_strategy === 'SERIALIZED'}
                              onChange={(e) => setFormData({ ...formData, uid_strategy: e.target.value, batch_uom: '', batch_quantity: '' })}
                              className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 mt-1"
                            />
                            <div className="ml-2">
                              <label htmlFor="uid_serialized" className="text-sm font-medium text-gray-700">
                                Track Each Piece Individually
                              </label>
                              <p className="text-xs text-gray-500">For: Parts, Components, Assemblies, Finished Goods</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start">
                            <input
                              type="radio"
                              id="uid_batched"
                              name="uid_strategy"
                              value="BATCHED"
                              checked={formData.uid_strategy === 'BATCHED'}
                              onChange={(e) => setFormData({ ...formData, uid_strategy: e.target.value })}
                              className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 mt-1"
                            />
                            <div className="ml-2">
                              <label htmlFor="uid_batched" className="text-sm font-medium text-gray-700">
                                Track by Container/Box
                              </label>
                              <p className="text-xs text-gray-500">For: Screws, Washers, Nuts, Bolts, Consumables</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {formData.uid_strategy === 'BATCHED' && (
                        <div className="border-t pt-4 space-y-3">
                          <p className="text-sm font-medium text-gray-700">Container Details:</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Container Type *</label>
                              <select
                                required
                                value={formData.batch_uom}
                                onChange={(e) => setFormData({ ...formData, batch_uom: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                              >
                                <option value="">Select Type</option>
                                <option value="Box">Box</option>
                                <option value="Carton">Carton</option>
                                <option value="Pallet">Pallet</option>
                                <option value="Bag">Bag</option>
                                <option value="Roll">Roll</option>
                                <option value="Drum">Drum</option>
                                <option value="Bottle">Bottle</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Pieces per Container *</label>
                              <input
                                type="number"
                                required
                                step="1"
                                min="1"
                                value={formData.batch_quantity}
                                onChange={(e) => setFormData({ ...formData, batch_quantity: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                                placeholder="e.g. 1000"
                              />
                            </div>
                          </div>
                          <div className="bg-blue-50 p-2 rounded text-xs text-blue-800">
                            💡 Example: If you receive 5000 screws in boxes of 1000, system will generate 5 UIDs (one per box)
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Drawing Required Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Drawing Required
                    </label>
                    <select
                      value={formData.drawing_required}
                      onChange={(e) => setFormData({ ...formData, drawing_required: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="OPTIONAL">Optional</option>
                      <option value="COMPULSORY">Compulsory</option>
                      <option value="NOT_REQUIRED">Not Required</option>
                    </select>
                  </div>
                </div>

                {/* Vendor Management Section */}
                {editingItem && (
                  <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">Vendors</h3>
                      <button
                        type="button"
                        onClick={() => setShowVendorForm(!showVendorForm)}
                        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                      >
                        {showVendorForm ? 'Cancel' : 'Add Vendor'}
                      </button>
                    </div>

                    {showVendorForm && (
                      <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor *</label>
                            <select
                              value={vendorForm.vendor_id}
                              onChange={(e) => setVendorForm({ ...vendorForm, vendor_id: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              required
                            >
                              <option value="">Select Vendor</option>
                              {vendors.map(v => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Priority *</label>
                            <input
                              type="number"
                              min="1"
                              max="10"
                              value={vendorForm.priority}
                              onChange={(e) => setVendorForm({ ...vendorForm, priority: parseInt(e.target.value) })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              placeholder="1 = Preferred"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹)</label>
                            <input
                              type="number"
                              step="0.01"
                              value={vendorForm.unit_price}
                              onChange={(e) => setVendorForm({ ...vendorForm, unit_price: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Lead Time (days)</label>
                            <input
                              type="number"
                              value={vendorForm.lead_time_days}
                              onChange={(e) => setVendorForm({ ...vendorForm, lead_time_days: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Item Code</label>
                            <input
                              type="text"
                              value={vendorForm.vendor_item_code}
                              onChange={(e) => setVendorForm({ ...vendorForm, vendor_item_code: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={addItemVendor}
                          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                        >
                          Add Vendor
                        </button>
                      </div>
                    )}

                    {itemVendors.length > 0 ? (
                      <div className="space-y-2">
                        {itemVendors.map((iv: any) => {
                          const vendor = vendors.find(v => v.id === iv.vendor_id);
                          return (
                            <div key={iv.vendor_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">{vendor?.name || iv.vendor_name}</span>
                                  {iv.is_preferred && (
                                    <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">
                                      Preferred
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-500">Priority: {iv.priority}</span>
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {iv.unit_price && <span>₹{iv.unit_price}</span>}
                                  {iv.unit_price && iv.lead_time_days && <span className="mx-2">•</span>}
                                  {iv.lead_time_days && <span>{iv.lead_time_days} days lead time</span>}
                                  {iv.vendor_item_code && (
                                    <>
                                      <span className="mx-2">•</span>
                                      <span>Code: {iv.vendor_item_code}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeItemVendor(iv.vendor_id)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium ml-4"
                              >
                                Remove
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">No vendors assigned yet</p>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditingItem(null);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
                  >
                    {editingItem ? 'Update' : 'Create'} Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Drawing Manager Modal */}
      {showDrawingManager && selectedItemForDrawing && (
        <DrawingManager
          itemId={selectedItemForDrawing.id}
          itemCode={selectedItemForDrawing.code}
          itemName={selectedItemForDrawing.name}
          onClose={() => {
            setShowDrawingManager(false);
            setSelectedItemForDrawing(null);
          }}
          mandatory={false}
        />
      )}

      {/* Category Manager Modal */}
      {showCategoryManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Manage Categories</h2>
              <button
                onClick={() => setShowCategoryManager(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Add New Category */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700">Add New Category</h3>
                <button
                  onClick={seedCategories}
                  className="px-4 py-1 bg-amber-600 text-white text-sm rounded hover:bg-amber-700"
                >
                  🔄 Restore Defaults
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Enter category name (e.g., TOOLS)"
                  className="flex-1 px-4 py-2 border rounded-lg"
                  onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                />
                <button
                  onClick={addCategory}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Add
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Categories will be automatically formatted (spaces become underscores, uppercase)
              </p>
            </div>

            {/* Categories List */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">Current Categories</h3>
              <div className="space-y-2">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-gray-50"
                  >
                    {editingCategory?.id === category.id ? (
                      <input
                        type="text"
                        value={editingCategory?.name || ''}
                        onChange={(e) =>
                          setEditingCategory({ id: category.id, name: e.target.value })
                        }
                        className="flex-1 px-3 py-1 border rounded mr-2"
                        onKeyPress={(e) => e.key === 'Enter' && updateCategory()}
                      />
                    ) : (
                      <span className="font-medium text-gray-800">
                        {category.name.replace(/_/g, ' ')}
                      </span>
                    )}
                    <div className="flex gap-2">
                      {editingCategory?.id === category.id ? (
                        <>
                          <button
                            onClick={updateCategory}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingCategory(null)}
                            className="px-3 py-1 bg-gray-400 text-white rounded hover:bg-gray-500 text-sm"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingCategory({ id: category.id, name: category.name })}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteCategory(category.id, category.name)}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t">
              <button
                onClick={() => setShowCategoryManager(false)}
                className="w-full px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
