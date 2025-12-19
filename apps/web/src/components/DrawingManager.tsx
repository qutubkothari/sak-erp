'use client';

import { useState, useEffect } from 'react';

interface Drawing {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  version: number;
  revision_notes: string;
  is_active: boolean;
  uploaded_by: string;
  created_at: string;
}

interface DrawingManagerProps {
  itemId: string;
  itemCode: string;
  itemName: string;
  onClose: () => void;
  mandatory?: boolean;
}

export default function DrawingManager({ itemId, itemCode, itemName, onClose, mandatory = false }: DrawingManagerProps) {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [updatingActiveId, setUpdatingActiveId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchDrawings();
  }, [itemId]);

  const fetchDrawings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`http://13.205.17.214:4000/api/v1/inventory/items/${itemId}/drawings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setDrawings(data);
      }
    } catch (error) {
      console.error('Error fetching drawings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        alert('Please upload PNG, JPG, or PDF files only');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file');
      return;
    }

    if (!revisionNotes.trim() && drawings.length > 0) {
      alert('Please add revision notes for new versions');
      return;
    }

    setUploading(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        const token = localStorage.getItem('accessToken');
        const response = await fetch(`http://13.205.17.214:4000/api/v1/inventory/items/${itemId}/drawings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fileName: selectedFile.name,
            fileUrl: base64,
            fileType: selectedFile.type,
            fileSize: selectedFile.size,
            revisionNotes: revisionNotes.trim() || 'Initial version',
          }),
        });

        if (response.ok) {
          alert('Drawing uploaded successfully!');
          setSelectedFile(null);
          setRevisionNotes('');
          setPreviewUrl(null);
          fetchDrawings();
        } else {
          const error = await response.json();
          alert(`Failed to upload: ${error.message || 'Unknown error'}`);
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error('Error uploading drawing:', error);
      alert('Failed to upload drawing');
    } finally {
      setUploading(false);
    }
  };

  const handleSetActive = async (drawing: Drawing) => {
    if (drawing.is_active) return;

    try {
      setUpdatingActiveId(drawing.id);
      const token = localStorage.getItem('accessToken');

      const response = await fetch(`http://13.205.17.214:4000/api/v1/inventory/items/${itemId}/drawings/${drawing.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          revisionNotes: drawing.revision_notes,
          isActive: true,
        }),
      });

      if (response.ok) {
        await fetchDrawings();
      } else {
        const error = await response.json().catch(() => ({}));
        alert(`Failed to set active drawing: ${error.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error setting active drawing:', error);
      alert('Failed to set active drawing');
    } finally {
      setUpdatingActiveId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canClose = !mandatory || drawings.length > 0;

  const activeDrawing = drawings.find(d => d.is_active) || null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Drawing Management</h2>
              <p className="text-gray-600 mt-1">
                {itemCode} - {itemName}
              </p>
              {mandatory && drawings.length === 0 && (
                <div className="mt-2 bg-red-50 border border-red-200 rounded px-3 py-2 text-sm text-red-800">
                  ⚠️ Drawing upload is mandatory for this item before proceeding
                </div>
              )}
            </div>
            {canClose && (
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Upload Section */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h3 className="font-semibold text-amber-900 mb-3">
              {drawings.length > 0 ? `Upload New Version (v${drawings[0].version + 1})` : 'Upload First Drawing (v1)'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File (PNG, JPG, PDF - Max 10MB) *
                </label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,application/pdf"
                  onChange={handleFileSelect}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>

              {previewUrl && (
                <div className="border border-gray-300 rounded-lg p-2">
                  <img src={previewUrl} alt="Preview" className="max-h-48 mx-auto" />
                </div>
              )}

              {selectedFile && (
                <div className="text-sm text-gray-600">
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </div>
              )}

              {drawings.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Revision Notes *
                  </label>
                  <textarea
                    value={revisionNotes}
                    onChange={(e) => setRevisionNotes(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    placeholder="What changed in this version..."
                  />
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
                className="w-full bg-amber-600 text-white px-6 py-3 rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {uploading ? 'Uploading...' : 'Upload Drawing'}
              </button>
            </div>
          </div>

          {/* Existing Drawings */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              Drawing History ({drawings.length} versions)
            </h3>

            {activeDrawing && (
              <div className="mb-3 text-sm bg-green-50 border border-green-200 rounded px-3 py-2 text-green-900">
                Active drawing: <span className="font-semibold">v{activeDrawing.version}</span> ({activeDrawing.file_name})
              </div>
            )}

            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading drawings...</div>
            ) : drawings.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-4xl mb-2">📄</div>
                <p className="text-gray-600">No drawings uploaded yet</p>
                <p className="text-sm text-gray-500 mt-1">Upload the first version above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {drawings.map((drawing) => (
                  <div
                    key={drawing.id}
                    className="border border-gray-300 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-semibold">
                            v{drawing.version}
                          </span>
                          <span className="font-medium text-gray-900">{drawing.file_name}</span>
                          {drawing.version === drawings[0].version && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                              LATEST
                            </span>
                          )}
                          {drawing.is_active && (
                            <span className="bg-amber-100 text-amber-900 px-2 py-1 rounded text-xs font-semibold">
                              ACTIVE
                            </span>
                          )}
                        </div>

                        <div className="mt-2 text-sm text-gray-600 grid grid-cols-2 gap-x-4">
                          <div>Type: {drawing.file_type}</div>
                          <div>Size: {formatFileSize(drawing.file_size)}</div>
                          <div className="col-span-2 mt-1">Uploaded: {formatDate(drawing.created_at)}</div>
                        </div>

                        {drawing.revision_notes && (
                          <div className="mt-2 text-sm bg-gray-50 rounded px-3 py-2">
                            <span className="font-medium">Notes:</span> {drawing.revision_notes}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <a
                          href={drawing.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blue-100 text-blue-700 px-4 py-2 rounded hover:bg-blue-200 text-sm font-medium"
                        >
                          View
                        </a>
                        <a
                          href={drawing.file_url}
                          download={drawing.file_name}
                          className="bg-green-100 text-green-700 px-4 py-2 rounded hover:bg-green-200 text-sm font-medium"
                        >
                          Download
                        </a>
                        {!drawing.is_active && (
                          <button
                            type="button"
                            onClick={() => handleSetActive(drawing)}
                            disabled={updatingActiveId === drawing.id}
                            className="bg-amber-100 text-amber-900 px-4 py-2 rounded hover:bg-amber-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {updatingActiveId === drawing.id ? 'Applying...' : 'Set Active'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end gap-4">
          {!canClose && (
            <p className="text-red-600 text-sm flex-1">
              Please upload at least one drawing before closing
            </p>
          )}
          {canClose && (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
