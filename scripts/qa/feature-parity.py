#!/usr/bin/env python3
"""Source-only ERP parity inventory. Never connects to a database or deployment."""
import argparse
import csv
import hashlib
import json
import os
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FEATURES = [
  # id, module, web route or source, API implementation, migration hint
  ('AUTH', 'Auth', 'apps/web/src/app/login/page.tsx', 'apps/api/src/auth/auth.controller.ts', ''),
  ('PERMISSIONS', 'Auth', 'apps/web/src/app/dashboard/settings/page.tsx', 'apps/api/src/auth/guards/permissions.guard.ts', ''),
  ('DASHBOARD_MIS', 'Dashboard', 'apps/web/src/app/dashboard/page.tsx', 'apps/api/src/dashboard/dashboard.controller.ts', ''),
  ('PR', 'Procurement', 'apps/web/src/app/dashboard/purchase/requisitions/page.tsx', 'apps/api/src/purchase/services/purchase-requisitions.service.ts', ''),
  ('RFQ', 'Procurement', 'apps/web/src/app/dashboard/purchase/requisitions/page.tsx', 'apps/api/src/purchase/controllers/purchase-requisitions.controller.ts', ''),
  ('PR_TO_PO', 'Procurement', 'apps/web/src/app/dashboard/purchase/orders/page.tsx', 'apps/api/src/purchase/services/purchase-orders.service.ts', ''),
  ('PO_APPROVAL', 'Procurement', 'apps/web/src/app/dashboard/purchase/orders/page.tsx', 'apps/api/src/purchase/controllers/purchase-orders.controller.ts', ''),
  ('OPEN_PO', 'Procurement', 'apps/web/src/app/dashboard/purchase/orders/page.tsx', 'apps/api/src/purchase/services/purchase-orders.service.ts', ''),
  ('PO_SEARCH_EXPORT', 'Procurement', 'apps/web/src/app/dashboard/purchase/orders/page.tsx', 'apps/api/src/purchase/controllers/purchase-orders.controller.ts', ''),
  ('PO_NUMBER_SEQUENCE', 'Procurement', 'apps/web/src/app/dashboard/purchase/orders/page.tsx', 'apps/api/src/purchase/services/purchase-orders.service.ts', 'add-purchase-order-number-sequence.sql'),
  ('PO_LONG_ITEM_NAME', 'Procurement', 'apps/web/src/app/dashboard/purchase/orders/page.tsx', 'apps/api/src/purchase/services/purchase-orders.service.ts', '20260922_po_item_name_text.sql'),
  ('GRN', 'Procurement', 'apps/web/src/app/dashboard/purchase/grn/page.tsx', 'apps/api/src/purchase/services/grn.service.ts', ''),
  ('GRN_DUPLICATE_LINE', 'Procurement', 'apps/web/src/app/dashboard/purchase/grn/page.tsx', 'apps/api/src/purchase/services/grn.service.ts', 'add-grn-invoice-idempotency-lock.sql'),
  ('QC', 'Procurement', 'apps/web/src/app/dashboard/quality/page.tsx', 'apps/api/src/quality/controllers/quality.controller.ts', ''),
  ('SUPPLIER_INVOICES', 'Procurement', 'apps/web/src/app/dashboard/accounts/supplier-invoices/page.tsx', 'apps/api/src/accounting/accounting.controller.ts', ''),
  ('VENDORS', 'Procurement', 'apps/web/src/app/dashboard/purchase/vendors/page.tsx', 'apps/api/src/purchase/services/vendors.service.ts', ''),
  ('IMPORT_FILES', 'Procurement', 'apps/web/src/app/dashboard/purchase/import-files/page.tsx', 'apps/api/src/purchase/services/import-files.service.ts', ''),
  ('SERVICE_ENTRIES', 'Procurement', 'apps/web/src/app/dashboard/purchase/service-entries/page.tsx', 'apps/api/src/purchase/services/service-entry-sheets.service.ts', ''),
  ('DEBIT_NOTES', 'Procurement', 'apps/web/src/app/dashboard/purchase/debit-notes/page.tsx', 'apps/api/src/purchase/services/debit-note.service.ts', ''),
  ('ITEM_MASTER', 'Inventory', 'apps/web/src/app/dashboard/inventory/items/page.tsx', 'apps/api/src/items/services/items.service.ts', ''),
  ('OEM', 'Inventory', 'apps/web/src/app/dashboard/inventory/items/page.tsx', 'apps/api/src/items/services/items.service.ts', ''),
  ('DIMENSIONAL_ITEMS', 'Inventory', 'apps/web/src/app/dashboard/inventory/items/page.tsx', 'apps/api/src/items/services/items.service.ts', 'add-dimensional-item-and-cutting-planning.sql'),
  ('DRAWING_REVISIONS', 'Inventory', 'apps/web/src/components/DrawingManager.tsx', 'apps/api/src/items/services/engineering-drawing-storage.service.ts', 'add-drawing-role-revision-uniqueness.sql'),
  ('STOCK_TRANSACTIONS', 'Inventory', 'apps/web/src/app/dashboard/inventory/page.tsx', 'apps/api/src/inventory/controllers/inventory.controller.ts', ''),
  ('UID', 'Inventory', 'apps/web/src/app/dashboard/uid/page.tsx', 'apps/api/src/uid/uid.controller.ts', ''),
  ('STOCK_TRAIL', 'Inventory', 'apps/web/src/app/dashboard/uid/trace/page.tsx', 'apps/api/src/uid/traceability.controller.ts', ''),
  ('BOM', 'Production', 'apps/web/src/app/dashboard/bom/page.tsx', 'apps/api/src/bom/controllers/bom.controller.ts', ''),
  ('SUBCONTRACTING', 'Production', 'apps/web/src/app/dashboard/production/subcontracting/page.tsx', 'apps/api/src/subcontracting/subcontracting.service.ts', ''),
  ('SUBCONTRACT_CONVERSION', 'Production', 'apps/web/src/app/dashboard/production/subcontracting/page.tsx', 'apps/api/src/subcontracting/subcontracting.service.ts', 'add-subcontract-standard-output-per-input.sql'),
  ('DIMENSIONAL_CUTTING', 'Production', 'apps/web/src/app/dashboard/production/subcontracting/page.tsx', 'apps/api/src/subcontracting/subcontracting.service.ts', 'add-dimensional-item-and-cutting-planning.sql'),
  ('REMNANTS', 'Production', 'apps/web/src/app/dashboard/production/subcontracting/page.tsx', 'apps/api/src/subcontracting/subcontracting.service.ts', 'add-subcontract-remnants.sql'),
  ('COSTING', 'Production', 'apps/web/src/app/dashboard/accounts/costing/page.tsx', 'apps/api/src/costing/costing.controller.ts', ''),
  ('ACCOUNTS', 'Accounts', 'apps/web/src/app/dashboard/accounts/page.tsx', 'apps/api/src/accounting/accounting.controller.ts', 'add-accounting-core.sql'),
  ('SALES', 'Sales', 'apps/web/src/app/dashboard/sales/page.tsx', 'apps/api/src/sales/controllers/sales.controller.ts', ''),
  ('EMPLOYEES', 'HR', 'apps/web/src/app/dashboard/hr/employees/page.tsx', 'apps/api/src/hr/controllers/hr.controller.ts', ''),
  ('MOBILE_ATTENDANCE', 'HR', 'apps/web/src/app/dashboard/hr/page.tsx', 'apps/api/src/hr/services/hr.service.ts', ''),
  ('HISTORICAL_ATTENDANCE', 'HR', 'apps/web/src/app/dashboard/hr/page.tsx', 'apps/api/src/hr/services/hr-historical-attendance-import.service.ts', ''),
  ('LEAVE', 'HR', 'apps/web/src/app/dashboard/hr/page.tsx', 'apps/api/src/hr/services/hr.service.ts', ''),
  ('PAYROLL', 'HR', 'apps/web/src/app/dashboard/hr/payroll/page.tsx', 'apps/api/src/hr/services/hr.service.ts', ''),
  ('HOLIDAYS', 'HR', 'apps/web/src/app/dashboard/hr/page.tsx', 'apps/api/src/hr/services/hr.service.ts', ''),
  ('DOCUMENTS', 'Documents', 'apps/web/src/app/dashboard/documents/page.tsx', 'apps/api/src/documents/services/documents.service.ts', ''),
  ('QUICK_SEARCH', 'Search', 'apps/web/src/components/CommandPalette.tsx', 'apps/api/src/dashboard/dashboard.controller.ts', ''),
  ('ACTIVE_PLANNER', 'Intelligence', 'apps/web/src/app/dashboard/active-planner/page.tsx', 'apps/api/src/intelligence/active-planner.service.ts', ''),
  ('AUTOHEAL_SUPPORT', 'Support', 'apps/web/src/app/dashboard/automation/page.tsx', 'apps/api/src/automation/automation.service.ts', ''),
]

