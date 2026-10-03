import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { createClient } from '@supabase/supabase-js';
import { AuthService } from '../auth/auth.service';
import { ProactiveOperationsService } from './proactive-operations.service';
import { proactiveFlags } from './proactive-operations.registry';

@Injectable()
export class ProactiveOperationsScheduler {
  private readonly logger = new Logger(ProactiveOperationsScheduler.name);
  private readonly db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY!);
  private running = false;
  constructor(private readonly auth: AuthService, private readonly operations: ProactiveOperationsService) {}
  @Cron('*/5 * * * *')
  async tick() {
    if (!proactiveFlags().daily_brief || this.running) return;
    this.running = true;
    try {
      for (let offset = 0; offset < 2000; offset += 100) {
        const users = await this.db.from('users').select('id,tenant_id').eq('is_active', true).order('id').range(offset, offset + 99).abortSignal(AbortSignal.timeout(15000));
        if (users.error) throw new Error('SCHEDULE_USER_SOURCE_UNAVAILABLE');
        for (const actor of users.data || []) {
          try {
            const user = await this.auth.validateUser(actor.id, actor.tenant_id);
            if (!user || !await this.operations.due(user)) continue;
            await this.operations.refresh(user);
            await this.operations.brief(user);
          } catch { this.logger.warn('A scoped in-app briefing could not be generated; no business action was taken.'); }
        }
        if ((users.data || []).length < 100) break;
      }
    } catch { this.logger.warn('In-app briefing schedule source is unavailable.'); }
    finally { this.running = false; }
  }
}