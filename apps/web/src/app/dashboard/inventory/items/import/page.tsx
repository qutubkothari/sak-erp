'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import * as XLSX from 'xlsx';
import { apiClient } from '../../../../../../lib/api-client';

export default function ImportItemsPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setResults(null);
    parseFile(selectedFile);
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        setPreview(jsonData.slice(0, 10)); // Show first 10 rows
      } catch (err) {
        alert('Failed to parse file. Please check the format.');
        console.error('Parse error:', err);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleUpload = async () => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setUploading(true);
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        const uploadResults = await apiClient.post('/items/bulk', { items: jsonData });
        setResults(uploadResults);
        
        alert(`Import completed!\nSuccess: ${uploadResults.success}\nFailed: ${uploadResults.failed}`);
      } catch (err: any) {
        alert('Failed to upload items: ' + (err.message || 'Unknown error'));
        console.error('Upload error:', err);
      } finally {
        setUploading(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const downloadTemplate = () => {
    const template = [{
      code: 'ITEM001',
      name: 'Sample Item',
      description: 'Item description',
      category: 'RAW_MATERIAL',
      uom: 'PCS',
      standard_cost: 100,
      selling_price: 150,
      reorder_level: 10,
      reorder_quantity: 50,
      lead_time_days: 7
    }];

    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Items Template');
    XLSX.writeFile(workbook, 'items_import_template.xlsx');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-8">
      <div className="max-w-6xl mx-auto">
        <button
          onClick={() => router.push('/dashboard/inventory/items')}
          className="text-amber-600 hover:text-amber-800 mb-4 flex items-center gap-2"
        >
          ← Back to Items
        </button>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-amber-900 mb-2">📊 Import Items from Excel</h1>
          <p className="text-gray-600 mb-8">Upload an Excel file with multiple items at once</p>

          {/* Download Template */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-3">
              <span className="text-3xl">💡</span>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">Download Template First</h3>
                <p className="text-sm text-blue-700 mb-4">
                  Get the Excel template with the correct column format to ensure successful import
                </p>
                <button
                  onClick={downloadTemplate}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
                >
                  📥 Download Template
                </button>
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Excel File (.xlsx, .xls, .csv)
            </label>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 
                file:mr-4 file:py-3 file:px-6
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-amber-50 file:text-amber-700
                hover:file:bg-amber-100
                cursor-pointer"
            />
          </div>

          {/* Expected Format */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-gray-900 mb-3">Expected Columns:</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              {['code', 'name', 'description', 'category', 'uom', 'standard_cost', 'selling_price', 'reorder_level', 'reorder_quantity', 'lead_time_days'].map((col) => (
                <div key={col} className="flex items-center gap-2">
                  <span className="text-green-600">✓</span>
                  <code className="text-gray-700 bg-gray-100 px-2 py-1 rounded">{col}</code>
                </div>
              ))}
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <strong>Category values:</strong> RAW_MATERIAL, COMPONENT, SUBASSEMBLY, FINISHED_GOODS, CONSUMABLE, PACKING_MATERIAL, SPARE_PART
            </div>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <div className="mb-8">
              <h3 className="font-semibold text-gray-900 mb-4 text-lg">
                Preview (First {preview.length} rows)
              </h3>
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {Object.keys(preview[0]).map((key) => (
                        <th
                          key={key}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preview.map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        {Object.values(row).map((val: any, cellIdx) => (
                          <td key={cellIdx} className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Upload Button */}
          {file && preview.length > 0 && !results && (
            <div className="flex justify-end">
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-lg font-semibold disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : `Upload & Import ${preview.length}+ Items`}
              </button>
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="mt-8">
              <div className={`rounded-lg p-6 ${results.failed === 0 ? 'bg-green-50 border-2 border-green-500' : 'bg-yellow-50 border-2 border-yellow-500'}`}>
                <h3 className="text-xl font-bold mb-4">Import Results:</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-4 bg-white rounded-lg">
                    <div className="text-3xl font-bold text-green-600">{results.success}</div>
                    <div className="text-sm text-gray-600">Successfully Imported</div>
                  </div>
                  <div className="text-center p-4 bg-white rounded-lg">
                    <div className="text-3xl font-bold text-red-600">{results.failed}</div>
                    <div className="text-sm text-gray-600">Failed</div>
                  </div>
                </div>

                {results.errors && results.errors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold text-red-900 mb-2">Errors:</h4>
                    <div className="bg-white rounded-lg p-4 max-h-60 overflow-y-auto">
                      {results.errors.map((err: any, idx: number) => (
                        <div key={idx} className="text-sm text-red-700 mb-2 pb-2 border-b last:border-0">
                          <strong>Row {err.row}:</strong> {err.item} - {err.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-6 flex gap-4">
                  <button
                    onClick={() => router.push('/dashboard/inventory/items')}
                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-semibold"
                  >
                    Go to Items List
                  </button>
                  <button
                    onClick={() => {
                      setFile(null);
                      setPreview([]);
                      setResults(null);
                    }}
                    className="flex-1 border-2 border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-lg font-semibold"
                  >
                    Import More Items
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
