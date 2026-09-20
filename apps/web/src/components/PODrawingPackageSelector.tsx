"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileCheck2, Layers3 } from "lucide-react";

export type PODrawingDeliveryMethod = "MERGE_PO" | "ATTACH_SEPARATELY" | "EXCLUDE";
export type PODrawingFileSelection = {
  drawingId: string;
  deliveryMethod: PODrawingDeliveryMethod;
};

type Drawing = {
  id: string;
  file_name?: string;
  file_type?: string;
  version?: number;
  drawing_number?: string;
  revision_code?: string;
  revision_package_id?: string;
  lifecycle_status?: string;
  file_role?: string;
  default_delivery_method?: PODrawingDeliveryMethod;
  is_active?: boolean;
  approved_at?: string;
};

type Package = {
  key: string;
  drawingNumber: string;
  revisionCode: string;
  status: string;
  files: Drawing[];
  rank: number;
};

function inferredDelivery(file: Drawing): PODrawingDeliveryMethod {
  if (file.default_delivery_method) return file.default_delivery_method;
  const name = String(file.file_name || "").toLowerCase();
  return /\.(pdf|png|jpe?g|tiff?|webp)$/.test(name) ? "MERGE_PO" : "ATTACH_SEPARATELY";
}

export default function PODrawingPackageSelector({
  itemId,
  mandatory,
  value,
  onChange,
}: {
  itemId: string;
  mandatory: boolean;
  value: PODrawingFileSelection[];
  onChange: (value: PODrawingFileSelection[]) => void;
}) {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPackageKey, setSelectedPackageKey] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const token = localStorage.getItem("accessToken");
    fetch(`/api/v1/inventory/items/${itemId}/drawings`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load drawing revisions");
        return response.json();
      })
      .then((rows) => { if (!cancelled) setDrawings(Array.isArray(rows) ? rows : []); })
      .catch(() => { if (!cancelled) setDrawings([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [itemId]);

  const packages = useMemo<Package[]>(() => {
    const grouped = new Map<string, Package>();
    for (const file of drawings) {
      const drawingNumber = String(file.drawing_number || `Drawing ${file.version || ""}`).trim();
      const revisionCode = String(file.revision_code || `R${file.version || ""}`).trim();
      const key = file.revision_package_id || `${drawingNumber}::${revisionCode}`;
      const status = String(file.lifecycle_status || (file.is_active ? "APPROVED" : "SUPERSEDED")).toUpperCase();
      const current = grouped.get(key) || {
        key, drawingNumber, revisionCode, status, files: [],
        rank: Math.max(Number(file.version || 0), Date.parse(file.approved_at || "") || 0),
      };
      current.files.push(file);
      if (status === "APPROVED") current.status = "APPROVED";
      current.rank = Math.max(current.rank, Number(file.version || 0), Date.parse(file.approved_at || "") || 0);
      grouped.set(key, current);
    }
    return Array.from(grouped.values()).sort((a, b) => {
      if (a.status === "APPROVED" && b.status !== "APPROVED") return -1;
      if (b.status === "APPROVED" && a.status !== "APPROVED") return 1;
      return b.rank - a.rank;
    });
  }, [drawings]);

  useEffect(() => {
    if (!packages.length) return;
    const packageFromValue = packages.find((pkg) => pkg.files.some((file) => value.some((entry) => entry.drawingId === file.id)));
    const next = packageFromValue || packages.find((pkg) => pkg.status === "APPROVED");
    if (!next) return;
    if (selectedPackageKey !== next.key) setSelectedPackageKey(next.key);
    if (value.length === 0 && next.status === "APPROVED") {
      onChange(next.files.map((file) => ({ drawingId: file.id, deliveryMethod: inferredDelivery(file) })));
    }
  }, [packages, selectedPackageKey, value, onChange]);

  const selectedPackage = packages.find((pkg) => pkg.key === selectedPackageKey);
  const selectedMap = new Map(value.map((entry) => [entry.drawingId, entry.deliveryMethod]));
  const selectedFiles = selectedPackage?.files.filter((file) => {
    const method = selectedMap.get(file.id);
    return method && method !== "EXCLUDE";
  }) || [];
  const hasPdf = selectedFiles.some((file) => /\.pdf$/i.test(String(file.file_name || "")));
  const hasCad = selectedFiles.some((file) => /\.(step|stp|dwg|dxf|iges|igs)$/i.test(String(file.file_name || "")));
  const warning = selectedPackage && selectedPackage.status !== "APPROVED"
    ? "This revision is not approved/released and cannot be issued with a PO."
    : mandatory && selectedFiles.length === 0
      ? "At least one released drawing file is compulsory."
      : hasCad && !hasPdf
        ? "Native CAD is selected without a matching controlled PDF."
        : "";

  const choosePackage = (key: string) => {
    setSelectedPackageKey(key);
    const pkg = packages.find((entry) => entry.key === key);
    onChange(pkg?.status === "APPROVED"
      ? pkg.files.map((file) => ({ drawingId: file.id, deliveryMethod: inferredDelivery(file) }))
      : []);
  };

  const toggleFile = (file: Drawing, checked: boolean) => {
    onChange(checked
      ? [...value.filter((entry) => entry.drawingId !== file.id), { drawingId: file.id, deliveryMethod: inferredDelivery(file) }]
      : value.filter((entry) => entry.drawingId !== file.id));
  };

  return (
    <div className="space-y-2 rounded-lg border border-[#D8C8AA] bg-[#FCFAF5] p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-[#4A3426]"><Layers3 size={15} /> Drawing revision package</div>
      <select
        value={selectedPackageKey}
        onChange={(event) => choosePackage(event.target.value)}
        className="w-full rounded border border-[#D8C8AA] bg-white px-2 py-2 text-xs"
        disabled={loading}
      >
        <option value="">{loading ? "Loading revisions..." : "Select released revision"}</option>
        {packages.map((pkg) => (
          <option key={pkg.key} value={pkg.key} disabled={pkg.status !== "APPROVED"}>
            {pkg.drawingNumber} — {pkg.revisionCode} — {pkg.status}
          </option>
        ))}
      </select>
      {selectedPackage?.files.map((file) => {
        const checked = selectedMap.has(file.id);
        return (
          <div key={file.id} className="grid grid-cols-[1fr_auto] items-center gap-2 rounded border bg-white p-2">
            <label className="flex min-w-0 items-center gap-2 text-xs">
              <input type="checkbox" checked={checked} onChange={(event) => toggleFile(file, event.target.checked)} />
              <span className="truncate"><b>{file.file_name || "Drawing file"}</b><br />{file.file_role || "DRAWING"}</span>
            </label>
            {checked && (
              <select
                value={selectedMap.get(file.id)}
                onChange={(event) => onChange(value.map((entry) => entry.drawingId === file.id
                  ? { ...entry, deliveryMethod: event.target.value as PODrawingDeliveryMethod }
                  : entry))}
                className="rounded border px-2 py-1 text-xs"
              >
                {String(file.file_role || '').toUpperCase() !== 'NATIVE_CAD' && <option value="MERGE_PO">Merge into PO</option>}
                <option value="ATTACH_SEPARATELY">Attach separately</option>
                <option value="EXCLUDE">Exclude</option>
              </select>
            )}
          </div>
        );
      })}
      {selectedPackage && (
        <div className="rounded bg-white p-2 text-xs text-[#5E4635]">
          <div className="flex items-center gap-1 font-semibold"><FileCheck2 size={14} /> Package preview</div>
          <div>PO merge: {value.filter((x) => x.deliveryMethod === "MERGE_PO").length}</div>
          <div>Separate attachments: {value.filter((x) => x.deliveryMethod === "ATTACH_SEPARATELY").length}</div>
          <div>Excluded: {value.filter((x) => x.deliveryMethod === "EXCLUDE").length}</div>
        </div>
      )}
      {warning && <div className="flex gap-1 rounded bg-amber-50 p-2 text-xs text-amber-900"><AlertTriangle size={14} className="shrink-0" />{warning}</div>}
    </div>
  );
}
