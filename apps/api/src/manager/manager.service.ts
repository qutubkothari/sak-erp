import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

interface PendingApproval {
  id: string;
  number: string;
  type: 'PR' | 'PO' | 'GRN' | 'JO' | 'QC';
  requestedBy: string;
  requestedDate: string;
  amount?: number;
  status: string;
  priority?: string;
}

@Injectable()
export class ManagerService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('SUPABASE_URL and SUPABASE_KEY must be set');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async getPendingApprovals(tenantId: string, managerId: string): Promise<PendingApproval[]> {
    const approvals: PendingApproval[] = [];

    try {
      // Get manager's email to find subordinates
      const { data: manager } = await this.supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', managerId)
        .eq('tenant_id', tenantId)
        .single();

      if (!manager) {
        return [];
      }

      // Get all employees to find potential subordinates
      // For now, we'll show all pending approvals in the tenant
      // TODO: Add reporting_manager_id field to employees table for proper hierarchy

      // 1. Purchase Requisitions (SUBMITTED status)
      const { data: prs } = await this.supabase
        .from('purchase_requisitions')
        .select(`
          id,
          pr_number,
          created_at,
          status,
          priority,
          requested_by,
          users!purchase_requisitions_requested_by_fkey(first_name, last_name, email)
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'SUBMITTED')
        .order('created_at', { ascending: false });

      if (prs) {
        for (const pr of prs) {
          const user = (pr as any).users;
          approvals.push({
            id: pr.id,
            number: pr.pr_number,
            type: 'PR',
            requestedBy: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : 'Unknown',
            requestedDate: pr.created_at,
            status: pr.status,
            priority: pr.priority,
          });
        }
      }

      // 2. Purchase Orders (PENDING status)
      const { data: pos } = await this.supabase
        .from('purchase_orders')
        .select(`
          id,
          po_number,
          created_at,
          pr_po_status,
          total_amount,
          created_by,
          users!purchase_orders_created_by_fkey(first_name, last_name, email)
        `)
        .eq('tenant_id', tenantId)
        .eq('pr_po_status', 'PENDING')
        .order('created_at', { ascending: false });

      if (pos) {
        for (const po of pos) {
          const user = (po as any).users;
          approvals.push({
            id: po.id,
            number: po.po_number,
            type: 'PO',
            requestedBy: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : 'Unknown',
            requestedDate: po.created_at,
            amount: po.total_amount,
            status: po.pr_po_status,
          });
        }
      }

      // 3. GRNs (DRAFT status - awaiting QC or approval)
      const { data: grns } = await this.supabase
        .from('grns')
        .select(`
          id,
          grn_number,
          created_at,
          status,
          total_amount,
          created_by,
          users!grns_created_by_fkey(first_name, last_name, email)
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'DRAFT')
        .order('created_at', { ascending: false });

      if (grns) {
        for (const grn of grns) {
          const user = (grn as any).users;
          approvals.push({
            id: grn.id,
            number: grn.grn_number,
            type: 'GRN',
            requestedBy: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : 'Unknown',
            requestedDate: grn.created_at,
            amount: grn.total_amount,
            status: grn.status,
          });
        }
      }

      // 4. Job Orders (PENDING or DRAFT status)
      const { data: jos } = await this.supabase
        .from('job_orders')
        .select(`
          id,
          job_order_number,
          created_at,
          status,
          created_by,
          users!job_orders_created_by_fkey(first_name, last_name, email)
        `)
        .eq('tenant_id', tenantId)
        .in('status', ['PENDING', 'DRAFT'])
        .order('created_at', { ascending: false });

      if (jos) {
        for (const jo of jos) {
          const user = (jo as any).users;
          approvals.push({
            id: jo.id,
            number: jo.job_order_number,
            type: 'JO',
            requestedBy: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : 'Unknown',
            requestedDate: jo.created_at,
            status: jo.status,
          });
        }
      }

      // 5. QC (UIDs with PENDING quality_status)
      const { data: qcUids } = await this.supabase
        .from('uid_registry')
        .select(`
          id,
          uid,
          created_at,
          quality_status,
          job_order_id,
          job_orders!uid_registry_job_order_id_fkey(
            job_order_number,
            created_by,
            users!job_orders_created_by_fkey(first_name, last_name, email)
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('quality_status', 'PENDING')
        .order('created_at', { ascending: false })
        .limit(50); // Limit QC items to avoid too many

      if (qcUids) {
        // Group by job order
        const qcByJobOrder = new Map<string, any[]>();
        for (const qc of qcUids) {
          const jo = (qc as any).job_orders;
          if (jo) {
            const key = jo.job_order_number;
            if (!qcByJobOrder.has(key)) {
              qcByJobOrder.set(key, []);
            }
            qcByJobOrder.get(key)?.push(qc);
          }
        }

        // Add one entry per job order with pending QC
        for (const [joNumber, items] of qcByJobOrder) {
          const firstItem = items[0];
          const jo = (firstItem as any).job_orders;
          const user = jo?.users;
          
          approvals.push({
            id: firstItem.id,
            number: `${joNumber} (${items.length} UIDs)`,
            type: 'QC',
            requestedBy: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email : 'Unknown',
            requestedDate: firstItem.created_at,
            status: firstItem.quality_status,
          });
        }
      }

      // Sort by date descending
      approvals.sort((a, b) => new Date(b.requestedDate).getTime() - new Date(a.requestedDate).getTime());

      return approvals;
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      return [];
    }
  }
}
