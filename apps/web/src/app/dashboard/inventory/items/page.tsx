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
    });
    setShowForm(true);
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
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
                    {item.category.replace(/_/g, ' ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.uom}</td>
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
