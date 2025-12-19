import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PurchaseOrdersService } from '../services/purchase-orders.service';

@Injectable()
export class PoTrackingReminderJob {
  private readonly logger = new Logger(PoTrackingReminderJob.name);
  private supabase: SupabaseClient | null = null;

  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {
  }

  private getSupabaseClient() {
    if (this.supabase) return this.supabase;
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!,
    );
    return this.supabase;
  }

  // Runs daily at 09:00 IST
  @Cron('0 0 9 * * *', { timeZone: 'Asia/Kolkata' })
  async sendDailyReminders() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
      this.logger.warn('Missing SUPABASE_URL/SUPABASE_KEY; skipping reminder job');
      return;
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const cutoffIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const supabase = this.getSupabaseClient();

    // Only POs with sent_at <= 24h ago and still have no tracking number.
    // (We avoid filtering by status values here because status is an enum that can differ across DB setups.)
    const { data: nullCandidates, error: nullError } = await supabase
      .from('purchase_orders')
      .select(
        'id, tenant_id, po_number, status, tracking_number, sent_at, tracking_reminder_last_sent_at',
      )
      .lte('sent_at', cutoffIso)
      .not('sent_at', 'is', null)
      .is('tracking_number', null);

    if (nullError) {
      this.logger.error(`Failed to query reminder candidates: ${nullError.message}`);
      return;
    }

    const { data: emptyCandidates, error: emptyError } = await supabase
      .from('purchase_orders')
      .select(
        'id, tenant_id, po_number, status, tracking_number, sent_at, tracking_reminder_last_sent_at',
      )
      .lte('sent_at', cutoffIso)
      .not('sent_at', 'is', null)
      .eq('tracking_number', '');

    if (emptyError) {
      this.logger.error(`Failed to query reminder candidates (empty tracking): ${emptyError.message}`);
      return;
    }

    const byId = new Map<string, any>();
    for (const row of Array.isArray(nullCandidates) ? nullCandidates : []) {
      byId.set(row.id, row);
    }
    for (const row of Array.isArray(emptyCandidates) ? emptyCandidates : []) {
      byId.set(row.id, row);
    }

    const rows = Array.from(byId.values());
    if (rows.length === 0) {
      return;
    }

    let sentCount = 0;

    for (const row of rows) {
      try {
        // Do not remind for closed/cancelled states
        if (
          row.status === 'CANCELLED' ||
          row.status === 'REJECTED' ||
          row.status === 'COMPLETED' ||
          row.status === 'CLOSED'
        ) {
          continue;
        }

        // Safety: only 1 reminder per day per PO
        if (row.tracking_reminder_last_sent_at) {
          const lastSent = new Date(row.tracking_reminder_last_sent_at).getTime();
          if (Number.isFinite(lastSent) && lastSent > new Date(cutoffIso).getTime()) {
            continue;
          }
        }

        await this.purchaseOrdersService.sendTrackingReminder(row.tenant_id, row.id);

        await supabase
          .from('purchase_orders')
          .update({
            tracking_reminder_last_sent_at: nowIso,
            updated_at: nowIso,
          })
          .eq('id', row.id);

        sentCount += 1;
      } catch (err: any) {
        this.logger.error(
          `Failed to send reminder for PO ${row.po_number || row.id}: ${err?.message || err}`,
        );
      }
    }

    if (sentCount > 0) {
      this.logger.log(`Sent ${sentCount} PO tracking reminder(s)`);
    }
  }
}
