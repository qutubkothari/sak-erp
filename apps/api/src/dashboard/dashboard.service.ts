import { Injectable } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class DashboardService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    );
  }

  async getStats(tenantId: string) {
    // Get active sales orders count
    const { count: activeOrders } = await this.supabase
      .from('sales_orders')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['PENDING', 'CONFIRMED', 'IN_PRODUCTION']);

    // Get pending purchase orders count
    const { count: pendingPOs } = await this.supabase
      .from('purchase_orders')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['DRAFT', 'PENDING', 'APPROVED']);

    // Get in production count
    const { count: inProduction } = await this.supabase
      .from('production_orders')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .in('status', ['IN_PROGRESS', 'STARTED']);

    // Get ready to ship count
    const { count: readyToShip } = await this.supabase
      .from('sales_orders')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'READY_TO_SHIP');

    return {
      activeOrders: activeOrders || 0,
      pendingPOs: pendingPOs || 0,
      inProduction: inProduction || 0,
      readyToShip: readyToShip || 0,
    };
  }
}
