import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash, randomUUID } from 'crypto';
import ExcelJS from 'exceljs';
import { hasAdminBypass, hasSuperAdminBypass } from '../auth/utils/permission-utils';
import { SupabaseStorageService } from '../documents/services/supabase-storage.service';
import { buildEntityDrafts, classifyTransactionalSheet, fuzzyNameCandidates, normalizeKey, parseWorkbook, preserveUnknownBusinessValues, rowFingerprint, SmartImportMapping } from './smart-import.analysis';

const MASTER_TABLE: Record<string, { table: string; nameField: string; codeField?: string; allowed: string[] }> = {
  SUPPLIER: { table: 'vendors', nameField: 'name', codeField: 'code', allowed: ['name','code','legal_name','tax_id','gst_number','pan_number','contact_person','email','phone','address','city','state','country','pincode','shipping_country','payment_terms','credit_days','credit_limit','bank_name','bank_account','bank_account_type','bank_ifsc','bank_ifsc_code','category'] },
  SUPPLIER_CONTACT: { table: 'vendors', nameField: 'name', allowed: ['contact_person'] },
  ITEM: { table: 'items', nameField: 'name', codeField: 'code', allowed: ['name','code','description','category','uom','hsn_code','hsn_sac_code','item_type'] },
  RAW_MATERIAL: { table: 'items', nameField: 'name', codeField: 'code', allowed: ['name','code','description','category','uom','hsn_code','hsn_sac_code','item_type'] },
  FINISHED_GOOD: { table: 'items', nameField: 'name', codeField: 'code', allowed: ['name','code','description','category','uom','hsn_code','hsn_sac_code','item_type'] },
  CUSTOMER: { table: 'customers', nameField: 'customer_name', codeField: 'customer_code', allowed: ['customer_name','customer_code','contact_person','email','phone','mobile','gst_number','pan_number','billing_address','shipping_address','city','state','country','pincode','credit_days','credit_limit','tax_treatment','customer_type','contacts','billing_addresses','shipping_addresses'] },
};
const ALLOWED_USER_DECISIONS = new Set(['CREATE','USE_EXISTING']);
const SYSTEM_REQUIRED = new Set(['tenant_id']);
const rowHash = (value: unknown) => createHash('sha256').update(String(value ?? '')).digest('hex');
const safeJson = (value: any) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const stableJson = (value: unknown): string => JSON.stringify(value, Object.keys((value && typeof value === 'object' && !Array.isArray(value)) ? value as object : {}).sort());
const identifier = (value: string) => `"${value.replace(/"/g, '""')}"`;

