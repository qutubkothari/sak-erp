export function shouldCreateAutoEngineerIncident(mode:string,eligible:boolean,linkedIncident:string|null|undefined){return mode==='INCIDENT'&&eligible&&!linkedIncident;}
export function nextOccurrence(previous:number){return Math.max(1,Number(previous)||1)+1;}
export function shouldResolveFinding(checkCompleted:boolean,fingerprintSeen:boolean,status:string){return checkCompleted&&!fingerprintSeen&&['OPEN','ACKNOWLEDGED'].includes(status);}
export function workerIsStale(enabled:boolean,heartbeatAt:string|null|undefined,now=Date.now(),thresholdMs=90_000){if(!enabled)return false;if(!heartbeatAt)return true;const parsed=Date.parse(heartbeatAt);return !Number.isFinite(parsed)||now-parsed>thresholdMs;}
export function isAutoQaAdmin(user:any){if(!user)return false;const roles=[...(Array.isArray(user?.roles)?user.roles:[]),user?.role].map((r:any)=>String(r?.role?.name??r?.name??r??'').toUpperCase());return roles.some(r=>['ADMIN','TENANT_ADMIN','COMPANY_ADMIN','SUPER_ADMIN'].includes(r));}
