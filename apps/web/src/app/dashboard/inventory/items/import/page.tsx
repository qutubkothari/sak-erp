'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ImportItemsPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setMessage('');
    }
  };

  const handleImport = async () => {
    if (!file) {
      setMessage('Please select a file');
      return;
    }

    setImporting(true);
    setMessage('Import functionality coming soon...');
    
    // TODO: Implement actual import logic
    setTimeout(() => {
      setImporting(false);
      setMessage('Import feature will be implemented soon');
    }, 1000);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => router.push('/dashboard/inventory/items')}
          className="text-amber-600 hover:text-amber-800 text-sm mb-2"
        >
          ← Back to Items
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Import Items</h1>
        <p className="text-gray-600">Bulk import items from CSV or Excel file</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload File</h2>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer inline-flex flex-col items-center"
            >
              <svg
                className="w-12 h-12 text-gray-400 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span className="text-sm font-medium text-gray-900">
                {file ? file.name : 'Choose a file or drag and drop'}
              </span>
              <span className="text-xs text-gray-500 mt-1">
                CSV, XLSX, or XLS up to 10MB
              </span>
            </label>
          </div>
        </div>

        {message && (
          <div className={`mb-4 p-4 rounded ${message.includes('error') ? 'bg-red-50 text-red-800' : 'bg-blue-50 text-blue-800'}`}>
            {message}
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={handleImport}
            disabled={!file || importing}
            className="px-6 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {importing ? 'Importing...' : 'Import Items'}
          </button>
          <button
            onClick={() => router.push('/dashboard/inventory/items')}
            className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>

        <div className="mt-8 border-t pt-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">File Format Requirements</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• First row should contain column headers</li>
            <li>• Required columns: item_code, item_name, category, uom</li>
            <li>• Optional columns: description, purchase_price, sales_price, reorder_point</li>
            <li>• Category values: RAW_MATERIAL, FINISHED_GOODS, WIP, SERVICE_SPARES, CONSUMABLES</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
