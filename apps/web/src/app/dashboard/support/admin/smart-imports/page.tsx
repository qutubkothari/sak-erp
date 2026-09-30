"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "../../../../../../lib/api-client";

export default function SmartImportsAdminPage(){
  const [batches,setBatches]=useState<any[]>([]);const [error,setError]=useState("");
  useEffect(()=>{apiClient.get<any[]>("/smart-imports").then(setBatches).catch((e:any)=>setError(e.message||"Smart Import batches could not be loaded."));},[]);
  return <main className="mx-auto max-w-6xl space-y-5 p-6"><Link href="/dashboard" className="text-sm underline">Admin</Link><h1 className="text-2xl font-semibold">Smart Imports</h1>{error&&<p role="alert" className="rounded bg-red-50 p-3 text-red-800">{error}</p>}<div className="overflow-auto rounded border"><table className="w-full text-left text-sm"><thead className="bg-slate-50"><tr>{["Batch","Tenant","File","Requester","Status","Created / updated / skipped / errors","Approval","Date",""].map(x=><th className="p-3" key={x}>{x}</th>)}</tr></thead><tbody>{batches.map(b=><tr className="border-t" key={b.id}><td className="p-3">{b.batch_number}</td><td className="p-3">{b.tenant_name}</td><td className="p-3">{b.original_filename}</td><td className="p-3">{b.requested_by}</td><td className="p-3">{b.status}</td><td className="p-3">{b.created_count} / {b.updated_count} / {b.skipped_count} / {b.error_count}</td><td className="p-3">{b.approved_by?"Approved":"—"}</td><td className="p-3">{new Date(b.created_at).toLocaleString()}</td><td className="p-3"><Link className="underline" href={`/dashboard/active-planner/smart-import?batch=${encodeURIComponent(b.id)}`}>Review</Link></td></tr>)}</tbody></table>{!batches.length&&!error&&<p className="p-4 text-sm text-slate-600">No import batches found for this tenant.</p>}</div></main>;
}