@Injectable()
export class SmartImportService {
  private readonly logger = new Logger(SmartImportService.name);
  private readonly db: SupabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY!);
  private pool: any;
  constructor(private readonly storage: SupabaseStorageService) {}

  private profile() { const profile=String(process.env.ERP_TENANT_PROFILE||'').toUpperCase(); if(!['SAIFSEAS','MIZANTRA','ARWA'].includes(profile))throw new ForbiddenException('Smart Import is not configured for this ERP profile.');return profile; }
  private assertEnabled() { if(String(process.env.SMART_IMPORT_ENABLED||'false').toLowerCase()!=='true')throw new ConflictException('Smart Import is not enabled for this profile.'); }
  private actorId(user:any):string { const id=String(user?.userId||user?.id||user?.sub||'');if(!/^[0-9a-f-]{36}$/i.test(id))throw new ForbiddenException('Authenticated user is required.');return id; }
  private tenantId(user:any):string { const id=String(user?.tenantId||user?.tenant_id||'');if(!/^[0-9a-f-]{36}$/i.test(id))throw new ForbiddenException('A current tenant is required.');return id; }
  private assertAdmin(user:any) { if(!hasAdminBypass(user))throw new ForbiddenException('A privileged admin must approve or administer Smart Import.'); }
  private pg() {
    if(this.pool)return this.pool;
    const connectionString=process.env.DIRECT_URL||process.env.DATABASE_URL;
    if(!connectionString)throw new ServiceUnavailableException('Smart Import database configuration is unavailable.');
    const {Pool}=require('pg');
    this.pool=new Pool({connectionString,ssl:{rejectUnauthorized:false},max:4,connectionTimeoutMillis:10000,statement_timeout:30000});
    return this.pool;
  }
  private async audit(batch:any,user:any,eventType:string,details:Record<string,unknown>={}) {
    const {error}=await this.db.from('smart_import_audit_events').insert({batch_id:batch.id,tenant_id:batch.tenant_id,actor_id:this.actorId(user),event_type:eventType,details});
    if(error)throw new ServiceUnavailableException('Smart Import audit record could not be saved.');
    const latest=await this.db.from('smart_import_batches').select('audit_log').eq('id',batch.id).eq('tenant_id',batch.tenant_id).single();
    const log=[...(Array.isArray(latest.data?.audit_log)?latest.data.audit_log:[]),{event:eventType,actorId:this.actorId(user),at:new Date().toISOString(),details}].slice(-200);
    const update=await this.db.from('smart_import_batches').update({audit_log:log,updated_at:new Date().toISOString()}).eq('id',batch.id).eq('tenant_id',batch.tenant_id);
    if(update.error)throw new ServiceUnavailableException('Smart Import audit record could not be saved.');
  }
  private async ownedBatch(user:any,id:string) {
    const tenantId=this.tenantId(user);const {data,error}=await this.db.from('smart_import_batches').select('*').eq('id',id).eq('tenant_id',tenantId).eq('profile',this.profile()).maybeSingle();
    if(error||!data)throw new NotFoundException('Smart Import batch not found.');return data;
  }
  private async rows(batch:any) {
    const {data,error}=await this.db.from('smart_import_batch_rows').select('*').eq('batch_id',batch.id).eq('tenant_id',batch.tenant_id).order('source_row',{ascending:true});
    if(error)throw new ServiceUnavailableException('Import preview could not be loaded.');return data||[];
  }

  async upload(user:any,file:Express.Multer.File,instructionRaw:string) {
    this.assertEnabled();const tenantId=this.tenantId(user);const requestedBy=this.actorId(user);const instruction=String(instructionRaw||'').trim();
    if(!instruction||instruction.length>2000)throw new BadRequestException('Describe what the spreadsheet contains and what should be imported (up to 2,000 characters).');
    if(!file)throw new BadRequestException('Choose an XLSX or CSV file.');
    const parsed=await parseWorkbook(file);const profile=this.profile();const id=randomUUID();const tenantLookup=await this.db.from('tenants').select('name').eq('id',tenantId).maybeSingle();if(tenantLookup.error)throw new ServiceUnavailableException('The current tenant could not be verified.');if(!tenantLookup.data)throw new ForbiddenException('The authenticated tenant is not available.');const tenantName=String(tenantLookup.data.name||'').trim();if(!tenantName)throw new ServiceUnavailableException('The current tenant name is unavailable.');
    const bucket=await this.db.storage.getBucket('erp-documents');if(bucket.error||!bucket.data||bucket.data.public)throw new ServiceUnavailableException('Private file storage is required for Smart Import.');
    let fileReference='';
    try {
      const stored=await this.storage.uploadFile({...file,originalname:`${id}.${String(file.originalname).toLowerCase().endsWith('.csv')?'csv':'xlsx'}`} as Express.Multer.File,'smart-import',`${tenantId}/${id}`);fileReference=stored.path;
      const sheetAnalysis=parsed.sheets.map((sheet)=>({name:sheet.name,headerCount:sheet.headers.length,headers:sheet.headers,rowCount:sheet.rows.length,candidateEntities:sheet.candidateEntities,columns:sheet.headers.map((header)=>{const values=sheet.rows.map((r)=>r.values[header]).filter((x)=>x!=null&&String(x).trim()!=='');const counts=new Map<string,number>();for(const value of values)counts.set(typeof value, (counts.get(typeof value)||0)+1);return {header,nonEmptyCount:values.length,valueTypes:[...counts.keys()],repeatedValueCount:values.length-new Set(values.map(normalizeKey)).size};})}));
      const {data:batch,error}=await this.db.from('smart_import_batches').insert({id,tenant_id:tenantId,tenant_name:tenantName,profile,requested_by:requestedBy,file_reference:fileReference,original_filename:String(file.originalname||'upload').slice(0,255),file_sha256:parsed.sha256,instruction,import_type:'MASTER_DATA',status:'ANALYSING',row_count:parsed.sheets.reduce((n,s)=>n+s.rows.length,0),sheet_analysis:sheetAnalysis,column_mappings:parsed.mappings,metadata:{interpretation:'DETERMINISTIC_HEADER_RULES',file_type:String(file.originalname).toLowerCase().endsWith('.csv')?'CSV':'XLSX'}}).select('*').single();
      if(error||!batch)throw new Error('Batch metadata could not be saved.');
      const importRows:any[]=[];let lowMapping=false;
      for(const sheet of parsed.sheets){const restricted=classifyTransactionalSheet(sheet.headers);for(const rawRow of sheet.rows){
        const drafts=restricted?[{entity:restricted==='ATTENDANCE'?'ATTENDANCE':'OTHER',values:{source:rawRow.values},confidence:'HIGH' as const,rowNumber:rawRow.rowNumber,sheet:sheet.name}]:buildEntityDrafts(sheet,rawRow,parsed.mappings);
        for(const draft of drafts){const reference=`${sheet.name.slice(0,40)}!${rawRow.rowNumber}:${draft.entity}`;const fingerprint=rowFingerprint(id,sheet.name,rawRow.rowNumber,draft.entity,draft.values);if(draft.confidence==='LOW')lowMapping=true;importRows.push({batch_id:id,tenant_id:tenantId,sheet_name:sheet.name,source_row:rawRow.rowNumber,row_reference:reference,row_fingerprint:fingerprint,target_entity:draft.entity,raw_values:rawRow.values,mapped_values:draft.values,decision:'BLOCKED',validation:[],match_candidates:[],depends_on:[],result:{mapping_confidence:draft.confidence}});}
      }}
      for(let i=0;i<importRows.length;i+=250){const {error:rowError}=await this.db.from('smart_import_batch_rows').insert(importRows.slice(i,i+250));if(rowError)throw new Error('Import rows could not be stored.');}
      await this.audit(batch,user,'UPLOADED',{fileSha256:parsed.sha256,sheets:parsed.sheets.map((s)=>({name:s.name,rows:s.rows.length})),rowCount:importRows.length});
      return await this.buildPreview(user,id,lowMapping);
    } catch(error:any) {
      if(fileReference)await this.storage.deleteFile(fileReference).catch(()=>undefined);
      if(error instanceof BadRequestException||error instanceof ForbiddenException||error instanceof ConflictException||error instanceof NotFoundException||error instanceof ServiceUnavailableException)throw error;
      this.logger.warn(`Smart Import upload failed for profile ${profile}.`);throw new ServiceUnavailableException('The workbook could not be staged safely. No master records were imported.');
    }
  }

  async list(user:any,limitRaw?:number) {
    this.assertEnabled();this.assertAdmin(user);const tenantId=this.tenantId(user);const limit=Math.min(200,Math.max(1,Number(limitRaw)||100));
    const {data,error}=await this.db.from('smart_import_batches').select('id,batch_number,tenant_id,tenant_name,profile,requested_by,approved_by,original_filename,instruction,status,row_count,created_count,updated_count,skipped_count,error_count,created_at,approved_at,completed_at').eq('tenant_id',tenantId).eq('profile',this.profile()).order('created_at',{ascending:false}).limit(limit);
    if(error)throw new ServiceUnavailableException('Smart Import batches could not be loaded.');return data||[];
  }

  async get(user:any,id:string) { this.assertEnabled();const batch=await this.ownedBatch(user,id);const rows=await this.rows(batch);return {batch,rows,configuration:{enabled:true,writeMode:String(process.env.SMART_IMPORT_WRITE_MODE||'APPROVAL_REQUIRED').toUpperCase(),writesRequireApproval:true}}; }
  async workingContext(user:any,id:string) {
    this.assertEnabled();
    const batch=await this.ownedBatch(user,id);
    if(batch.requested_by!==this.actorId(user)&&!hasAdminBypass(user))throw new ForbiddenException('This import task is not owned or authorized.');
    return {batch,rows:await this.rows(batch)};
  }
  async actionItems(user:any,id:string) {
    const {batch,rows}=await this.workingContext(user,id);
    if(!['COMPLETED','PARTIALLY_COMPLETED'].includes(batch.status))throw new BadRequestException('Complete the governed import before planning from imported items.');
    const item_ids=[...new Set(rows.filter(row=>row.created_table==='items'&&['ALREADY_IMPORTED','USE_EXISTING'].includes(row.decision)&&(row.result?.imported===true||row.result?.existing===true)).map(row=>String(row.created_entity_id||'')))];
    if(!item_ids.length||item_ids.length>200||item_ids.some(value=>!(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i).test(value)))throw new BadRequestException('Select at most 200 recorded imported ERP items.');
    return {item_ids};
  }
  async refreshPreview(user:any,id:string) { this.assertEnabled();const batch=await this.ownedBatch(user,id);if(!['PARTIALLY_COMPLETED','FAILED','NEEDS_DATA','NEEDS_MAPPING_REVIEW','READY_FOR_PREVIEW','AWAITING_APPROVAL'].includes(batch.status))throw new ConflictException('This batch cannot be revalidated in its current state.');return this.buildPreview(user,id,false); }

  async updateMappings(user:any,id:string,input:any[]) {
    this.assertEnabled();const batch=await this.ownedBatch(user,id);if(['IMPORTING','COMPLETED','ROLLED_BACK','CANCELLED'].includes(batch.status))throw new ConflictException('This batch no longer accepts mapping changes.');
    if((await this.rows(batch)).some((row)=>row.result?.imported===true||row.result?.updated===true))throw new ConflictException('Mappings are locked after any record has been imported. Start a new batch to change the source mapping.');
    if(!Array.isArray(input)||input.length>500)throw new BadRequestException('Provide a valid mapping list.');
    const mappings:SmartImportMapping[]=Array.isArray(batch.column_mappings)?batch.column_mappings:[];const allowed=new Set(['SUPPLIER:name','SUPPLIER:legal_name','SUPPLIER:contact_person','SUPPLIER:code','SUPPLIER:email','SUPPLIER:phone','SUPPLIER:country','SUPPLIER:address','SUPPLIER:payment_terms','SUPPLIER:tax_id','ITEM:name','ITEM:code','ITEM:description','ITEM:category','ITEM:uom','ITEM:hsn_code','CUSTOMER:customer_name','CUSTOMER:customer_code','CUSTOMER:contact_person','CUSTOMER:email','CUSTOMER:phone','CUSTOMER:billing_address','CUSTOMER:shipping_address','CUSTOMER:country','CUSTOMER:credit_days','CUSTOMER:tax_treatment','BOM:parent_name','BOM:component_name','BOM:quantity','ATTENDANCE:source_value']);
    const next=mappings.map((old)=>{const update=input.find((x)=>x.sheet===old.sheet&&x.sourceColumn===old.sourceColumn);if(!update)return old;if(update.targetEntity==null||update.targetField==null)return {...old,targetEntity:null,targetField:null,confidence:'HIGH' as const,reason:'User explicitly left this source column unmapped.'};const entity=String(update.targetEntity).toUpperCase();const field=String(update.targetField);if(!allowed.has(`${entity}:${field}`))throw new BadRequestException(`Mapping ${entity}.${field} is not available in Smart Import V1.`);return {...old,targetEntity:entity,targetField:field,confidence:'HIGH' as const,reason:'Confirmed by an authorized user.'};});
    const {error}=await this.db.from('smart_import_batches').update({column_mappings:next,mapping_version:Number(batch.mapping_version||1)+1,approved_preview_checksum:null,approved_by:null,approved_at:null,status:'ANALYSING',updated_at:new Date().toISOString()}).eq('id',id).eq('tenant_id',batch.tenant_id);if(error)throw new ServiceUnavailableException('Mappings could not be saved.');await this.rebuildRowsFromMappings(batch,next);await this.audit(batch,user,'MAPPINGS_UPDATED',{mappingVersion:Number(batch.mapping_version||1)+1});return this.buildPreview(user,id,false);
  }

  private async rebuildRowsFromMappings(batch:any,mappings:SmartImportMapping[]) {
    const previous=await this.rows(batch);const grouped=new Map<string,any>();for(const row of previous){const key=`${row.sheet_name}\u0000${row.source_row}`;if(!grouped.has(key))grouped.set(key,{sheet:row.sheet_name,rowNumber:row.source_row,values:row.raw_values});}
    const headersBySheet=new Map<string,string[]>((Array.isArray(batch.sheet_analysis)?batch.sheet_analysis:[]).map((s:any)=>[s.name,s.headers||[]]));const replacements:any[]=[];
    for(const item of grouped.values()){const sheetName=String(item.sheet);const parsedSheet:any={name:sheetName,headers:headersBySheet.get(sheetName)||Object.keys(item.values),rows:[{rowNumber:item.rowNumber,values:item.values}]};const drafts=buildEntityDrafts(parsedSheet,parsedSheet.rows[0],mappings);for(const draft of drafts){replacements.push({batch_id:batch.id,tenant_id:batch.tenant_id,sheet_name:sheetName,source_row:draft.rowNumber,row_reference:`${sheetName.slice(0,40)}!${draft.rowNumber}:${draft.entity}`,row_fingerprint:rowFingerprint(batch.id,sheetName,draft.rowNumber,draft.entity,draft.values),target_entity:draft.entity,raw_values:item.values,mapped_values:draft.values,corrections:{},decision:'BLOCKED',validation:[],match_candidates:[],depends_on:[],result:{mapping_confidence:draft.confidence}});}}
    const removed=await this.db.from('smart_import_batch_rows').delete().eq('batch_id',batch.id).eq('tenant_id',batch.tenant_id);if(removed.error)throw new ServiceUnavailableException('Rows could not be rebuilt after mapping changes.');for(let i=0;i<replacements.length;i+=250){const {error}=await this.db.from('smart_import_batch_rows').insert(replacements.slice(i,i+250));if(error)throw new ServiceUnavailableException('Rows could not be rebuilt after mapping changes.');}
  }

  async updateCorrections(user:any,id:string,corrections:any[]) {
    this.assertEnabled();const batch=await this.ownedBatch(user,id);if(!Array.isArray(corrections)||corrections.length>5000)throw new BadRequestException('Correction list is invalid.');
    const rows=await this.rows(batch);const updates:any[]=[];
    for(const correction of corrections){const row=rows.find((x)=>x.row_reference===correction.rowReference);if(!row)throw new NotFoundException('An import row was not found.');if(row.result?.imported===true||row.result?.updated===true)throw new ConflictException('An imported record cannot be edited through its source batch.');const values=safeJson(correction.values);const fields=Object.keys(values);if(fields.some((field)=>!['name','legal_name','code','description','category','uom','hsn_code','customer_name','customer_code','contact_person','supplier_name','item_name','email','phone','billing_address','shipping_address','country','credit_days','payment_terms','tax_id','tax_treatment'].includes(field)))throw new BadRequestException('A correction contains an unsupported field.');updates.push({row,corrections:{...safeJson(row.corrections),...values}});}
    for(const item of updates){const {error}=await this.db.from('smart_import_batch_rows').update({corrections:item.corrections,updated_at:new Date().toISOString()}).eq('id',item.row.id).eq('tenant_id',batch.tenant_id);if(error)throw new ServiceUnavailableException('Corrections could not be saved.');}
    await this.db.from('smart_import_batches').update({mapping_version:Number(batch.mapping_version||1)+1,approved_preview_checksum:null,approved_by:null,approved_at:null,status:'ANALYSING',updated_at:new Date().toISOString()}).eq('id',id).eq('tenant_id',batch.tenant_id);await this.audit(batch,user,'MISSING_DATA_CORRECTED',{rowCount:updates.length});return this.buildPreview(user,id,false);
  }

  async decideRows(user:any,id:string,decisions:any[]) {
    this.assertEnabled();this.assertAdmin(user);const batch=await this.ownedBatch(user,id);if(!Array.isArray(decisions)||decisions.length>5000)throw new BadRequestException('Decision list is invalid.');const rows=await this.rows(batch);
    for(const decision of decisions){const row=rows.find((x)=>x.row_reference===decision.rowReference);const choice=String(decision.decision||'').toUpperCase();if(!row||!ALLOWED_USER_DECISIONS.has(choice))throw new BadRequestException('A row decision is invalid.');if(row.result?.imported===true||row.result?.updated===true)throw new ConflictException('An imported record cannot be changed through its source batch.');if(row.decision!=='POSSIBLE_MATCH'&&row.decision!=='USE_EXISTING')throw new ConflictException('This row does not need a match decision.');const candidates=Array.isArray(row.match_candidates)?row.match_candidates:[];const matchId=String(decision.matchId||'');if(choice==='USE_EXISTING'&&candidates.some((candidate:any)=>candidate.match==='EXACT_NORMALIZED')&&!candidates.some((candidate:any)=>candidate.id===matchId))throw new BadRequestException('Choose one of the exact matching master records.');if(choice==='CREATE'&&(candidates.some((candidate:any)=>candidate.match==='EXACT_NORMALIZED')||row.target_entity==='SUPPLIER_CONTACT'))throw new BadRequestException('This exact or contact match cannot be duplicated. Correct the source value or choose the existing record.');if(choice==='USE_EXISTING'&&matchId&&!candidates.some((candidate:any)=>candidate.id===matchId))throw new BadRequestException('The chosen match is not one of the previewed candidates.');const result={...safeJson(row.result),selected_match_id:matchId||null};const {error}=await this.db.from('smart_import_batch_rows').update({user_decision:choice,result,updated_at:new Date().toISOString()}).eq('id',row.id).eq('tenant_id',batch.tenant_id);if(error)throw new ServiceUnavailableException('A row decision could not be saved.');}
    await this.db.from('smart_import_batches').update({mapping_version:Number(batch.mapping_version||1)+1,approved_preview_checksum:null,approved_by:null,approved_at:null,status:'ANALYSING',updated_at:new Date().toISOString()}).eq('id',id).eq('tenant_id',batch.tenant_id);await this.audit(batch,user,'MATCH_DECISIONS_UPDATED',{count:decisions.length});return this.buildPreview(user,id,false);
  }

  private async schema(client:any,table:string) {
    if(!/^(items|vendors|customers|item_vendors)$/.test(table))throw new Error('Unsupported master table.');
    const {rows}=await client.query('SELECT column_name,is_nullable,column_default,udt_name FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2',['public',table]);return new Map<string,{nullable:boolean;defaultValue:string|null;type:string}>(rows.map((r:any)=>[r.column_name,{nullable:r.is_nullable==='YES',defaultValue:r.column_default,type:r.udt_name}]));
  }
  private readValue(row:any,field:string) { const corrections=safeJson(row.corrections);return Object.prototype.hasOwnProperty.call(corrections,field)?corrections[field]:safeJson(row.mapped_values)[field]; }
  private async normalizedMatches(client:any,tenantId:string,entity:string,names:string[]) {
    const config=MASTER_TABLE[entity];if(!config)return new Map();const schema=await this.schema(client,config.table);if(!schema.has(config.nameField)||!schema.has('tenant_id'))return new Map();const values=[...new Set(names.map(normalizeKey).filter(Boolean))];if(!values.length)return new Map();const query=await client.query(`SELECT id, ${identifier(config.nameField)} AS name FROM public.${identifier(config.table)} WHERE tenant_id=$1 AND lower(btrim(${identifier(config.nameField)}))=ANY($2::text[])`,[tenantId,values]);const map=new Map<string,any[]>();for(const row of query.rows){const key=normalizeKey(row.name);map.set(key,[...(map.get(key)||[]),row]);}return map;
  }
  private requiredFieldIssues(client:any,table:string,values:Record<string,unknown>,allowlist:string[],entity:string) {
    return this.schema(client,table).then((columns:Map<string,any>)=>{if(!columns.size)return {columns,issues:[{field:table,classification:'DB_REQUIRED',message:`${table} is unavailable in this database.`}]};const issues:any[]=[];for(const field of Object.keys(values))if(!columns.has(field)||!allowlist.includes(field)){issues.push({field,classification:'INVALID',message:`${field} is not an available field for this master.`});}
      issues.push(...preserveUnknownBusinessValues(columns,values));
      if(entity==='ITEM'&&!normalizeKey(values.uom))issues.push({field:'uom',classification:'SERVICE_REQUIRED',message:'Unit of measure is required to create an item.'});
      return {columns,issues};});
  }

  private async buildPreview(user:any,id:string,knownLowMapping?:boolean) {
    const batch=await this.ownedBatch(user,id);if(['IMPORTING','COMPLETED','ROLLED_BACK','CANCELLED'].includes(batch.status))throw new ConflictException('This batch cannot be previewed again.');const rows=await this.rows(batch);const client=this.pg();const configs=['SUPPLIER','ITEM','CUSTOMER'];const nameValues:Record<string,string[]>={};for(const entity of configs)nameValues[entity]=rows.filter((r)=>r.target_entity===entity).map((r)=>String(this.readValue(r,MASTER_TABLE[entity].nameField)||''));const matches:Record<string,Map<string,any[]>>={};for(const entity of configs)matches[entity]=await this.normalizedMatches(client,batch.tenant_id,entity,nameValues[entity]);
    const allNames:Record<string,any[]>={};for(const entity of configs){const {table,nameField}=MASTER_TABLE[entity];const schema=await this.schema(client,table);allNames[entity]=schema.size?(await client.query(`SELECT id, ${identifier(nameField)} AS name FROM public.${identifier(table)} WHERE tenant_id=$1 LIMIT 20000`,[batch.tenant_id])).rows:[];}
    const within=new Map<string,string>();const preview:any[]=[];let lowMapping=Boolean(knownLowMapping);for(const row of rows){let decision='BLOCKED';let validation:any[]=[];let candidates:any[]=[];let matchId:string|null=null;const entity=String(row.target_entity);const values={...safeJson(row.mapped_values),...safeJson(row.corrections)};const confidence=String(safeJson(row.result).mapping_confidence||'HIGH');
      if(confidence==='LOW')lowMapping=true;
      const transactional=classifyTransactionalSheet(Object.keys(safeJson(row.raw_values)));
      if(entity==='ATTENDANCE'||transactional==='ATTENDANCE'){decision='BLOCKED';validation=[{field:'entity',classification:'BLOCKED',message:'Historical attendance must use the controlled Historical Attendance Import.'}];}
      else if(transactional==='TRANSACTION_IMPORT_REQUIRES_SPECIALIZED_IMPORTER'){decision='TRANSACTION_IMPORT_REQUIRES_SPECIALIZED_IMPORTER';validation=[{field:'entity',classification:'BLOCKED',message:'This transaction type requires its specialized importer; Smart Import will not write it.'}];}
      else if(entity==='OTHER'){decision='BLOCKED';validation=[{field:'entity',classification:'REVIEW',message:'No safe master-data target was identified for this row. Confirm its source-column mapping before continuing.'}];}
      else if(entity==='BOM'){decision='PENDING_BOM_MAPPING';validation=[{field:'quantity',classification:'BLOCKED',message:'BOM creation stays blocked until every required component quantity, UOM, yield and explicit BOM approval are available.'}];}
      else if(entity==='ITEM_SUPPLIER_MAPPING'||entity==='SUPPLIER_CONTACT') {
        const supplierName=String(values.supplier_name||''); const itemName=String(values.item_name||'');
        if(!supplierName || (entity==='ITEM_SUPPLIER_MAPPING'&&!itemName)) {
          decision='MISSING_DATA'; validation=[{field:!supplierName?'supplier_name':'item_name',classification:'SERVICE_REQUIRED',message:'A relationship needs both source records.'}];
        } else {
          const suppliers=matches.SUPPLIER.get(normalizeKey(supplierName))||[];
          const items=matches.ITEM.get(normalizeKey(itemName))||[];
          const plannedSupplier=preview.some((p)=>p.target_entity==='SUPPLIER'&&normalizeKey(p.mapped_values?.name)===normalizeKey(supplierName)&&p.decision==='CREATE');
          const plannedItem=preview.some((p)=>['ITEM','RAW_MATERIAL','FINISHED_GOOD'].includes(p.target_entity)&&normalizeKey(p.mapped_values?.name)===normalizeKey(itemName)&&p.decision==='CREATE');
          if(suppliers.length>1||(entity==='ITEM_SUPPLIER_MAPPING'&&items.length>1)) {
            decision='POSSIBLE_MATCH'; candidates=[...suppliers,...items].map((x)=>({id:x.id,name:x.name})); validation=[{field:'relationship',classification:'REVIEW',message:'More than one exact match exists; choose the correct records.'}];
          } else if(entity==='ITEM_SUPPLIER_MAPPING'&&items.length===1&&suppliers.length===1) {
            const linkSchema=await this.schema(client,'item_vendors');
            if(!linkSchema.has('item_id')||!linkSchema.has('vendor_id')) {decision='INVALID';validation=[{field:'relationship',classification:'INVALID',message:'The item-supplier relationship table is unavailable.'}];}
            else {const link=await client.query('SELECT 1 FROM public.item_vendors WHERE tenant_id=$1 AND item_id=$2 AND vendor_id=$3 LIMIT 1',[batch.tenant_id,items[0].id,suppliers[0].id]);decision=link.rowCount?'USE_EXISTING':'CREATE';candidates=[{itemId:items[0].id,supplierId:suppliers[0].id,itemName:items[0].name,supplierName:suppliers[0].name}];}
          } else if(entity==='SUPPLIER_CONTACT'&&suppliers.length===1) {
            const current=await client.query('SELECT contact_person FROM public.vendors WHERE id=$1 AND tenant_id=$2',[suppliers[0].id,batch.tenant_id]);
            if(current.rows[0]?.contact_person&&normalizeKey(current.rows[0].contact_person)!==normalizeKey(values.contact_person)){decision='POSSIBLE_MATCH';candidates=[{id:suppliers[0].id,name:supplierName,currentContact:current.rows[0].contact_person}];validation=[{field:'contact_person',classification:'REVIEW',message:'This supplier already has a different primary contact; review before changing it.'}];}
            else {decision=current.rows[0]?.contact_person?'USE_EXISTING':'CREATE';matchId=suppliers[0].id;}
          } else if((entity==='SUPPLIER_CONTACT'&&plannedSupplier)||(entity==='ITEM_SUPPLIER_MAPPING'&&plannedSupplier&&plannedItem)) {
            decision='CREATE';
          } else {
            decision='MISSING_DATA'; validation=[{field:'relationship',classification:'SERVICE_REQUIRED',message:'Create or exactly match each parent record before adding its relationship.'}];
          }
          const key=`${entity}:${normalizeKey(supplierName)}:${normalizeKey(itemName)}:${normalizeKey(values.contact_person)}`;
          if(decision==='CREATE'&&within.has(key)){decision='USE_EXISTING';candidates=[{rowReference:within.get(key)}];} else if(decision==='CREATE')within.set(key,row.row_reference);
        }
      } else {
        const config=MASTER_TABLE[entity];if(!config){decision='INVALID';validation=[{field:'entity',classification:'INVALID',message:'The detected entity is not supported in Smart Import V1.'}];}
        else {const name=String(values[config.nameField]||'').trim();if(!name){decision='MISSING_DATA';validation=[{field:config.nameField,classification:'SERVICE_REQUIRED',message:`${config.nameField} is required.`}];}
          else {const exact=matches[entity]?.get(normalizeKey(name))||[];if(exact.length>1){decision='POSSIBLE_MATCH';candidates=exact.map((x)=>({id:x.id,name:x.name}));validation=[{field:config.nameField,classification:'REVIEW',message:'More than one exact match exists; review the match.'}];}
            else if(exact.length===1){decision=row.user_decision==='CREATE'?'CREATE':'USE_EXISTING';matchId=exact[0].id;candidates=[{id:exact[0].id,name:exact[0].name,match:'EXACT_NORMALIZED'}];}
            else {const fuzzy=fuzzyNameCandidates(name,allNames[entity]||[]);if(row.user_decision==='USE_EXISTING'){decision='USE_EXISTING';const selected=Array.isArray(row.match_candidates)?row.match_candidates[0]:null;matchId=String(selected?.id||'')||null;}
              else if(fuzzy.length&&row.user_decision!=='CREATE'){decision='POSSIBLE_MATCH';candidates=fuzzy.map(({id,name,score})=>({id,name,score}));validation=[{field:config.nameField,classification:'REVIEW',message:'A similar record exists. Smart Import will not merge it automatically.'}];}
              else {decision='CREATE';}
              const payload={...values};if(config.codeField&&!String(payload[config.codeField]||'').trim())payload[config.codeField]=this.generatedCode(entity,row.row_fingerprint);if(entity==='SUPPLIER_CONTACT'){delete payload.supplier_name;payload.contact_person=values.contact_person;}
              const checked=await this.requiredFieldIssues(client,config.table,payload,config.allowed,entity);validation.push(...checked.issues);if(checked.issues.some((x)=>x.classification==='DB_REQUIRED'||x.classification==='SERVICE_REQUIRED'))decision='MISSING_DATA';if(checked.issues.some((x)=>x.classification==='INVALID'))decision='INVALID';
              row.mapped_values=payload;
            }
          }
        }
      }
      if(row.user_decision==='CREATE'&&decision==='POSSIBLE_MATCH')decision='CREATE';
      if(row.user_decision==='USE_EXISTING'&&decision==='POSSIBLE_MATCH'){decision='USE_EXISTING';matchId=String(safeJson(row.result).selected_match_id||'')||null;}
      const updated={...row,decision,validation,match_candidates:candidates,result:{...safeJson(row.result),matched_id:matchId,previewed_at:new Date().toISOString()}};preview.push(updated);
    }
    // Persist the schema-derived validation and decisions; this is the only mutation performed by preview.
    for(let i=0;i<preview.length;i+=250){const {error}=await this.db.from('smart_import_batch_rows').upsert(preview.slice(i,i+250).map((row)=>({id:row.id,batch_id:row.batch_id,tenant_id:row.tenant_id,sheet_name:row.sheet_name,source_row:row.source_row,row_reference:row.row_reference,row_fingerprint:row.row_fingerprint,target_entity:row.target_entity,raw_values:row.raw_values,mapped_values:row.mapped_values,corrections:row.corrections,decision:row.decision,user_decision:row.user_decision,validation:row.validation,match_candidates:row.match_candidates,depends_on:row.depends_on,result:row.result,updated_at:new Date().toISOString()})),{onConflict:'id'});if(error)throw new ServiceUnavailableException('The preview could not be stored.');}
    const created=preview.filter((x)=>x.decision==='CREATE').length;const unresolved=preview.some((x)=>x.decision==='POSSIBLE_MATCH');const needsData=preview.some((x)=>x.decision==='MISSING_DATA');const actionable=created>0||preview.some((x)=>x.decision==='USE_EXISTING');const status=lowMapping||unresolved?'NEEDS_MAPPING_REVIEW':!actionable?'READY_FOR_PREVIEW':needsData?'NEEDS_DATA':'AWAITING_APPROVAL';
    const previewBody={fileSha256:batch.file_sha256,mappingVersion:batch.mapping_version,mappings:batch.column_mappings,rows:preview.map((r)=>({rowReference:r.row_reference,entity:r.target_entity,decision:r.decision,values:r.mapped_values,validation:r.validation,matchCandidates:r.match_candidates,userDecision:r.user_decision}))};const checksum=createHash('sha256').update(JSON.stringify(previewBody)).digest('hex');
    const {error}=await this.db.from('smart_import_batches').update({status,preview_checksum:checksum,approved_preview_checksum:null,approved_by:null,approved_at:null,analysed_at:new Date().toISOString(),updated_at:new Date().toISOString(),metadata:{...safeJson(batch.metadata),previewSummary:{rows:preview.length,created,existing:preview.filter((x)=>x.decision==='USE_EXISTING').length,possibleMatches:preview.filter((x)=>x.decision==='POSSIBLE_MATCH').length,missingData:preview.filter((x)=>x.decision==='MISSING_DATA').length,blocked:preview.filter((x)=>['BLOCKED','PENDING_BOM_MAPPING','TRANSACTION_IMPORT_REQUIRES_SPECIALIZED_IMPORTER'].includes(x.decision)).length}}}).eq('id',id).eq('tenant_id',batch.tenant_id);if(error)throw new ServiceUnavailableException('Preview status could not be saved.');
    await this.audit(batch,user,'PREVIEW_GENERATED',{checksum,created,possibleMatches:preview.filter((x)=>x.decision==='POSSIBLE_MATCH').length,missingData:preview.filter((x)=>x.decision==='MISSING_DATA').length});
    return this.get(user,id);
  }

  private generatedCode(entity:string,fingerprint:string) {const suffix=fingerprint.slice(0,10).toUpperCase();return entity==='SUPPLIER'?`VEN-SI-${suffix}`:entity==='CUSTOMER'?`CUST-SI-${suffix}`:`ITEM-SI-${suffix}`;}

  async approve(user:any,id:string) {
    this.assertEnabled();this.assertAdmin(user);if(String(process.env.SMART_IMPORT_WRITE_MODE||'APPROVAL_REQUIRED').toUpperCase()!=='APPROVAL_REQUIRED')throw new ConflictException('Smart Import write mode is not approval-gated.');const batch=await this.ownedBatch(user,id);if(!batch.preview_checksum||!['AWAITING_APPROVAL','NEEDS_DATA','READY_FOR_PREVIEW'].includes(batch.status))throw new ConflictException('Generate and resolve the preview before approval.');const rows=await this.rows(batch);
    if(rows.some((r)=>['POSSIBLE_MATCH','INVALID','NEEDS_MAPPING_REVIEW'].includes(r.decision)||String(safeJson(r.result).mapping_confidence)==='LOW'))throw new ConflictException('Resolve mapping and possible-match reviews before approval.');if(!rows.some((r)=>r.decision==='CREATE'))throw new ConflictException('There are no safe new master records to approve.');
    const approver=this.actorId(user);const {data,error}=await this.db.from('smart_import_batches').update({status:'AWAITING_APPROVAL',approved_by:approver,approved_at:new Date().toISOString(),approved_preview_checksum:batch.preview_checksum,updated_at:new Date().toISOString()}).eq('id',id).eq('tenant_id',batch.tenant_id).eq('preview_checksum',batch.preview_checksum).select('*').single();if(error||!data)throw new ConflictException('The preview changed during approval. Generate a new preview.');await this.audit(data,user,'APPROVED',{previewChecksum:data.preview_checksum,mappingVersion:data.mapping_version,fileSha256:data.file_sha256,tenantId:data.tenant_id,profile:data.profile});return data;
  }

  private async liveInsert(client:any,tenantId:string,row:any) {
    const entity=String(row.target_entity);const config=MASTER_TABLE[entity];
    if(entity==='SUPPLIER_CONTACT'){
      const name=String(row.mapped_values?.supplier_name||'');const supplier=await client.query('SELECT id,contact_person FROM public.vendors WHERE tenant_id=$1 AND lower(btrim(name))=$2 FOR UPDATE',[tenantId,normalizeKey(name)]);if(supplier.rowCount!==1)throw new Error('Supplier is no longer a unique live match.');if(supplier.rows[0].contact_person&&normalizeKey(supplier.rows[0].contact_person)!==normalizeKey(row.mapped_values?.contact_person))throw new Error('Supplier contact changed after preview; review required.');if(!supplier.rows[0].contact_person)await client.query('UPDATE public.vendors SET contact_person=$1,updated_at=now() WHERE id=$2 AND tenant_id=$3',[row.mapped_values.contact_person,supplier.rows[0].id,tenantId]);return {table:'vendors',id:supplier.rows[0].id,created:false,updated:!supplier.rows[0].contact_person,previousContact:supplier.rows[0].contact_person||null,importedContact:row.mapped_values.contact_person};
    }
    if(entity==='ITEM_SUPPLIER_MAPPING') {
      const supplierName=String(row.mapped_values?.supplier_name||'');const itemName=String(row.mapped_values?.item_name||'');
      const supplier=await client.query('SELECT id FROM public.vendors WHERE tenant_id=$1 AND lower(btrim(name))=$2 LIMIT 2',[tenantId,normalizeKey(supplierName)]);const item=await client.query('SELECT id FROM public.items WHERE tenant_id=$1 AND lower(btrim(name))=$2 LIMIT 2',[tenantId,normalizeKey(itemName)]);
      if(supplier.rowCount!==1||item.rowCount!==1)throw new Error('Supplier or item parent is no longer a unique live match.');
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`${this.profile()}:${tenantId}:item_vendors:${item.rows[0].id}:${supplier.rows[0].id}`]);
      const found=await client.query('SELECT id FROM public.item_vendors WHERE tenant_id=$1 AND item_id=$2 AND vendor_id=$3 LIMIT 2',[tenantId,item.rows[0].id,supplier.rows[0].id]);if(found.rowCount)return {table:'item_vendors',id:found.rows[0].id,created:false};
      const columns=await this.schema(client,'item_vendors');const values:any={tenant_id:tenantId,item_id:item.rows[0].id,vendor_id:supplier.rows[0].id};const issues:any[]=[];for(const [field,column] of columns){if(field==='id'||field==='created_at'||field==='updated_at')continue;if(field in values)continue;if(!column.nullable&&!column.defaultValue)issues.push(field);}
      if(issues.length)throw new Error(`Relationship requires additional values: ${issues.join(', ')}`);const cols=Object.keys(values).filter((field)=>columns.has(field));const inserted=await client.query(`INSERT INTO public.item_vendors (${cols.map(identifier).join(',')}) VALUES (${cols.map((_,i)=>`$${i+1}`).join(',')}) RETURNING id`,cols.map((field)=>values[field]));return {table:'item_vendors',id:inserted.rows[0].id,created:true};
    }
    if(!config)throw new Error('Unsupported master entity.');const values={...safeJson(row.mapped_values)};const name=String(values[config.nameField]||'').trim();if(!name)throw new Error(`Missing ${config.nameField}.`);
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`${this.profile()}:${tenantId}:${config.table}:${normalizeKey(name)}`]);
    const existing=await client.query(`SELECT id FROM public.${identifier(config.table)} WHERE tenant_id=$1 AND lower(btrim(${identifier(config.nameField)}))=$2 LIMIT 2 FOR UPDATE`,[tenantId,normalizeKey(name)]);if(existing.rowCount>1)throw new Error('Multiple exact live matches exist.');if(existing.rowCount===1)return {table:config.table,id:existing.rows[0].id,created:false};
    const checked=await this.requiredFieldIssues(client,config.table,values,config.allowed,entity);if(checked.issues.length)throw new Error(`Schema changed after preview: ${checked.issues.map((x:any)=>x.field).join(', ')}`);
    values.tenant_id=tenantId;if(config.codeField&&!String(values[config.codeField]||'').trim())values[config.codeField]=this.generatedCode(entity,row.row_fingerprint);
    if(entity==='SUPPLIER'||entity==='CUSTOMER'){
      for(const field of ['country','shipping_country','credit_days','credit_limit','payment_terms','tax_treatment','bank_account_type','customer_type'])if(checked.columns.has(field)&&!Object.prototype.hasOwnProperty.call(values,field)&&checked.columns.get(field).nullable)values[field]=null;
    }
    const cols=Object.keys(values).filter((field)=>checked.columns.has(field)&&config.allowed.includes(field)||field==='tenant_id'&&checked.columns.has(field));if(!cols.includes('tenant_id'))throw new Error('tenant_id is not available in target schema.');
    const params=cols.map((field)=>values[field]);const placeholders=cols.map((_,index)=>`$${index+1}`);const result=await client.query(`INSERT INTO public.${identifier(config.table)} (${cols.map(identifier).join(',')}) VALUES (${placeholders.join(',')}) RETURNING id`,params);return {table:config.table,id:result.rows[0].id,created:true};
  }

  async importApproved(user:any,id:string) {
    this.assertEnabled();this.assertAdmin(user);const batch=await this.ownedBatch(user,id);if(batch.status==='COMPLETED')return this.get(user,id);if(batch.status!=='AWAITING_APPROVAL'||batch.approved_by!==this.actorId(user)&&!hasSuperAdminBypass(user)||batch.approved_preview_checksum!==batch.preview_checksum)throw new ConflictException('A current privileged approval is required.');
    const rows=await this.rows(batch);const mutable=rows.filter((r)=>r.decision==='CREATE'&&r.user_decision!=='USE_EXISTING');if(!mutable.length)throw new ConflictException('No approved safe records remain to import.');
    const {data:claim,error:claimError}=await this.db.from('smart_import_batches').update({status:'IMPORTING',updated_at:new Date().toISOString()}).eq('id',id).eq('tenant_id',batch.tenant_id).eq('status','AWAITING_APPROVAL').eq('approved_preview_checksum',batch.preview_checksum).select('id').maybeSingle();if(claimError||!claim)throw new ConflictException('Another request is importing this batch.');
    const parentRows=mutable.filter((r)=>['SUPPLIER','ITEM','RAW_MATERIAL','FINISHED_GOOD','CUSTOMER'].includes(r.target_entity));const relationRows=mutable.filter((r)=>!parentRows.includes(r));const ordered=[...parentRows,...relationRows];const client=this.pg();let created=0,updated=0,skipped=0,errors=0;
    for(const row of ordered){let connection:any;try{connection=await client.connect();await connection.query('BEGIN');
        const live=await this.liveInsert(connection,batch.tenant_id,row);await connection.query('COMMIT');if(live.created)created++;else if(live.updated)updated++;else skipped++;
        const imported=Boolean(live.created||live.updated);const {error}=await this.db.from('smart_import_batch_rows').update({decision:live.created?'ALREADY_IMPORTED':'USE_EXISTING',created_table:live.table,created_entity_id:live.id,imported_at:imported?new Date().toISOString():null,result:{...safeJson(row.result),imported:live.created,updated:Boolean(live.updated),existing:!imported,...(live.updated?{previousContact:live.previousContact,importedContact:live.importedContact}:{})},updated_at:new Date().toISOString()}).eq('id',row.id).eq('tenant_id',batch.tenant_id);if(error)throw new Error('Row audit could not be stored.');
      }catch(error:any){if(connection)await connection.query('ROLLBACK').catch(()=>undefined);errors++;const safe=String(error?.message||'Row import failed').slice(0,300);await this.db.from('smart_import_batch_rows').update({decision:'INVALID',validation:[...row.validation,{field:'import',classification:'LIVE_REVALIDATION',message:safe}],result:{...safeJson(row.result),error:safe},updated_at:new Date().toISOString()}).eq('id',row.id).eq('tenant_id',batch.tenant_id);}finally{connection?.release();}}
    const finished=await this.rows(batch);const remaining=finished.some((r)=>['CREATE','MISSING_DATA','POSSIBLE_MATCH','INVALID'].includes(r.decision));const status=errors?(created||updated?'PARTIALLY_COMPLETED':'FAILED'):remaining?'PARTIALLY_COMPLETED':'COMPLETED';const {error:finishError}=await this.db.from('smart_import_batches').update({status,created_count:created,updated_count:updated,skipped_count:skipped,error_count:errors,completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',id).eq('tenant_id',batch.tenant_id);if(finishError)throw new ServiceUnavailableException('Import completion status could not be saved.');await this.audit(batch,user,'IMPORT_FINISHED',{created,updated,skipped,errors,status});return this.get(user,id);
  }

  async downloadMissingTemplate(user:any,id:string):Promise<Buffer> {
    this.assertEnabled();const batch=await this.ownedBatch(user,id);const rows=await this.rows(batch);const wb=new ExcelJS.Workbook();const sheet=wb.addWorksheet('Missing Data');sheet.columns=[{header:'Smart Import Row Reference',key:'reference',width:36},{header:'Sheet',key:'sheet',width:20},{header:'Source Row',key:'row',width:12},{header:'Entity',key:'entity',width:22},{header:'Source Name',key:'name',width:36},{header:'Missing Field',key:'field',width:22},{header:'Value',key:'value',width:28}];for(const row of rows.filter((x)=>x.decision==='MISSING_DATA')){for(const issue of row.validation||[])if(['DB_REQUIRED','SERVICE_REQUIRED'].includes(issue.classification))sheet.addRow({reference:row.row_reference,sheet:row.sheet_name,row:row.source_row,entity:row.target_entity,name:row.mapped_values?.name||row.mapped_values?.customer_name||row.mapped_values?.supplier_name||'',field:issue.field,value:''});}sheet.views=[{state:'frozen',ySplit:1}];sheet.getRow(1).font={bold:true};return Buffer.from(await wb.xlsx.writeBuffer());
  }

  async mergeMissingTemplate(user:any,id:string,file:Express.Multer.File) {
    this.assertEnabled();const batch=await this.ownedBatch(user,id);const workbook=await parseWorkbook(file);const existing=await this.rows(batch);const byReference=new Map(existing.map((row)=>[row.row_reference,row]));const corrections:any[]=[];
    for(const sheet of workbook.sheets)for(const source of sheet.rows){const reference=String(source.values['Smart Import Row Reference']||'');const field=String(source.values['Missing Field']||'');const value=source.values.Value;if(!reference||!field||value==null||String(value).trim()==='')continue;const row=byReference.get(reference);if(!row)throw new BadRequestException(`Unknown Smart Import row reference: ${reference}`);const outstanding=(row.validation||[]).some((issue:any)=>issue.field===field&&['DB_REQUIRED','SERVICE_REQUIRED'].includes(issue.classification));if(!outstanding)throw new BadRequestException(`Field ${field} is not currently missing for ${reference}.`);corrections.push({rowReference:reference,values:{[field]:value}});}
    if(!corrections.length)throw new BadRequestException('The completed template contains no filled missing fields.');return this.updateCorrections(user,id,corrections);
  }

  async cancel(user:any,id:string) { const batch=await this.ownedBatch(user,id);if(['IMPORTING','COMPLETED','PARTIALLY_COMPLETED','ROLLED_BACK'].includes(batch.status)||(await this.rows(batch)).some((row)=>row.result?.imported===true||row.result?.updated===true))throw new ConflictException('A batch with completed imports cannot be cancelled.');const {data,error}=await this.db.from('smart_import_batches').update({status:'CANCELLED',approved_preview_checksum:null,updated_at:new Date().toISOString()}).eq('id',id).eq('tenant_id',batch.tenant_id).select('*').single();if(error||!data)throw new ServiceUnavailableException('Batch cancellation could not be recorded.');await this.audit(data,user,'CANCELLED');return data; }

  async undo(user:any,id:string) {
    this.assertEnabled();this.assertAdmin(user);const batch=await this.ownedBatch(user,id);if(!['COMPLETED','PARTIALLY_COMPLETED'].includes(batch.status))throw new ConflictException('Only a completed master-data batch can be undone.');const undoRank:Record<string,number>={ITEM_SUPPLIER_MAPPING:0,SUPPLIER_CONTACT:1,ITEM:2,RAW_MATERIAL:2,FINISHED_GOOD:2,SUPPLIER:2,CUSTOMER:2};const rows=(await this.rows(batch)).filter((r)=>r.decision!=='UNDONE'&&r.created_entity_id&&r.created_table&&(r.result?.imported===true||r.result?.updated===true)).sort((a,b)=>(undoRank[a.target_entity]??2)-(undoRank[b.target_entity]??2));const client=this.pg();const outcomes:any[]=[];
    for(const row of rows){let connection:any;try{connection=await client.connect();await connection.query('BEGIN');
        if(row.result?.updated===true){const restored=await connection.query('UPDATE public.vendors SET contact_person=$1,updated_at=now() WHERE id=$2 AND tenant_id=$3 AND contact_person=$4',[row.result.previousContact,row.created_entity_id,batch.tenant_id,row.result.importedContact]);if(!restored.rowCount)throw new Error('The supplier contact changed after import; safe restoration is no longer possible.');await connection.query('COMMIT');outcomes.push({row:row.row_reference,status:'UNDONE'});await this.db.from('smart_import_batch_rows').update({decision:'UNDONE',undone_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',row.id);continue;}
        const linked=await connection.query(`SELECT conrelid::regclass::text AS table_name,a.attname AS column_name FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey) WHERE c.contype='f' AND c.confrelid=$1::regclass`,[`public.${row.created_table}`]);let used=false;for(const fk of linked.rows){const table=String(fk.table_name).split('.').pop();if(['smart_import_batch_rows','smart_import_audit_events'].includes(table))continue;const count=await connection.query(`SELECT EXISTS(SELECT 1 FROM public.${identifier(table)} WHERE ${identifier(fk.column_name)}=$1 LIMIT 1) used`,[row.created_entity_id]);if(count.rows[0].used){used=true;break;}}
        if(used){await connection.query('ROLLBACK');const message='This record is referenced by later business data; it was left in place.';outcomes.push({row:row.row_reference,status:'UNDO_BLOCKED_RECORD_IN_USE',reason:message});await this.db.from('smart_import_batch_rows').update({decision:'UNDO_BLOCKED_RECORD_IN_USE',result:{...safeJson(row.result),undoReason:message},updated_at:new Date().toISOString()}).eq('id',row.id);continue;}
        await connection.query(`DELETE FROM public.${identifier(row.created_table)} WHERE id=$1 AND tenant_id=$2`,[row.created_entity_id,batch.tenant_id]);await connection.query('COMMIT');outcomes.push({row:row.row_reference,status:'UNDONE'});await this.db.from('smart_import_batch_rows').update({decision:'UNDONE',undone_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',row.id);
      }catch(error:any){if(connection)await connection.query('ROLLBACK').catch(()=>undefined);outcomes.push({row:row.row_reference,status:'UNDO_BLOCKED_RECORD_IN_USE',reason:String(error?.message||'Undo safety check failed').slice(0,200)});}finally{connection?.release();}}
    const blocked=outcomes.some((x)=>x.status==='UNDO_BLOCKED_RECORD_IN_USE');const {data,error}=await this.db.from('smart_import_batches').update({status:blocked?'PARTIALLY_COMPLETED':'ROLLED_BACK',updated_at:new Date().toISOString()}).eq('id',id).eq('tenant_id',batch.tenant_id).select('*').single();if(error)throw new ServiceUnavailableException('Undo result could not be recorded.');await this.audit(data,user,'UNDO_FINISHED',{outcomes});return this.get(user,id);
  }
}
