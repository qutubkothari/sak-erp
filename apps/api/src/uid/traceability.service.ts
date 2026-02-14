import { Injectable } from '@nestjs/common';
import { UidSupabaseService } from './services/uid-supabase.service';

export interface TraceabilityRecord {
  uid: string;
  part_code: string;
  part_name: string;
  product_category: string;
  supplier_name: string;
  supplier_code: string;
  supplier_gst: string;
  invoice_number: string;
  invoice_date: string;
  grn_number: string;
  grn_date: string;
  work_order_number: string;
  work_order_status: string;
  work_order_quantity: number;
  work_order_start_date: string;
  work_order_completion_date: string;
  assembly_item_code: string;
  assembly_name: string;
  level: number;
  usage_type: string;
  work_order_path: string[];
  report_generated_at: string;
}

export interface GrnTraceability {
  uid: string;
  part_code: string;
  part_name: string;
  quantity_received: number;
  supplier_name: string;
  invoice_number: string;
  highest_assembly_level: number;
  final_assemblies: string[];
}

export interface WorkOrderMaterialTraceability {
  material_uid: string;
  material_part_code: string;
  material_part_name: string;
  supplier_name: string;
  grn_number: string;
  invoice_number: string;
  source_job_order: string;
  assembly_produced: string;
  produced_quantity: number;
}

@Injectable()
export class TraceabilityService {
  constructor(private readonly uidSupabaseService: UidSupabaseService) {}

  /**
   * Get full traceability for a specific UID
   */
  async getUidTraceability(uid: string, tenantId: string): Promise<TraceabilityRecord[]> {
    const { data, error } = await this.uidSupabaseService.client
      .rpc('get_uid_traceability', {
        p_uid: uid,
        p_tenant_id: tenantId,
      });

    if (error) {
      throw new Error(`Failed to fetch UID traceability: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get traceability for all UIDs from a specific GRN
   */
  async getGrnTraceability(grnNumber: string, tenantId: string): Promise<GrnTraceability[]> {
    const { data, error } = await this.uidSupabaseService.client
      .rpc('get_grn_uids_traceability', {
        p_grn_number: grnNumber,
        p_tenant_id: tenantId,
      });

    if (error) {
      throw new Error(`Failed to fetch GRN traceability: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get material traceability for a specific Work Order
   */
  async getWorkOrderTraceability(
    workOrderNumber: string,
    tenantId: string,
  ): Promise<WorkOrderMaterialTraceability[]> {
    const { data, error } = await this.uidSupabaseService.client
      .rpc('get_work_order_material_traceability', {
        p_work_order_number: workOrderNumber,
        p_tenant_id: tenantId,
      });

    if (error) {
      throw new Error(`Failed to fetch work order traceability: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get full traceability report with filters
   */
  async getTraceabilityReport(tenantId: string, filters: any): Promise<{
    data: TraceabilityRecord[];
    total: number;
    limit: number;
    offset: number;
  }> {
    let query = this.uidSupabaseService.client
      .from('uid_traceability_report')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId);

    // Apply filters
    if (filters.uid) {
      query = query.eq('uid', filters.uid);
    }
    if (filters.part_code) {
      query = query.ilike('part_code', `%${filters.part_code}%`);
    }
    if (filters.supplier_name) {
      query = query.ilike('supplier_name', `%${filters.supplier_name}%`);
    }
    if (filters.grn_number) {
      query = query.eq('grn_number', filters.grn_number);
    }
    if (filters.work_order_number) {
      query = query.eq('work_order_number', filters.work_order_number);
    }
    if (filters.assembly_name) {
      query = query.ilike('assembly_name', `%${filters.assembly_name}%`);
    }
    if (filters.level !== undefined) {
      query = query.eq('level', filters.level);
    }
    if (filters.from_date) {
      query = query.gte('grn_date', filters.from_date);
    }
    if (filters.to_date) {
      query = query.lte('grn_date', filters.to_date);
    }

    // Apply pagination
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;
    query = query.range(offset, offset + limit - 1);

    // Order by UID and level
    query = query.order('uid').order('level');

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch traceability report: ${error.message}`);
    }

    return {
      data: data || [],
      total: count || 0,
      limit,
      offset,
    };
  }

  /**
   * Export traceability report as CSV or Excel
   */
  async exportReport(
    tenantId: string,
    filters: any,
    format: 'csv' | 'excel',
  ): Promise<{ data: string; filename: string; contentType: string }> {
    // Get all data without pagination
    const result = await this.getTraceabilityReport(tenantId, {
      ...filters,
      limit: 10000,
      offset: 0,
    });

    const records = result.data;

    if (format === 'csv') {
      const csv = this.convertToCSV(records);
      return {
        data: csv,
        filename: `traceability-report-${new Date().toISOString().split('T')[0]}.csv`,
        contentType: 'text/csv',
      };
    } else {
      // For Excel, you would use a library like xlsx
      // This is a placeholder - implement with xlsx package
      throw new Error('Excel export not yet implemented');
    }
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(records: TraceabilityRecord[]): string {
    if (records.length === 0) {
      return '';
    }

    // Define headers
    const headers = [
      'UID',
      'Part Code',
      'Part Name',
      'Product Category',
      'Supplier Name',
      'Supplier Code',
      'Invoice Number',
      'Invoice Date',
      'GRN Number',
      'GRN Date',
      'Work Order Number',
      'Work Order Status',
      'Assembly Name',
      'Level',
      'Usage Type',
      'Work Order Path',
    ];

    // Create CSV rows
    const rows = records.map(record => [
      record.uid,
      record.part_code,
      record.part_name,
      record.product_category,
      record.supplier_name || '',
      record.supplier_code || '',
      record.invoice_number || '',
      record.invoice_date || '',
      record.grn_number || '',
      record.grn_date || '',
      record.work_order_number || '',
      record.work_order_status || '',
      record.assembly_name || '',
      record.level,
      record.usage_type,
      record.work_order_path ? record.work_order_path.join(' → ') : '',
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(field => `"${field}"`).join(',')),
    ].join('\n');

    return csvContent;
  }

  /**
   * Get traceability statistics
   */
  async getTraceabilityStats(tenantId: string): Promise<{
    total_uids: number;
    uids_from_grn: number;
    uids_from_job_orders: number;
    uids_in_assemblies: number;
    multi_level_assemblies: number;
  }> {
    const { data, error } = await this.uidSupabaseService.client.rpc('exec_sql', {
      sql: `
        SELECT 
          COUNT(DISTINCT uid) as total_uids,
          COUNT(DISTINCT CASE WHEN grn_number IS NOT NULL THEN uid END) as uids_from_grn,
          COUNT(DISTINCT CASE WHEN work_order_number IS NOT NULL AND level = 0 THEN uid END) as uids_from_job_orders,
          COUNT(DISTINCT CASE WHEN level > 0 THEN uid END) as uids_in_assemblies,
          COUNT(DISTINCT CASE WHEN level > 1 THEN uid END) as multi_level_assemblies
        FROM uid_traceability_report
        WHERE tenant_id = '${tenantId}'
      `,
    });

    if (error) {
      throw new Error(`Failed to fetch traceability stats: ${error.message}`);
    }

    return data?.[0] || {
      total_uids: 0,
      uids_from_grn: 0,
      uids_from_job_orders: 0,
      uids_in_assemblies: 0,
      multi_level_assemblies: 0,
    };
  }
}
