import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { IntelligenceService } from './intelligence.service';

@Injectable()
export class FactoryHealthScheduler {
  private readonly logger = new Logger(FactoryHealthScheduler.name);
  private readonly db: SupabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
  constructor(private readonly intelligence: IntelligenceService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { timeZone: 'Asia/Dubai' })
  async captureDailyHealth() {
    const { data: tenants, error } = await this.db.from('tenants').select('id');
    if (error) { this.logger.warn(`Factory health capture skipped: ${error.message}`); return; }
    for (const tenant of tenants || []) await this.capture(String(tenant.id));
  }

  async capture(tenantId: string) {
    const center = await this.intelligence.commandCenter(tenantId, {});
    const health = center.operating_health;
    const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dubai' });
    const { error } = await this.db.from('mizantra_factory_health_snapshots').upsert({ tenant_id: tenantId, snapshot_date: date, score: health.score, open_exceptions: health.open_exceptions, high_priority: health.high_priority, factors: health.factors || [] }, { onConflict: 'tenant_id,snapshot_date' });
    if (error) this.logger.warn(`Factory health snapshot not stored: ${error.message}`);
  }
}
