import type { AskListContext, BrainEnvelope } from './brain-context';

export type DrawerScope = { profile: string; tenant_id: string; current_user_id: string };
export type AttentionHandoff = { source: 'PROACTIVE_OPERATIONS'; action: 'WHY' | 'VIEW' | 'DATA_DOCTOR' | 'REPORT_BUILDER' | 'PREPARE_PR_PLAN'; attention_id: string; entity_type?: string; entity_id?: string; entity_reference?: string; tenant?: string; profile?: string; owner_id?: string; current_route?: string; category?: string; executable?: false };
export type DrawerOrigin = { current_route: string; entity_type?: string; entity_id?: string; view?: 'ALL' | 'OPEN_PO' };
export type DrawerReportRef = { type: 'REPORT'; id: string; saved_report_id?: string };
export type DrawerSession = { session_id: string; session_version: number; conversation_id?: string; context_ref?: DrawerReportRef; origin: DrawerOrigin; expires_at: number; status: 'ACTIVE' | 'SUSPENDED' };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const lifetime = 86400000;

function key(scope: DrawerScope) {
  if (!['SAIFSEAS','MIZANTRA','ARWA'].includes(scope.profile) || !uuid.test(scope.tenant_id) || !uuid.test(scope.current_user_id)) throw new Error('Authenticated drawer scope is required.');
  return `mizantra-unified-drawer:${scope.profile}:${scope.tenant_id}:${scope.current_user_id}`;
}
export function drawerOrigin(route: string, entity: BrainEnvelope | null, list: AskListContext | null): DrawerOrigin {
  if (['/dashboard/active-planner','/dashboard/active-planner/attention'].includes(route)) return {current_route:route};
  return {current_route:route,...(entity ? {entity_type:entity.entity_type,entity_id:entity.entity_id} : list ? {view:list.view} : {})};
}
export function attentionTaskEpoch(storage: Pick<Storage,'getItem'>, scope: DrawerScope) {
  return storage.getItem(key(scope).replace('mizantra-unified-drawer:', 'mizantra-unified-task-epoch:')) || '0';
}
export function beginAttentionTask(storage: Pick<Storage,'getItem' | 'setItem' | 'removeItem'>, scope: DrawerScope) {
  const value = Number(attentionTaskEpoch(storage, scope));
  storage.setItem(key(scope).replace('mizantra-unified-drawer:', 'mizantra-unified-task-epoch:'), String(Number.isSafeInteger(value) ? value + 1 : 1));
  clearDrawerSession(storage, scope);
}
export function hasExplicitAttentionEntry(search: string) {
  let explicit = false;
  new URLSearchParams(search).forEach((_value, name) => { explicit ||= name.startsWith('attention_'); });
  return explicit;
}
export function attentionEntry(search: string): AttentionHandoff | null {
  const query = new URLSearchParams(search), id = query.get('attention_handoff'), action = query.get('attention_action');
  if (!id || !uuid.test(id) || !action || !['WHY','VIEW','DATA_DOCTOR','REPORT_BUILDER','PREPARE_PR_PLAN'].includes(action)) return null;
  return {source:'PROACTIVE_OPERATIONS',attention_id:id,action:action as AttentionHandoff['action']};
}
export function consumedAttentionUrl(href: string) {
  const url = new URL(href);
  const names: string[] = [];
  url.searchParams.forEach((_value, name) => { if (name.startsWith('attention_')) names.push(name); });
  names.forEach(name => url.searchParams.delete(name));
  return url.pathname + url.search + url.hash;
}
export function drawerOriginKey(origin: DrawerOrigin) {
  return `${origin.current_route}|${origin.entity_id ? `${origin.entity_type}:${origin.entity_id}` : ''}|${origin.view || ''}`;
}
export function readDrawerSession(storage: Pick<Storage,'getItem' | 'removeItem'>, scope: DrawerScope, origin: DrawerOrigin, now = Date.now()): DrawerSession | null {
  const storageKey = key(scope);
  try {
    const value = JSON.parse(storage.getItem(storageKey) || 'null');
    if (!value) return null;
    if (!uuid.test(value.session_id) || !Number.isInteger(value.session_version) || value.session_version < 1 || !Number.isFinite(value.expires_at) || value.expires_at <= now || value.expires_at > now + lifetime || !['ACTIVE','SUSPENDED'].includes(value.status) || !value.origin || drawerOriginKey(value.origin) !== drawerOriginKey(origin) || (value.conversation_id && !uuid.test(value.conversation_id)) || (value.context_ref && (value.context_ref.type !== 'REPORT' || !uuid.test(value.context_ref.id) || (value.context_ref.saved_report_id && !uuid.test(value.context_ref.saved_report_id))))) {
      storage.removeItem(storageKey);
      return null;
    }
    return {session_id:value.session_id,session_version:value.session_version,conversation_id:value.conversation_id,context_ref:value.context_ref ? {type:'REPORT',id:value.context_ref.id,...(value.context_ref.saved_report_id ? {saved_report_id:value.context_ref.saved_report_id} : {})} : undefined,origin,expires_at:value.expires_at,status:value.status};
  } catch {
    storage.removeItem(storageKey);
    return null;
  }
}
export function writeDrawerSession(storage: Pick<Storage,'getItem' | 'setItem' | 'removeItem'>, scope: DrawerScope, origin: DrawerOrigin, pointer: Pick<DrawerSession,'session_id' | 'session_version' | 'conversation_id' | 'context_ref'>, now = Date.now()) {
  if (!uuid.test(pointer.session_id) || !Number.isInteger(pointer.session_version) || pointer.session_version < 1) return;
  const previous = readDrawerSession(storage, scope, origin, now);
  const value: DrawerSession = {session_id:pointer.session_id,session_version:pointer.session_version,...(pointer.conversation_id && uuid.test(pointer.conversation_id) ? {conversation_id:pointer.conversation_id} : {}),...(pointer.context_ref ? {context_ref:{type:'REPORT',id:pointer.context_ref.id,...(pointer.context_ref.saved_report_id ? {saved_report_id:pointer.context_ref.saved_report_id} : {})}} : {}),origin,expires_at:previous?.session_id === pointer.session_id && previous.session_version === pointer.session_version ? previous.expires_at : now + lifetime,status:'ACTIVE'};
  storage.setItem(key(scope), JSON.stringify(value));
}
export function clearDrawerSession(storage: Pick<Storage,'removeItem'>, scope: DrawerScope) {
  storage.removeItem(key(scope));
}
export function suspendDrawerSession(storage: Pick<Storage,'getItem' | 'setItem' | 'removeItem'>, scope: DrawerScope, origin: DrawerOrigin) {
  const value = readDrawerSession(storage, scope, origin);
  if (value) storage.setItem(key(scope), JSON.stringify({...value,status:'SUSPENDED'}));
}