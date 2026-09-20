"use client";

import { useState, useEffect } from "react";
import { getUserRoleNames, readStoredUser } from "@/lib/rbac";

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
  document_id?: string | null;
  drawing_number?: string | null;
  revision_code?: string | null;
  file_role?: string | null;
  lifecycle_status?: string | null;
  effective_from?: string | null;
  linked_item_codes?: string[];
}

interface DocumentOption {
  id: string;
  title?: string | null;
  file_name?: string | null;
  file_url?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  created_at?: string | null;
  document_type?: string | null;
}

interface DrawingManagerProps {
  itemId: string;
  itemCode: string;
  itemName: string;
  onClose: () => void;
  onChanged?: (drawings: Drawing[]) => void;
  mandatory?: boolean;
}

export default function DrawingManager({
  itemId,
  itemCode,
  itemName,
  onClose,
  onChanged,
  mandatory = false,
}: DrawingManagerProps) {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [linking, setLinking] = useState(false);
  const [updatingActiveId, setUpdatingActiveId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [drawingNumber, setDrawingNumber] = useState(itemCode);
  const [revisionCode, setRevisionCode] = useState("R1");
  const [fileRole, setFileRole] = useState("CONTROLLED_2D");
  const [sharedItemCodes, setSharedItemCodes] = useState("");
  const [linkingSharedItems, setLinkingSharedItems] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [documents, setDocuments] = useState<DocumentOption[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [externalUrl, setExternalUrl] = useState("");
  const [externalUrlName, setExternalUrlName] = useState("");
  const [linkingUrl, setLinkingUrl] = useState(false);
  const canDeleteDrawings = getUserRoleNames(readStoredUser()).some((name) => {
    const normalized = String(name)
      .trim()
      .toUpperCase()
      .replace(/[\s_-]+/g, "");
    return normalized === "SUPERADMIN";
  });

  const dataUrlToBlob = (dataUrl: string) => {
    const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
    if (!match) return null;

    const mimeType = match[1];
    const base64Data = match[2];
    const byteString = atob(base64Data);
    const byteArray = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      byteArray[i] = byteString.charCodeAt(i);
    }

    return new Blob([byteArray], { type: mimeType });
  };

  const resolveDrawingUrl = async (drawing: Drawing, download = false) => {
    if (!drawing?.file_url) return "";
    if (!drawing.file_url.startsWith("storage://")) return drawing.file_url;

    const token = localStorage.getItem("accessToken");
    const response = await fetch(
      `/api/v1/inventory/items/${itemId}/drawings/${drawing.id}/file-url${download ? "?download=true" : ""}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.url) {
      throw new Error(data?.message || "Unable to obtain secure drawing link");
    }
    return String(data.url);
  };

  const openDrawingInNewTab = async (drawing: Drawing) => {
    try {
      if (!drawing?.file_url) return;

      // Prefer Blob URLs for reliability (data: URLs can be too long / blocked in some browsers)
      if (drawing.file_url.startsWith("data:")) {
        const blob = dataUrlToBlob(drawing.file_url);
        if (!blob) {
          window.open(drawing.file_url, "_blank", "noopener,noreferrer");
          return;
        }
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
        return;
      }

      const url = await resolveDrawingUrl(drawing);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Error opening drawing:", error);
      alert("Failed to open drawing");
    }
  };

  const downloadDrawing = async (drawing: Drawing) => {
    try {
      if (!drawing?.file_url) return;

      if (drawing.file_url.startsWith("data:")) {
        const blob = dataUrlToBlob(drawing.file_url);
        if (!blob) {
          const link = document.createElement("a");
          link.href = drawing.file_url;
          link.download = drawing.file_name || "drawing";
          document.body.appendChild(link);
          link.click();
          link.remove();
          return;
        }

        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = drawing.file_name || "drawing";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
        return;
      }

      const url = await resolveDrawingUrl(drawing, true);
      const link = document.createElement("a");
      link.href = url;
      link.download = drawing.file_name || "drawing";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error downloading drawing:", error);
      alert("Failed to download drawing");
    }
  };

  useEffect(() => {
    fetchDrawings();
    fetchDocuments();
  }, [itemId]);

  // Every (tenant, item, drawing_number, revision_code) combo must be unique in the
  // database. Re-suggest an unused revision code whenever the drawing list changes so a
  // correction upload never silently fails by colliding with the existing "R1" default.
  useEffect(() => {
    const usedRevisionCodes = new Set(
      drawings
        .filter((d) => (d.drawing_number || itemCode).toUpperCase() === drawingNumber.toUpperCase())
        .map((d) => (d.revision_code || `R${d.version}`).toUpperCase()),
    );
    if (!usedRevisionCodes.has(revisionCode.toUpperCase())) return;

    const maxVersion = drawings.reduce(
      (max, d) => ((d.drawing_number || itemCode).toUpperCase() === drawingNumber.toUpperCase()
        ? Math.max(max, Number(d.version) || 0)
        : max),
      0,
    );
    let candidate = `R${maxVersion + 1}`;
    let bump = maxVersion + 1;
    while (usedRevisionCodes.has(candidate.toUpperCase())) {
      bump += 1;
      candidate = `R${bump}`;
    }
    setRevisionCode(candidate);
  }, [drawings, drawingNumber, itemCode]);

  const fetchDrawings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `/api/v1/inventory/items/${itemId}/drawings`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        const data = await response.json();
        const normalized = Array.isArray(data) ? data : [];
        setDrawings(normalized);
        onChanged?.(normalized);
        return normalized;
      }
    } catch (error) {
      console.error("Error fetching drawings:", error);
    } finally {
      setLoading(false);
    }

    return [];
  };

  const fetchDocuments = async () => {
    try {
      setDocumentsLoading(true);
      const token = localStorage.getItem("accessToken");

      // We store drawings as Documents of type DRAWING (and sometimes TECHNICAL_DRAWING)
      const [drawingsRes, technicalRes] = await Promise.all([
        fetch("/api/v1/documents?document_type=DRAWING", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/v1/documents?document_type=TECHNICAL_DRAWING", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const results: DocumentOption[] = [];
      if (drawingsRes.ok) {
        const data = await drawingsRes.json();
        if (Array.isArray(data)) results.push(...data);
      }
      if (technicalRes.ok) {
        const data = await technicalRes.json();
        if (Array.isArray(data)) results.push(...data);
      }

      // Deduplicate by id, and keep newest first
      const byId = new Map<string, DocumentOption>();
      for (const doc of results) {
        if (doc?.id && !byId.has(doc.id)) byId.set(doc.id, doc);
      }

      const merged = Array.from(byId.values()).sort((a, b) => {
        const at = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bt - at;
      });

      setDocuments(merged);
    } catch (error) {
      console.error("Error fetching documents:", error);
      setDocuments([]);
    } finally {
      setDocumentsLoading(false);
    }
  };

  const handleLinkExistingDocument = async () => {
    if (!selectedDocumentId) {
      alert("Please select a drawing document");
      return;
    }

    if (!revisionNotes.trim() && drawings.length > 0) {
      alert("Please add revision notes for new versions");
      return;
    }

    setLinking(true);
    try {
      const token = localStorage.getItem("accessToken");

      const response = await fetch(
        `/api/v1/inventory/items/${itemId}/drawings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            documentId: selectedDocumentId,
            revisionNotes:
              revisionNotes.trim() ||
              (drawings.length > 0
                ? "Linked from Documents"
                : "Initial version"),
          }),
        },
      );

      if (response.ok) {
        alert("Drawing linked successfully!");
        setSelectedDocumentId("");
        setRevisionNotes("");
        await fetchDrawings();
      } else {
        const error = await response.json().catch(() => ({}));
        alert(`Failed to link: ${error.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Error linking document:", error);
      alert("Failed to link drawing");
    } finally {
      setLinking(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const extension = file.name.includes(".")
        ? file.name.slice(file.name.lastIndexOf(".")).toLowerCase()
        : "";
      const blockedExtensions = new Set([
        ".apk",
        ".app",
        ".bat",
        ".cmd",
        ".com",
        ".cpl",
        ".dll",
        ".dmg",
        ".exe",
        ".hta",
        ".html",
        ".htm",
        ".jar",
        ".js",
        ".jse",
        ".msi",
        ".msp",
        ".php",
        ".ps1",
        ".scr",
        ".sh",
        ".vbs",
        ".wsf",
      ]);
      if (blockedExtensions.has(extension)) {
        alert(`${extension} files are not permitted for engineering drawings`);
        return;
      }

      // Files upload directly to private Supabase Storage, bypassing the ERP VPS.
      if (file.size > 500 * 1024 * 1024) {
        alert("File size must be 500MB or less");
        return;
      }

      setSelectedFile(file);
      const extensionName = file.name.toLowerCase().split(".").pop() || "";
      setFileRole(
        ["step", "stp", "dwg", "dxf", "iges", "igs", "ifc", "stl", "rvt", "sldprt", "sldasm", "ipt", "iam"].includes(extensionName)
          ? "NATIVE_CAD"
          : ["pdf", "png", "jpg", "jpeg", "tif", "tiff", "webp"].includes(extensionName)
            ? "CONTROLLED_2D"
            : "SUPPORTING",
      );

      // Create preview for images
      if (file.type.startsWith("image/")) {
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

  const uploadDirectlyToSupabase = (
    signedUrl: string,
    file: File,
  ): Promise<void> =>
    new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("PUT", signedUrl);
      request.setRequestHeader("x-upsert", "false");
      request.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      request.onerror = () =>
        reject(new Error("Storage upload was interrupted"));
      request.onload = () => {
        if (request.status >= 200 && request.status < 300) resolve();
        else reject(new Error(`Storage upload failed (${request.status})`));
      };
      const body = new FormData();
      body.append("cacheControl", "3600");
      body.append("", file);
      request.send(body);
    });

  const parsedSharedItemCodes = () =>
    Array.from(
      new Set(
        sharedItemCodes
          .split(/[;,\n]/)
          .map((value) => value.trim().toUpperCase())
          .filter((value) => value && value !== itemCode.toUpperCase()),
      ),
    );

  const calculateContentHash = async (file: File) => {
    // Avoid retaining extremely large CAD files twice in browser memory. They
    // can still be shared during the initial upload using the item-code links.
    if (file.size > 100 * 1024 * 1024 || !globalThis.crypto?.subtle) return "";
    const digest = await globalThis.crypto.subtle.digest(
      "SHA-256",
      await file.arrayBuffer(),
    );
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  };

  const handleLinkSharedItems = async () => {
    const drawing = activeDrawing || drawings[0];
    const itemCodes = parsedSharedItemCodes();
    if (!drawing) return alert("Upload a drawing before linking other items");
    if (itemCodes.length === 0) return alert("Enter at least one additional item code");
    setLinkingSharedItems(true);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `/api/v1/inventory/items/${itemId}/drawings/${drawing.id}/links`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ itemCodes }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.message || "Unable to link items");
      setSharedItemCodes("");
      await fetchDrawings();
      alert(`Drawing linked to ${itemCodes.join(", ")} without uploading another file.`);
    } catch (error: any) {
      alert(error?.message || "Unable to link drawing to items");
    } finally {
      setLinkingSharedItems(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file");
      return;
    }

    if (!revisionNotes.trim() && drawings.length > 0) {
      alert("Please add revision notes for new versions");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      const token = localStorage.getItem("accessToken");
      const contentHash = await calculateContentHash(selectedFile);
      const linkedItemCodes = parsedSharedItemCodes();
      const prepareResponse = await fetch(
        `/api/v1/inventory/items/${itemId}/drawings/upload-url`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fileName: selectedFile.name,
            fileType: selectedFile.type || "application/octet-stream",
            fileSize: selectedFile.size,
            contentHash,
          }),
        },
      );
      const uploadTarget = await prepareResponse.json().catch(() => ({}));
      if (!prepareResponse.ok) {
        throw new Error(
          uploadTarget?.message || "Unable to prepare secure drawing upload",
        );
      }

      if (uploadTarget?.deduplicated && uploadTarget?.existingDrawingId) {
        const reuseResponse = await fetch(
          `/api/v1/inventory/items/${itemId}/drawings`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              existingDrawingId: uploadTarget.existingDrawingId,
              linkedItemCodes,
            }),
          },
        );
        const reused = await reuseResponse.json().catch(() => ({}));
        if (!reuseResponse.ok) throw new Error(reused?.message || "Unable to reuse shared drawing");
        alert("Identical file already exists. The existing stored file was linked without uploading a duplicate.");
        setSelectedFile(null);
        setRevisionNotes("");
        setSharedItemCodes("");
        await fetchDrawings();
        return;
      }
      if (!uploadTarget?.signedUrl) throw new Error("Unable to prepare secure drawing upload");

      await uploadDirectlyToSupabase(uploadTarget.signedUrl, selectedFile);

      const response = await fetch(
        `/api/v1/inventory/items/${itemId}/drawings`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fileName: selectedFile.name,
            fileType: selectedFile.type || "application/octet-stream",
            fileSize: selectedFile.size,
            storageBucket: uploadTarget.bucket,
            storagePath: uploadTarget.path,
            revisionNotes: revisionNotes.trim() || "Initial version",
            contentHash,
            linkedItemCodes,
            drawingNumber,
            revisionCode,
            fileRole,
          }),
        },
      );

      if (response.ok) {
        alert("Drawing uploaded successfully!");
        setSelectedFile(null);
        setUploadProgress(0);
        setRevisionNotes("");
        setSharedItemCodes("");
        setPreviewUrl(null);
        await fetchDrawings();
      } else {
        const error = await response.json().catch(() => ({}));
        const rawMessage = String(error.message || "Unknown error");
        const message = /duplicate key|unique constraint|already exists/i.test(rawMessage)
          ? `Revision ${revisionCode} for drawing ${drawingNumber} already exists. Change the Revision field to a new value (e.g. R${drawings.length + 1}) and upload again.`
          : rawMessage;
        alert(`Failed to upload: ${message}`);
      }
    } catch (error) {
      console.error("Error uploading drawing:", error);
      alert("Failed to upload drawing");
    } finally {
      setUploading(false);
    }
  };

  const handleTransition = async (
    drawing: Drawing,
    action: "SUBMIT" | "APPROVE" | "REJECT",
  ) => {
    try {
      setUpdatingActiveId(drawing.id);
      const token = localStorage.getItem("accessToken");

      if (action === "APPROVE") {
        const impactResponse = await fetch(
          `/api/v1/inventory/items/${itemId}/drawings/${drawing.id}/impact`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (!impactResponse.ok)
          throw new Error("Unable to check revision impact");
        const impact = await impactResponse.json();
        const affected =
          Number(impact?.open_job_count || 0) +
          Number(impact?.open_project_demand_count || 0);
        if (
          affected > 0 &&
          !window.confirm(
            `${impact.warning}\n\nOpen jobs: ${impact.open_job_count}\nOpen project demands: ${impact.open_project_demand_count}\n\nApprove this revision?`,
          )
        ) {
          return;
        }
      }

      const response = await fetch(
        `/api/v1/inventory/items/${itemId}/drawings/${drawing.id}/transition`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action }),
        },
      );

      if (response.ok) {
        await fetchDrawings();
      } else {
        const error = await response.json().catch(() => ({}));
        alert(
          `Failed to ${action.toLowerCase()} drawing: ${error.message || "Unknown error"}`,
        );
      }
    } catch (error) {
      console.error("Error changing drawing status:", error);
      alert("Failed to change drawing status");
    } finally {
      setUpdatingActiveId(null);
    }
  };

  const handleDeleteDrawing = async (drawing: Drawing) => {
    if (!canDeleteDrawings || deletingId) return;
    const linkedItems = Array.isArray(drawing.linked_item_codes)
      ? drawing.linked_item_codes.filter(Boolean)
      : [];
    const sharedWarning = linkedItems.length > 1
      ? `\n\nThis drawing is linked to: ${linkedItems.join(", ")}. It will be removed from every linked item's active drawing history.`
      : "";
    const mandatoryWarning = mandatory && drawings.length === 1
      ? "\n\nThis is the item's last drawing. A replacement will be required before the item can proceed through drawing-controlled workflows."
      : "";
    const confirmed = window.confirm(
      `Delete ${drawing.file_name} (v${drawing.version})?${sharedWarning}${mandatoryWarning}\n\nIssued PO and job-order references will be preserved for audit. This action is restricted to Super Admin.`,
    );
    if (!confirmed) return;

    setDeletingId(drawing.id);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `/api/v1/inventory/items/${itemId}/drawings/${drawing.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.message || "Unable to delete drawing");
      }
      await fetchDrawings();
      alert("Drawing deleted. Issued-document references were preserved.");
    } catch (error: any) {
      alert(error?.message || "Unable to delete drawing");
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const canClose = !mandatory || drawings.length > 0;

  const activeDrawing =
    drawings.find((d) => d.lifecycle_status === "APPROVED" && d.is_active) ||
    drawings.find((d) => d.is_active) ||
    null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1200] p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Drawing Management
              </h2>
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
              {drawings.length > 0
                ? `Upload New Version (v${drawings[0].version + 1})`
                : "Upload First Drawing (v1)"}
            </h3>

            <div className="space-y-4">
              {/* Link existing Document */}
              <div className="bg-white border border-amber-200 rounded-lg p-3">
                <div className="text-sm font-medium text-amber-900 mb-2">
                  Use Existing Drawing from Documents
                </div>
                <div className="flex gap-2 items-center">
                  <select
                    value={selectedDocumentId}
                    onChange={(e) => setSelectedDocumentId(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    disabled={documentsLoading || linking}
                  >
                    <option value="">
                      {documentsLoading
                        ? "Loading drawings…"
                        : "Select a drawing document"}
                    </option>
                    {documents.map((doc) => {
                      const label = (
                        doc.title ||
                        doc.file_name ||
                        doc.id ||
                        ""
                      ).toString();
                      return (
                        <option key={doc.id} value={doc.id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>

                  <button
                    type="button"
                    onClick={handleLinkExistingDocument}
                    disabled={!selectedDocumentId || linking}
                    className="bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 disabled:bg-gray-400 text-sm"
                  >
                    {linking ? "Linking…" : "Link"}
                  </button>
                </div>
                <div className="text-xs text-gray-600 mt-2">
                  This will create a new drawing version for this item using the
                  selected Document.
                </div>
              </div>

              {/* External URL option */}
              <div className="bg-white border border-amber-200 rounded-lg p-3">
                <div className="text-sm font-medium text-amber-900 mb-2">
                  Link External URL / Cloud Drive
                </div>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={externalUrlName}
                    onChange={(e) => setExternalUrlName(e.target.value)}
                    placeholder="Drawing name / description (e.g. Assembly Drawing Rev 2)"
                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                  />
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                      placeholder="https://drive.google.com/... or any public URL"
                      className="flex-1 border border-gray-300 rounded px-3 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      disabled={!externalUrl.trim() || linkingUrl}
                      onClick={async () => {
                        if (!externalUrl.trim()) return;
                        setLinkingUrl(true);
                        try {
                          const token = localStorage.getItem("accessToken");
                          const res = await fetch(
                            `/api/v1/inventory/items/${itemId}/drawings`,
                            {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({
                                fileName:
                                  externalUrlName.trim() ||
                                  new URL(externalUrl).pathname
                                    .split("/")
                                    .pop() ||
                                  "external-link",
                                fileUrl: externalUrl.trim(),
                                fileType: "application/external-link",
                                fileSize: 0,
                                revisionNotes:
                                  revisionNotes.trim() || "Linked external URL",
                              }),
                            },
                          );
                          if (res.ok) {
                            alert("External URL linked successfully!");
                            setExternalUrl("");
                            setExternalUrlName("");
                            setRevisionNotes("");
                            await fetchDrawings();
                          } else {
                            const err = await res.json().catch(() => ({}));
                            alert(`Failed: ${err.message || "Unknown error"}`);
                          }
                        } catch (e: any) {
                          alert(e.message || "Failed to link URL");
                        } finally {
                          setLinkingUrl(false);
                        }
                      }}
                      className="bg-blue-600 text-white px-4 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                    >
                      {linkingUrl ? "Linking…" : "Link URL"}
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Paste a Google Drive, SharePoint, or any accessible URL.
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Drawing or Supporting File (Max 500MB)
                </label>
                <input
                  type="file"
                  onChange={handleFileSelect}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
                <p className="mt-1 text-xs text-gray-500">
                  CAD and engineering formats such as DWG, DXF, STEP, IGES, IFC,
                  STL, RVT and native vendor files are supported.
                </p>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
                <div className="text-sm font-semibold text-amber-950">Drawing revision correlation</div>
                <select
                  value=""
                  onChange={(event) => {
                    const existing = drawings.find((drawing) => drawing.id === event.target.value);
                    if (existing) {
                      setDrawingNumber(existing.drawing_number || itemCode);
                      setRevisionCode(existing.revision_code || `R${existing.version || 1}`);
                    }
                  }}
                  className="w-full rounded border border-amber-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">New revision, or correlate with an existing revision...</option>
                  {drawings.map((drawing) => (
                    <option key={drawing.id} value={drawing.id}>
                      {drawing.drawing_number || itemCode} — {drawing.revision_code || `R${drawing.version}`}
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <input value={drawingNumber} onChange={(event) => setDrawingNumber(event.target.value.toUpperCase())}
                    placeholder="Drawing number" className="rounded border border-amber-200 bg-white px-3 py-2 text-sm" />
                  <input value={revisionCode} onChange={(event) => setRevisionCode(event.target.value.toUpperCase())}
                    placeholder="Revision" className="rounded border border-amber-200 bg-white px-3 py-2 text-sm" />
                  <select value={fileRole} onChange={(event) => setFileRole(event.target.value)}
                    className="rounded border border-amber-200 bg-white px-3 py-2 text-sm">
                    <option value="NATIVE_CAD">Native CAD / 3D</option>
                    <option value="CONTROLLED_2D">Controlled PDF / 2D</option>
                    <option value="SUPPORTING">Supporting document</option>
                  </select>
                </div>
                <p className="text-xs text-amber-900">Files with the same drawing number and revision are issued as one controlled package.</p>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <label className="block text-sm font-medium text-blue-950 mb-2">
                  Also applicable to item codes
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={sharedItemCodes}
                    onChange={(event) => setSharedItemCodes(event.target.value)}
                    placeholder="e.g. 400-0009, 400-0040, 400-0039"
                    className="min-w-0 flex-1 rounded border border-blue-200 bg-white px-3 py-2 text-sm"
                  />
                  {drawings.length > 0 && (
                    <button
                      type="button"
                      onClick={handleLinkSharedItems}
                      disabled={linkingSharedItems || !sharedItemCodes.trim()}
                      className="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    >
                      {linkingSharedItems ? "Linking..." : "Link current drawing"}
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-blue-800">
                  The file is stored once and linked to every listed item. Existing identical files are detected automatically.
                </p>
              </div>

              {previewUrl && (
                <div className="border border-gray-300 rounded-lg p-2">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-48 mx-auto"
                  />
                </div>
              )}

              {selectedFile && (
                <div className="text-sm text-gray-600">
                  Selected: {selectedFile.name} (
                  {formatFileSize(selectedFile.size)})
                </div>
              )}

              {uploading && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Uploading directly to secure storage</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-amber-600 transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
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
                {uploading ? `Uploading ${uploadProgress}%` : "Upload Drawing"}
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
                Approved production drawing:{" "}
                <span className="font-semibold">
                  {activeDrawing.drawing_number || `v${activeDrawing.version}`}{" "}
                  {activeDrawing.revision_code || ""}
                </span>{" "}
                ({activeDrawing.file_name})
              </div>
            )}

            {loading ? (
              <div className="text-center py-8 text-gray-500">
                Loading drawings...
              </div>
            ) : drawings.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-4xl mb-2">📄</div>
                <p className="text-gray-600">No drawings uploaded yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Upload the first version above
                </p>
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
                          <span className="font-medium text-gray-900">
                            {drawing.file_name}
                          </span>
                          <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-semibold">
                            {drawing.drawing_number || "Drawing"} /{" "}
                            {drawing.revision_code || `R${drawing.version}`}
                          </span>
                          {drawing.version === drawings[0].version && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
                              LATEST
                            </span>
                          )}
                          {(drawing.lifecycle_status ||
                            (drawing.is_active
                              ? "APPROVED"
                              : "SUPERSEDED")) && (
                            <span className="bg-amber-100 text-amber-900 px-2 py-1 rounded text-xs font-semibold">
                              {drawing.lifecycle_status ||
                                (drawing.is_active ? "APPROVED" : "SUPERSEDED")}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 text-sm text-gray-600 grid grid-cols-2 gap-x-4">
                          <div>
                            Type:{" "}
                            {drawing.file_type ===
                            "application/external-link" ? (
                              <span className="text-blue-600 font-medium">
                                🔗 External URL
                              </span>
                            ) : (
                              drawing.file_type
                            )}
                          </div>
                          <div>
                            {drawing.file_type === "application/external-link"
                              ? ""
                              : `Size: ${formatFileSize(drawing.file_size)}`}
                          </div>
                          <div className="col-span-2 mt-1">
                            Uploaded: {formatDate(drawing.created_at)}
                          </div>
                          <div className="col-span-2 mt-1">
                            Drawing: {drawing.drawing_number || "-"} / Revision: {drawing.revision_code || `R${drawing.version}`} / Role: {drawing.file_role || "-"}
                          </div>
                          {drawing.file_type ===
                            "application/external-link" && (
                            <div className="col-span-2 mt-1 truncate text-blue-500 text-xs">
                              {drawing.file_url}
                            </div>
                          )}
                        </div>

                        {drawing.revision_notes && (
                          <div className="mt-2 text-sm bg-gray-50 rounded px-3 py-2">
                            <span className="font-medium">Notes:</span>{" "}
                            {drawing.revision_notes}
                          </div>
                        )}
                        {Array.isArray(drawing.linked_item_codes) &&
                          drawing.linked_item_codes.length > 0 && (
                            <div className="mt-2 text-sm text-blue-800">
                              Applies to: {drawing.linked_item_codes.join(", ")}
                            </div>
                          )}
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openDrawingInNewTab(drawing)}
                          className="bg-blue-100 text-blue-700 px-4 py-2 rounded hover:bg-blue-200 text-sm font-medium"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadDrawing(drawing)}
                          className="bg-green-100 text-green-700 px-4 py-2 rounded hover:bg-green-200 text-sm font-medium"
                        >
                          Download
                        </button>
                        {canDeleteDrawings && (
                          <button
                            type="button"
                            onClick={() => handleDeleteDrawing(drawing)}
                            disabled={deletingId === drawing.id}
                            className="bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deletingId === drawing.id ? "Deleting..." : "Delete"}
                          </button>
                        )}
                        {(drawing.lifecycle_status || "DRAFT") === "DRAFT" && (
                          <button
                            type="button"
                            onClick={() => handleTransition(drawing, "SUBMIT")}
                            disabled={updatingActiveId === drawing.id}
                            className="bg-amber-100 text-amber-900 px-4 py-2 rounded hover:bg-amber-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {updatingActiveId === drawing.id
                              ? "Submitting..."
                              : "Submit"}
                          </button>
                        )}
                        {drawing.lifecycle_status === "SUBMITTED" && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleTransition(drawing, "APPROVE")
                              }
                              disabled={updatingActiveId === drawing.id}
                              className="bg-emerald-100 text-emerald-800 px-4 py-2 rounded hover:bg-emerald-200 text-sm font-medium disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleTransition(drawing, "REJECT")
                              }
                              disabled={updatingActiveId === drawing.id}
                              className="bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200 text-sm font-medium disabled:opacity-50"
                            >
                              Return
                            </button>
                          </>
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
