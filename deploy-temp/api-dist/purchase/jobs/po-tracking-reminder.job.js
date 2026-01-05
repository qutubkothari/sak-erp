"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "PoTrackingReminderJob", {
    enumerable: true,
    get: function() {
        return PoTrackingReminderJob;
    }
});
const _common = require("@nestjs/common");
const _schedule = require("@nestjs/schedule");
const _supabasejs = require("@supabase/supabase-js");
const _purchaseordersservice = require("../services/purchase-orders.service");
function _ts_decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for(var i = decorators.length - 1; i >= 0; i--)if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}
function _ts_metadata(k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
}
let PoTrackingReminderJob = class PoTrackingReminderJob {
    getSupabaseClient() {
        if (this.supabase) return this.supabase;
        this.supabase = (0, _supabasejs.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
        return this.supabase;
    }
    // Runs daily at 09:00 IST
    async sendDailyReminders() {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
            this.logger.warn('Missing SUPABASE_URL/SUPABASE_KEY; skipping reminder job');
            return;
        }
        const now = new Date();
        const nowIso = now.toISOString();
        const cutoffIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        // Use date-only comparison so reminders start the day *after* expected delivery date.
        const todayDate = nowIso.split('T')[0];
        const supabase = this.getSupabaseClient();
        // Remind only after the expected delivery date has passed (delivery_date < today)
        // and the PO was actually sent to the vendor (sent_at is set).
        // (We avoid filtering by status values here because status is an enum that can differ across DB setups.)
        const { data: nullCandidates, error: nullError } = await supabase.from('purchase_orders').select('id, tenant_id, po_number, status, tracking_number, sent_at, delivery_date, tracking_reminder_last_sent_at').not('sent_at', 'is', null).not('delivery_date', 'is', null).lt('delivery_date', todayDate).is('tracking_number', null);
        if (nullError) {
            this.logger.error(`Failed to query reminder candidates: ${nullError.message}`);
            return;
        }
        const { data: emptyCandidates, error: emptyError } = await supabase.from('purchase_orders').select('id, tenant_id, po_number, status, tracking_number, sent_at, delivery_date, tracking_reminder_last_sent_at').not('sent_at', 'is', null).not('delivery_date', 'is', null).lt('delivery_date', todayDate).eq('tracking_number', '');
        if (emptyError) {
            this.logger.error(`Failed to query reminder candidates (empty tracking): ${emptyError.message}`);
            return;
        }
        const byId = new Map();
        for (const row of Array.isArray(nullCandidates) ? nullCandidates : []){
            byId.set(row.id, row);
        }
        for (const row of Array.isArray(emptyCandidates) ? emptyCandidates : []){
            byId.set(row.id, row);
        }
        const rows = Array.from(byId.values());
        if (rows.length === 0) {
            return;
        }
        let sentCount = 0;
        for (const row of rows){
            try {
                // Do not remind for closed/cancelled states
                if (row.status === 'CANCELLED' || row.status === 'REJECTED' || row.status === 'COMPLETED' || row.status === 'CLOSED') {
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
                await supabase.from('purchase_orders').update({
                    tracking_reminder_last_sent_at: nowIso,
                    updated_at: nowIso
                }).eq('id', row.id);
                sentCount += 1;
            } catch (err) {
                this.logger.error(`Failed to send reminder for PO ${row.po_number || row.id}: ${err?.message || err}`);
            }
        }
        if (sentCount > 0) {
            this.logger.log(`Sent ${sentCount} PO tracking reminder(s)`);
        }
    }
    constructor(purchaseOrdersService){
        this.purchaseOrdersService = purchaseOrdersService;
        this.logger = new _common.Logger(PoTrackingReminderJob.name);
        this.supabase = null;
    }
};
_ts_decorate([
    (0, _schedule.Cron)('0 0 9 * * *', {
        timeZone: 'Asia/Kolkata'
    }),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", []),
    _ts_metadata("design:returntype", Promise)
], PoTrackingReminderJob.prototype, "sendDailyReminders", null);
PoTrackingReminderJob = _ts_decorate([
    (0, _common.Injectable)(),
    _ts_metadata("design:type", Function),
    _ts_metadata("design:paramtypes", [
        typeof _purchaseordersservice.PurchaseOrdersService === "undefined" ? Object : _purchaseordersservice.PurchaseOrdersService
    ])
], PoTrackingReminderJob);

//# sourceMappingURL=po-tracking-reminder.job.js.map