def files(root, pattern):
    return {p.relative_to(root).as_posix(): p for p in root.glob(pattern) if p.is_file()}

def digest(path):
    return hashlib.sha256(path.read_bytes().replace(b'\r\n', b'\n')).hexdigest()

def sha(root):
    try:
        return subprocess.check_output(['git', '-C', str(root), 'rev-parse', 'HEAD'], stderr=subprocess.DEVNULL, text=True).strip()
    except Exception:
        return 'UNKNOWN (artifact/source snapshot without Git metadata)'

def write_csv(path, header, rows):
    with path.open('w', encoding='utf-8', newline='') as f:
        w = csv.writer(f); w.writerow(header); w.writerows(rows)

def inventory(root):
    return {k: files(root, pat) for k, pat in {
        'routes':'apps/web/src/app/**/page.tsx',
        'api':'apps/api/src/**/*controller.ts',
        'migrations':'migrations/*.sql',
    }.items()}

def endpoints(controllers):
    found={}
    for path,source in controllers.items():
        code=source.read_text(encoding='utf-8',errors='replace')
        controller=re.search(r'@Controller\s*\(\s*[\'\"]([^\'\"]*)',code)
        prefix=controller.group(1).strip('/') if controller else '?'
        methods=list(re.finditer(r'@(Get|Post|Put|Patch|Delete|Options|Head)\s*\(\s*(?:[\'\"]([^\'\"]*)[\'\"])?',code))
        for method in methods:
            suffix=(method.group(2) or '').strip('/')
            endpoint='/'+'/'.join(x for x in (prefix,suffix) if x)
            found[f'{method.group(1).upper()} {endpoint} [{path}]']=source
        if not methods: found[f'UNPARSED [{path}]']=source
    return found

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--saifseas', type=Path, default=ROOT)
    ap.add_argument('--mizantra', type=Path, default=Path(os.environ.get('ERP_MIZANTRA_SOURCE', ROOT.parent/'mizantra')))
    ap.add_argument('--arwa', type=Path, default=Path(os.environ.get('ERP_ARWA_SOURCE', ROOT.parent/'arwa-mizantra')))
    ap.add_argument('--out', type=Path, default=Path(os.environ.get('ERP_PARITY_OUT', ROOT/'parity-report')))
    a=ap.parse_args(); roots=[p.resolve() for p in (a.saifseas,a.mizantra,a.arwa)]
    for root in roots:
        if not (root/'apps/api/src').is_dir(): ap.error(f'No ERP source at {root}')
    a.out.mkdir(parents=True,exist_ok=True)
    inv=[inventory(p) for p in roots]
    names=['SaifSeas','Mizantra','Arwa']
    rows=[]; comparisons=[[],[]]
    for fid,module,web,api,migration in FEATURES:
        paths=[web,api]+([f'migrations/{migration}'] if migration else [])
        states=[all((root/p).is_file() for p in paths) for root in roots]
        evidence='; '.join(paths)
        rows.append([fid,module,web,api,migration,'shared',*('PRESENT' if s else 'MISSING' for s in states),evidence])
        for j in (1,2):
            left=0 if j==1 else 1
            if states[left] and not states[j]: status='SAIFSEAS_NEWER' if j==1 else 'MIZANTRA_NEWER'
            elif not states[left] and states[j]: status='MIZANTRA_ONLY_SHARED_CANDIDATE' if j==1 else 'ARWA_SHARED_CANDIDATE'
            elif not states[left]: status='UNKNOWN'
            else:
                same=all(digest(roots[left]/p)==digest(roots[j]/p) for p in paths)
                status='COMMON_CURRENT' if same else 'REVIEW_FUNCTIONAL_DIFFERENCE'
            comparisons[j-1].append([fid,module,status,evidence,'Source evidence only; divergent implementations require behavior review'])
    write_csv(a.out/'01_shared_feature_matrix.csv',['feature_id','module','frontend','api_service','migration','scope',*names,'evidence'],rows)
    write_csv(a.out/'02_mizantra_vs_saifseas.csv',['feature_id','module','classification','evidence','limit'],comparisons[0])
    write_csv(a.out/'03_arwa_vs_mizantra.csv',['feature_id','module','classification','evidence','limit'],comparisons[1])
    for kind,index in [('routes',4)]:
        all_paths=sorted(set().union(*(i[kind] for i in inv)))
        write_csv(a.out/f'{index:02d}_{"route" if kind=="routes" else "api"}_parity.csv',
          ['path',*names,'classification'],
          [[p,*('SAME_AS_BASE' if j and p in inv[0][kind] and p in inv[j][kind] and digest(inv[0][kind][p])==digest(inv[j][kind][p]) else 'PRESENT' if p in inv[j][kind] else 'MISSING' for j in range(3)),
            'SHARED' if all(p in i[kind] for i in inv) else 'DRIFT'] for p in all_paths])
    ep=[endpoints(i['api']) for i in inv]
    all_ep=sorted(set().union(*(e.keys() for e in ep)))
    write_csv(a.out/'05_api_parity.csv',['endpoint_and_controller',*names,'classification'],[
      [key,*('PRESENT' if key in e else 'MISSING' for e in ep),
       'SHARED' if all(key in e for e in ep) else 'DRIFT'] for key in all_ep])
    all_m=sorted(set().union(*(i['migrations'] for i in inv)))
    schema_rows=[[p,*((digest(inv[j]['migrations'][p]) if p in inv[j]['migrations'] else 'MISSING') for j in range(3)),
        'YES' if p in inv[0]['migrations'] else 'REVIEW',
        'ALREADY_PRESENT' if all(p in i['migrations'] and digest(i['migrations'][p])==digest(inv[0]['migrations'][p]) for i in inv) else 'SHARED_REQUIRED' if p in inv[0]['migrations'] and any(p not in i['migrations'] for i in inv[1:]) else 'CONFLICT' if p in inv[0]['migrations'] else 'REVIEW'] for p in all_m]
    # SQL declarations are source evidence, never a claim about the live database.
    declaration = re.compile(r'\b(?:CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?|ALTER\s+TABLE\s+)([\w.\"]+)|\bADD\s+(?:COLUMN|CONSTRAINT)\s+(?:IF\s+NOT\s+EXISTS\s+)?([\w\"]+)', re.I)
    for migration in all_m:
        objects=[]
        for j in range(3):
            if migration in inv[j]['migrations']:
                objects.append(set(next(g for g in m.groups() if g).replace('"','') for m in declaration.finditer(inv[j]['migrations'][migration].read_text(encoding='utf-8',errors='replace'))))
            else: objects.append(set())
        for obj in sorted(set().union(*objects)):
            schema_rows.append([f'{migration}::{obj}',*('SOURCE_DECLARED' if obj in s else 'MISSING' for s in objects),'YES' if obj in objects[0] else 'REVIEW','REVIEW_LIVE_SCHEMA'])
    write_csv(a.out/'06_migration_schema_parity.csv',['table_column_constraint_or_migration',*names,'required_by_shared_core','action'],schema_rows)
    profiles=json.loads((ROOT/'tenant/profiles.json').read_text(encoding='utf-8'))
    write_csv(a.out/'07_tenant_configuration_matrix.csv',['tenant','country','currency','locale','market_profile','features','status'],
      [[name,p['country'],p['currency'],p['locale'],p['marketProfile'],json.dumps(p['features'],sort_keys=True),'CODE_PROFILE; runtime settings unverified'] for name,p in profiles.items()])
    source_sets=[{**files(root,'apps/api/src/**/*'),**files(root,'apps/web/src/**/*'),**files(root,'packages/database/prisma/*.prisma')} for root in roots]
    source_paths=sorted(set().union(*(s.keys() for s in source_sets)))
    write_csv(a.out/'14_source_file_parity.csv',['path',*names,'classification'],[
      [p,*((digest(source_sets[j][p]) if p in source_sets[j] else 'MISSING') for j in range(3)),
       'COMMON_CURRENT' if all(p in s and digest(s[p])==digest(source_sets[0][p]) for s in source_sets) else 'SOURCE_DIFFERENCE']
      for p in source_paths if any(p in s for s in source_sets)])
    write_csv(a.out/'08_shared_features_to_promote.csv',['feature','source','classification','action'],[
      ['Egypt regional profile fallback','Arwa source','ARWA_BRANDING/EGYPT_CONFIG','Promote generic region resolver to shared core'],
      ['Account groups','Arwa source migration','ARWA_SHARED_CANDIDATE','Review against accounting model before promotion'],
      ['PO import trade fields','Arwa working tree migration','ARWA_SHARED_CANDIDATE','Review import trade use and schema before promotion']])
    write_csv(a.out/'09_conflicts_requiring_review.csv',['item','reason','decision'],[
      ['Mizantra deployed source has no Git SHA','Artifact deployment; provenance cannot be tied to commit','Adopt embedded build SHA for future releases'],
      ['Arwa source changes in accounting/planner/locale','Many divergent source files; business behavior not proven equivalent','Review focused acceptance flows before deployment'],
      ['Database schema','No live schema introspection performed','Obtain read-only schema metadata per tenant']])
    (a.out/'10_deployment_sha_matrix.txt').write_text('\n'.join(f'{n}: {sha(r)}' for n,r in zip(names,roots))+'\n',encoding='utf-8')
    (a.out/'11_convergence_plan.txt').write_text('Shared feature -> clean-main first -> build immutable release with SHA -> deploy same artifact to each tenant with external environment and tenant settings. Tenant extensions require a scoped flag and tests. Compare source and migration checksums before each rollout. No migration or deployment was run by this checker.\n',encoding='utf-8')
    summary={
      'features':len(FEATURES),
      'structural_presence':{n:sum(row[6+j]=='PRESENT' for row in rows) for j,n in enumerate(names)},
      'sha':{n:sha(r) for n,r in zip(names,roots)},
      'saifseas_ahead_of_mizantra': [r[0] for r in comparisons[0] if r[2]=='SAIFSEAS_NEWER'],
      'mizantra_ahead_of_arwa': [r[0] for r in comparisons[1] if r[2]=='MIZANTRA_NEWER'],
      'intentional_tenant_overrides': ['SAIFSEAS India/INR', 'MIZANTRA India/INR with Active Planner', 'ARWA Egypt/EGP/ar-EG with Arabic planner held off'],
      'unreviewed_drift': {names[j]:sum(r[2]=='REVIEW_FUNCTIONAL_DIFFERENCE' for r in comparisons[j-1]) for j in (1,2)},
      'limit':'Source evidence only; no live schema or behavioral equivalence claim',
      'out':str(a.out),
    }
    (a.out/'15_parity_summary.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(summary,indent=2))

if __name__=='__main__': main()
