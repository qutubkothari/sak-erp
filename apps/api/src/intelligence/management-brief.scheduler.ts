import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IntelligenceService } from './intelligence.service';

@Injectable()
export class ManagementBriefScheduler {
  private readonly logger = new Logger(ManagementBriefScheduler.name);
  private readonly db: SupabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
  constructor(private readonly intelligence: IntelligenceService) {}

  @Cron('5 0 * * *', { timeZone: 'Asia/Dubai' })
  async captureDailyBriefs() {
    const { data: tenants, error } = await this.db.from('tenants').select('id');
    if (error) { this.logger.warn(`Management brief capture skipped: ${error.message}`); return; }
    for (const tenant of tenants || []) await this.capture(String(tenant.id));
  }

  async capture(tenantId: string) {
    const brief = await this.intelligence.dailyBrief(tenantId, {});
    const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dubai' });
    const { error } = await this.db.from('mizantra_management_brief_snapshots').upsert({
      tenant_id: tenantId, snapshot_date: date, brief, health_score: brief.operating_health?.score ?? null,
      decision_count: brief.decisions_required?.length || 0, updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id,snapshot_date' });
    if (error) this.logger.warn(`Management brief snapshot not stored: ${error.message}`);
  }
}
