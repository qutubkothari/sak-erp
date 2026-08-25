import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { MachineTelemetryService } from './machine-telemetry.service';

@Injectable()
export class ProductionDeviceGatewayService {
  private readonly db: SupabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);
  constructor(private readonly telemetry: MachineTelemetryService) {}
  private text(value: any) { return String(value || '').trim(); }
  private hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
  async list(tenantId: string) {
    const { data, error } = await this.db.from('production_device_gateways').select('*').eq('tenant_id', tenantId).order('gateway_code');
    if (error) throw new BadRequestException(error.message);
    const now = Date.now();
    return (data || []).map((gateway: any) => ({ ...gateway, health: !gateway.last_heartbeat_at ? 'NO_HEARTBEAT' : now - new Date(gateway.last_heartbeat_at).getTime() > Number(gateway.heartbeat_seconds) * 2000 ? 'STALE' : 'HEALTHY' }));
  }
  async save(tenantId: string, userId: string, body: any) {
    const code = this.text(body.gateway_code).toUpperCase(), name = this.text(body.gateway_name), protocol = this.text(body.protocol).toUpperCase();
    if (!code || !name || !['HTTPS_WEBHOOK', 'MQTT', 'OPC_UA', 'MODBUS', 'FILE'].includes(protocol)) throw new BadRequestException('Gateway code, name and a supported protocol are required.');
    const status = this.text(body.status || 'TESTING').toUpperCase(); if (!['DRAFT', 'TESTING', 'ACTIVE', 'PAUSED', 'ERROR'].includes(status)) throw new BadRequestException('Invalid gateway status.');
    const heartbeat = Number(body.heartbeat_seconds || 300); if (!Number.isInteger(heartbeat) || heartbeat < 30 || heartbeat > 86400) throw new BadRequestException('Heartbeat must be 30 to 86400 seconds.');
    const { data, error } = await this.db.from('production_device_gateways').upsert({ tenant_id: tenantId, gateway_code: code, gateway_name: name, protocol, status, endpoint_reference: this.text(body.endpoint_reference) || null, secret_reference: this.text(body.secret_reference) || null, field_mapping: body.field_mapping || {}, heartbeat_seconds: heartbeat, is_test_mode: body.is_test_mode !== false, created_by: userId, updated_at: new Date().toISOString() }, { onConflict: 'tenant_id,gateway_code' }).select().single();
    if (error) throw new BadRequestException(error.message); return data;
  }
  async heartbeat(tenantId: string, code: string, body: any) {
    const { data, error } = await this.db.from('production_device_gateways').update({ last_heartbeat_at: new Date().toISOString(), last_event_at: body.event_received === true ? new Date().toISOString() : undefined, last_error: null, updated_at: new Date().toISOString() }).eq('tenant_id', tenantId).eq('gateway_code', this.text(code).toUpperCase()).in('status', ['TESTING', 'ACTIVE']).select().maybeSingle();
    if (error || !data) throw new BadRequestException(error?.message || 'Active/testing gateway not found.'); return data;
  }

  async rotateCredential(tenantId: string, userId: string, id: string) {
    const publicKeyId = `gw_${randomBytes(12).toString('hex')}`; const secret = randomBytes(32).toString('base64url');
    const { data, error } = await this.db.from('production_device_gateways').update({ public_key_id: publicKeyId, api_key_hash: this.hash(secret), updated_at: new Date().toISOString(), created_by: userId }).eq('tenant_id', tenantId).eq('id', id).select('id,gateway_code,gateway_name,public_key_id,status').maybeSingle();
    if (error || !data) throw new BadRequestException(error?.message || 'Gateway not found.');
    return { gateway: data, api_key: secret, warning: 'Copy this key now. Mizantra stores only its hash and cannot display it again.' };
  }

  private authenticate(storedHash: string, supplied: string) {
    const actual = Buffer.from(this.hash(supplied), 'hex'); const expected = Buffer.from(storedHash || '', 'hex');
    return actual.length === expected.length && actual.length > 0 && timingSafeEqual(actual, expected);
  }

  private mapped(payload: Record<string, any>, mapping: Record<string, any>) {
    const output: Record<string, any> = {};
    for (const [target, source] of Object.entries(mapping || {})) if (typeof source === 'string' && Object.prototype.hasOwnProperty.call(payload, source)) output[target] = payload[source];
    return { ...payload, ...output };
  }

  async ingestExternal(publicKeyId: string, apiKey: string, body: any) {
    if (!publicKeyId || !apiKey) throw new UnauthorizedException('Gateway identity and API key are required.');
    const { data: gateway, error } = await this.db.from('production_device_gateways').select('*').eq('public_key_id', publicKeyId).in('status', ['TESTING', 'ACTIVE']).maybeSingle();
    if (error || !gateway || !this.authenticate(String(gateway.api_key_hash || ''), apiKey)) throw new UnauthorizedException('Gateway authentication failed.');
    const sourceEventId = this.text(body?.source_event_id); const eventType = this.text(body?.event_type).toUpperCase();
    if (!sourceEventId || sourceEventId.length > 120 || !eventType || eventType.length > 80) throw new BadRequestException('A bounded source event ID and event type are required.');
    const occurredAt = body?.occurred_at ? new Date(body.occurred_at) : new Date(); if (Number.isNaN(occurredAt.getTime()) || Math.abs(Date.now() - occurredAt.getTime()) > 31 * 86400000) throw new BadRequestException('Event timestamp is invalid or outside the 31-day acceptance window.');
    const rawPayload = body?.payload && typeof body.payload === 'object' && !Array.isArray(body.payload) ? body.payload : {};
    const serialized = JSON.stringify(rawPayload); if (serialized.length > 65536) throw new BadRequestException('Gateway payload exceeds 64 KB.');
    const normalized = this.mapped(rawPayload, gateway.field_mapping || {});
    const transactionIntent = ['RUN','IDLE','STOP','COUNT','QUALITY','ENERGY','CONDITION'].includes(eventType) ? 'MACHINE_TELEMETRY' : ['MATERIAL_SCAN','FINISHED_SCAN','REJECTION','DISPATCH_SCAN'].includes(eventType) ? eventType : 'REVIEW';
    const record = { tenant_id: gateway.tenant_id, gateway_id: gateway.id, source_event_id: sourceEventId, event_type: eventType, occurred_at: occurredAt.toISOString(), payload_hash: this.hash(serialized), normalized_event: normalized, transaction_intent: transactionIntent, status: transactionIntent === 'MACHINE_TELEMETRY' ? 'VALIDATED' : 'REVIEW_REQUIRED' };
    const { data: inbox, error: insertError } = await this.db.from('mizantra_connector_inbox').upsert(record, { onConflict: 'tenant_id,gateway_id,source_event_id', ignoreDuplicates: true }).select().maybeSingle();
    if (insertError) throw new BadRequestException(insertError.message);
    if (!inbox) return { duplicate: true, source_event_id: sourceEventId };
    let native: any = null;
    if (transactionIntent === 'MACHINE_TELEMETRY') {
      try {
        native = await this.telemetry.ingest(gateway.tenant_id, { ...normalized, event_type: eventType, source_event_id: `${gateway.gateway_code}:${sourceEventId}`, occurred_at: occurredAt.toISOString() });
        await this.db.from('mizantra_connector_inbox').update({ status: 'PROCESSED', native_resource_type: 'PRODUCTION_MACHINE_EVENT', native_resource_id: native?.event?.id || null, processed_at: new Date().toISOString() }).eq('tenant_id', gateway.tenant_id).eq('id', inbox.id);
      } catch (nativeError: any) {
        await this.db.from('mizantra_connector_inbox').update({ status: 'FAILED', failure_reason: String(nativeError?.message || 'Telemetry processing failed').slice(0, 500), processed_at: new Date().toISOString() }).eq('tenant_id', gateway.tenant_id).eq('id', inbox.id);
        throw nativeError;
      }
    }
    await this.db.from('production_device_gateways').update({ last_heartbeat_at: new Date().toISOString(), last_event_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString() }).eq('tenant_id', gateway.tenant_id).eq('id', gateway.id);
    return { accepted: true, inbox_id: inbox.id, status: transactionIntent === 'MACHINE_TELEMETRY' ? 'PROCESSED' : 'REVIEW_REQUIRED', transaction_intent: transactionIntent, native };
  }
}
