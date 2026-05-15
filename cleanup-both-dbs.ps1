$tenantId = "f87a5ab0-0619-4f1c-bab9-e78ca750e56c"
$tenantFilter = "tenant_id=eq.$tenantId"

$dbs = @(
    @{ url = "https://xjiyiywzmklljrpblcqj.supabase.co/rest/v1"; key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqaXlpeXd6bWtsbGpycGJsY3FqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY0NDg2NSwiZXhwIjoyMDkxMjIwODY1fQ.pTcYd5UFUEaioFXCschrSmpQZ4gzfrFBOswmy4ALGsU"; name = "TEST" }
    @{ url = "https://nwkaruzvzwwuftjquypk.supabase.co/rest/v1"; key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q"; name = "LIVE" }
)

function Invoke-Delete {
    param($url, $h, $dbName, $table, $filter)
    try {
        Invoke-RestMethod -Method DELETE -Uri "$url/${table}?$filter" -Headers $h | Out-Null
        Write-Host "  [$dbName] OK: $table"
    } catch {
        $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { "ERR" }
        Write-Host "  [$dbName] SKIP $table ($code)"
    }
}

function Get-ParentIds {
    param($url, $h, $table, $filter)
    try {
        $rows = Invoke-RestMethod -Uri "$url/${table}?$filter&select=id" -Headers $h
        if ($rows.Count -gt 0) { return ($rows | ForEach-Object { $_.id }) -join "," }
        return $null
    } catch { return $null }
}

foreach ($db in $dbs) {
    $h = @{ apikey = $db.key; Authorization = "Bearer $($db.key)"; Prefer = "return=minimal" }
    $u = $db.url
    $n = $db.name

    Write-Host "`n========== [$n] CLEANUP START =========="

    # --- Get parent IDs for FK-child tables ---
    Write-Host "[$n] Fetching parent IDs..."
    $grnIds   = Get-ParentIds $u $h "grns" $tenantFilter
    $poIds    = Get-ParentIds $u $h "purchase_orders" $tenantFilter
    $prIds    = Get-ParentIds $u $h "purchase_requisitions" $tenantFilter
    $rfqIds   = Get-ParentIds $u $h "rfqs" $tenantFilter
    $quoteIds = Get-ParentIds $u $h "quotations" $tenantFilter
    $soIds    = Get-ParentIds $u $h "sales_orders" $tenantFilter
    $joIds    = Get-ParentIds $u $h "production_job_orders" $tenantFilter
    $uidIds   = Get-ParentIds $u $h "uid_registry" $tenantFilter
    $stIds    = Get-ParentIds $u $h "service_tickets" $tenantFilter
    $dnIds    = Get-ParentIds $u $h "debit_notes" $tenantFilter
    $dispIds  = Get-ParentIds $u $h "dispatch_notes" $tenantFilter

    # --- Delete FK children first ---
    Write-Host "[$n] Deleting child records..."
    if ($grnIds)   { Invoke-Delete $u $h $n "grn_items"               "grn_id=in.($grnIds)" }
    if ($poIds)    { Invoke-Delete $u $h $n "purchase_order_items"    "po_id=in.($poIds)" }
    if ($prIds)    { Invoke-Delete $u $h $n "purchase_requisition_items" "pr_id=in.($prIds)" }
    if ($prIds)    { Invoke-Delete $u $h $n "pr_item_rfq_vendors"     "pr_item_id=in.($prIds)" }
    if ($rfqIds)   { Invoke-Delete $u $h $n "rfq_items"               "rfq_id=in.($rfqIds)" }
    if ($quoteIds) { Invoke-Delete $u $h $n "quotation_items"         "quotation_id=in.($quoteIds)" }
    if ($soIds)    { Invoke-Delete $u $h $n "sales_order_items"       "sales_order_id=in.($soIds)" }
    if ($joIds) {
        Invoke-Delete $u $h $n "job_order_materials"   "job_order_id=in.($joIds)"
        Invoke-Delete $u $h $n "job_order_operations"  "job_order_id=in.($joIds)"
        Invoke-Delete $u $h $n "job_order_quality"     "job_order_id=in.($joIds)"
        Invoke-Delete $u $h $n "station_completions"   "job_order_id=in.($joIds)"
        Invoke-Delete $u $h $n "production_stage_logs" "job_order_id=in.($joIds)"
    }
    if ($uidIds) {
        Invoke-Delete $u $h $n "uid_deployment"        "uid_id=in.($uidIds)"
        Invoke-Delete $u $h $n "uid_lifecycle_events"  "uid_id=in.($uidIds)"
        Invoke-Delete $u $h $n "uid_hierarchy"         "parent_uid_id=in.($uidIds)"
    }
    if ($stIds) {
        Invoke-Delete $u $h $n "service_assignments"   "service_ticket_id=in.($stIds)"
        Invoke-Delete $u $h $n "service_history"       "service_ticket_id=in.($stIds)"
        Invoke-Delete $u $h $n "service_parts_used"    "service_ticket_id=in.($stIds)"
    }
    if ($dnIds)   { Invoke-Delete $u $h $n "debit_note_items"  "debit_note_id=in.($dnIds)" }
    if ($dispIds) { Invoke-Delete $u $h $n "dispatch_items"    "dispatch_note_id=in.($dispIds)" }

    # --- Delete parent transactional tables ---
    Write-Host "[$n] Deleting parent transactional tables..."
    $parentTables = @(
        "grns", "grn",
        "purchase_orders", "purchase_requisitions", "rfqs",
        "quotations", "sales_orders",
        "production_job_orders", "job_orders", "production_orders",
        "production_assemblies", "production_order_components",
        "uid_registry", "uids",
        "stock_entries", "stock_movements", "inventory_stock",
        "inventory_alerts", "stock_reservations", "inventory_movements",
        "debit_notes", "dispatch_notes",
        "service_tickets", "warranties",
        "quality_inspections", "ncr",
        "attendance_records", "leave_requests",
        "monthly_payroll", "payroll_runs", "payslips"
    )
    foreach ($t in $parentTables) {
        Invoke-Delete $u $h $n $t $tenantFilter
    }

    # --- Warehouse: keep only MAIN_WAREHOUSE ---
    Write-Host "[$n] Removing extra warehouses..."
    Invoke-Delete $u $h $n "warehouses" "tenant_id=eq.$tenantId&code=neq.MAIN_WAREHOUSE"

    Write-Host "[$n] ========== DONE =========="
}

Write-Host "`nAll cleanup complete."
