import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import { Readable } from 'stream';
import ExcelJS from 'exceljs';

export const MAX_FILE_BYTES = 15 * 1024 * 1024;
export const MAX_SHEETS = 20;
export const MAX_ROWS_PER_SHEET = 20_000;
export const MAX_COLUMNS = 200;
const MAX_XLSX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024;
export const ALLOWED_ENTITIES = new Set([
  'ITEM', 'RAW_MATERIAL', 'FINISHED_GOOD', 'SUPPLIER', 'SUPPLIER_CONTACT',
  'CUSTOMER', 'ITEM_SUPPLIER_MAPPING', 'BOM', 'ATTENDANCE', 'OTHER',
]);
export const PROHIBITED_BUSINESS_DEFAULTS = new Set(['country','shipping_country','credit_days','credit_limit','payment_terms','tax_treatment','bank_account_type','customer_type','reorder_level','standard_cost','min_stock','max_stock','min_order_qty','moq','lead_time_days','hsn_code','tax_id']);

export function preserveUnknownBusinessValues(columns: Map<string,{nullable:boolean;defaultValue:string|null}>, values: Record<string,unknown>) {
  const issues:Array<{field:string;classification:'DB_REQUIRED';message:string}>=[];
  for(const [field,column] of columns){if(['id','created_at','updated_at','metadata','is_active','is_verified','approval_status','sales_blocked','delivery_blocked','billing_blocked','contacts','billing_addresses','shipping_addresses'].includes(field)||Object.prototype.hasOwnProperty.call(values,field))continue;
    const prohibited=PROHIBITED_BUSINESS_DEFAULTS.has(field)&&Boolean(column.defaultValue);
    if(column.nullable&&prohibited)values[field]=null;
    else if(!column.nullable&&!column.defaultValue&&field!=='tenant_id')issues.push({field,classification:'DB_REQUIRED',message:`${field} is required by this database schema.`});
    else if(!column.nullable&&prohibited)issues.push({field,classification:'DB_REQUIRED',message:`${field} is required by this database schema; Smart Import will not apply its default.`});
  }
  return issues;
}

export type SmartImportMapping = {
  sheet: string;
  sourceColumn: string;
  sourceIndex: number;
  targetEntity: string | null;
  targetField: string | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string;
};
export type ParsedSheet = {
  name: string;
  headers: string[];
  rows: Array<{ rowNumber: number; values: Record<string, unknown> }>;
  candidateEntities: string[];
};
export type ParsedWorkbook = {
  sheets: ParsedSheet[];
  mappings: SmartImportMapping[];
  sha256: string;
};

export function normalizeKey(value: unknown): string {
  return String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase('en-US').replace(/\s+/g, ' ');
}

export function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export function validateUpload(file: Express.Multer.File): 'xlsx' | 'csv' {
  if (!file?.buffer || file.size <= 0 || file.size > MAX_FILE_BYTES)
    throw new BadRequestException('Choose an XLSX or CSV file up to 15 MB.');
  const name = String(file.originalname || '').toLowerCase();
  if (name.endsWith('.xls'))
    throw new BadRequestException('Legacy XLS workbooks are not supported. Save as XLSX or CSV.');
  if (name.endsWith('.xlsx')) {
    const zipMagic = file.buffer.length >= 4 && file.buffer[0] === 0x50 && file.buffer[1] === 0x4b && [0x03, 0x05, 0x07].includes(file.buffer[2]) && [0x04, 0x06, 0x08].includes(file.buffer[3]);
    if (!zipMagic || !['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream', ''].includes(String(file.mimetype || '').toLowerCase()))
      throw new BadRequestException('The file extension, content type and workbook signature do not agree.');
    return 'xlsx';
  }
  if (name.endsWith('.csv')) {
    if (file.buffer.includes(0)) throw new BadRequestException('The CSV contains binary content.');
    const type = String(file.mimetype || '').toLowerCase();
    if (type && !['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain', 'application/octet-stream'].includes(type))
      throw new BadRequestException('The file extension and content type do not agree.');
    return 'csv';
  }
  throw new BadRequestException('Unsupported file type. Upload XLSX or CSV.');
}

function validateXlsxArchive(buffer:Buffer) {
  const first=Math.max(0,buffer.length-65_557);let end=-1;
  for(let i=buffer.length-22;i>=first;i--)if(buffer.readUInt32LE(i)===0x06054b50){end=i;break;}
  if(end<0)throw new BadRequestException('The XLSX workbook archive is malformed.');
  const entries=buffer.readUInt16LE(end+10);const size=buffer.readUInt32LE(end+12);let offset=buffer.readUInt32LE(end+16);
  if(entries===0xffff||size===0xffffffff||offset===0xffffffff||entries>1000||offset+size>buffer.length)throw new BadRequestException('The XLSX workbook archive exceeds supported limits.');
  let total=0;
  for(let i=0;i<entries;i++){
    if(offset+46>buffer.length||buffer.readUInt32LE(offset)!==0x02014b50)throw new BadRequestException('The XLSX workbook archive is malformed.');
    const flags=buffer.readUInt16LE(offset+8);if(flags&1)throw new BadRequestException('Encrypted XLSX workbooks are not supported.');
    const uncompressed=buffer.readUInt32LE(offset+24);const nameLength=buffer.readUInt16LE(offset+28);const extraLength=buffer.readUInt16LE(offset+30);const commentLength=buffer.readUInt16LE(offset+32);
    if(uncompressed===0xffffffff)throw new BadRequestException('XLSX ZIP64 workbooks are not supported.');
    total+=uncompressed;if(total>MAX_XLSX_UNCOMPRESSED_BYTES)throw new BadRequestException('The XLSX expands beyond the 100 MB safety limit.');
    offset+=46+nameLength+extraLength+commentLength;
  }
}

function cellValue(value: ExcelJS.CellValue): unknown {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('formula' in value || 'sharedFormula' in value)
      throw new BadRequestException('Formula cells are not accepted. Replace formulas with reviewed values before upload.');
    if ('text' in value && typeof value.text === 'string') return value.text.trim();
    if ('richText' in value && Array.isArray(value.richText)) return value.richText.map((part) => part.text).join('').trim();
    if ('result' in value) return cellValue(value.result as ExcelJS.CellValue);
    return JSON.stringify(value);
  }
  if (typeof value === 'string') return value.trim();
  return value;
}

function normalizedHeader(value: unknown): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function mappingFor(sheet: string, header: string, sourceIndex: number): SmartImportMapping {
  const key = normalizeKey(header).replace(/[^a-z0-9]+/g, '');
  const entries: Array<[RegExp, string, string, 'HIGH' | 'MEDIUM' | 'LOW', string]> = [
    [/^(suppliercompany|suppliername|vendorname|vendor|supplier)$/,'SUPPLIER','name','HIGH','Supplier/company name heading.'],
    [/^(supplierlegalname|legalname)$/,'SUPPLIER','legal_name','HIGH','Explicit legal-name heading.'],
    [/^(suppliercontact|vendorcontact|contactperson|contactname)$/,'SUPPLIER','contact_person','HIGH','Supplier contact heading.'],
    [/^(material|itemname|item|productname|product|finishedgood|rawmaterial)$/,'ITEM','name','HIGH','Material or item name heading.'],
    [/^(itemcode|materialcode|productcode|sku|code)$/,'ITEM','code','HIGH','Explicit item code heading.'],
    [/^(uom|unitofmeasure|unit)$/,'ITEM','uom','HIGH','Explicit unit-of-measure heading.'],
    [/^(category|itemcategory|materialtype)$/,'ITEM','category','MEDIUM','Item classification heading.'],
    [/^(hsn|hsncode|hsnnumber)$/,'ITEM','hsn_code','HIGH','Explicit HSN heading.'],
    [/^(description|itemdescription|materialdescription)$/,'ITEM','description','HIGH','Explicit description heading.'],
    [/^(customercompany|customername|customer|clientname|client)$/,'CUSTOMER','customer_name','HIGH','Customer/company name heading.'],
    [/^(customercode|clientcode)$/,'CUSTOMER','customer_code','HIGH','Explicit customer code heading.'],
    [/^(customercontact|customercontactperson)$/,'CUSTOMER','contact_person','HIGH','Customer contact heading.'],
    [/^(email|emailaddress)$/,'OTHER','email','MEDIUM','Email heading; target depends on entity mapping.'],
    [/^(phone|telephone|mobile|mobilenumber)$/,'OTHER','phone','MEDIUM','Phone heading; target depends on entity mapping.'],
    [/^(billingaddress)$/,'CUSTOMER','billing_address','HIGH','Explicit billing address heading.'],
    [/^(shippingaddress)$/,'CUSTOMER','shipping_address','HIGH','Explicit shipping address heading.'],
    [/^(address|addressline)$/,'OTHER','address','LOW','Generic address can have multiple business meanings.'],
    [/^(country)$/,'OTHER','country','HIGH','Explicit country heading; preserve source value only.'],
    [/^(paymentterms|paymentterm)$/,'SUPPLIER','payment_terms','HIGH','Explicit payment terms heading.'],
    [/^(creditdays)$/,'CUSTOMER','credit_days','HIGH','Explicit credit-days heading.'],
    [/^(taxtreatment|taxstatus)$/,'CUSTOMER','tax_treatment','HIGH','Explicit tax-treatment heading.'],
    [/^(taxid|gstnumber|vatnumber|taxnumber)$/,'OTHER','tax_id','MEDIUM','Tax identifier heading; entity-specific review may be needed.'],
    [/^(suppliercompanyname)$/,'SUPPLIER','name','HIGH','Supplier/company name heading.'],
    [/^(component|componentname|bomcomponent)$/,'BOM','component_name','MEDIUM','BOM component relationship heading.'],
    [/^(parentitem|parentproduct|finishedproduct|bomparent|assembly)$/,'BOM','parent_name','MEDIUM','Possible BOM parent; confirm this relationship.'],
    [/^(quantity|qty|componentquantity|bomquantity)$/,'BOM','quantity','HIGH','Explicit quantity heading.'],
    [/^(employee|employeename|employeeid|attendance|checkin|checkout)$/,'ATTENDANCE','source_value','HIGH','Attendance data is routed to the specialized importer.'],
    [/^(ponumber|purchaseorder|grn|grnnumber|invoice|invoicenumber|stock|openingstock|payment)$/,'OTHER','transactional','HIGH','Transactional data requires a specialized importer.'],
  ];
  const match = entries.find(([pattern]) => pattern.test(key));
  if (!match) return { sheet, sourceColumn: header, sourceIndex, targetEntity: null, targetField: null, confidence: 'LOW', reason: 'No safe deterministic heading match; choose a target or leave unmapped.' };
  return { sheet, sourceColumn: header, sourceIndex, targetEntity: match[1], targetField: match[2], confidence: match[3], reason: match[4] };
}

function candidateEntities(mappings: SmartImportMapping[]): string[] {
  const targets = new Set(mappings.map((m) => m.targetEntity).filter(Boolean));
  const entity = new Set<string>();
  if (targets.has('ATTENDANCE')) entity.add('ATTENDANCE');
  else if (['ponumber','grn','invoice','stock','payment'].some((key) => mappings.some((m) => normalizeKey(m.sourceColumn).replace(/[^a-z0-9]/g,'').includes(key)))) entity.add('OTHER');
  else {
    if (targets.has('SUPPLIER')) entity.add('SUPPLIER');
    if (targets.has('ITEM')) entity.add('ITEM');
    if (targets.has('CUSTOMER')) entity.add('CUSTOMER');
    if (targets.has('BOM')) entity.add('BOM');
    if (targets.has('SUPPLIER') && targets.has('ITEM')) entity.add('ITEM_SUPPLIER_MAPPING');
  }
  return entity.size ? [...entity] : ['OTHER'];
}

export async function parseWorkbook(file: Express.Multer.File): Promise<ParsedWorkbook> {
  const type = validateUpload(file);
  const workbook = new ExcelJS.Workbook();
  try {
    if (type === 'xlsx') { validateXlsxArchive(file.buffer); await workbook.xlsx.load(file.buffer); }
    else await workbook.csv.read(Readable.from([file.buffer]), { parserOptions: { bom: true, skipEmptyLines: true } });
  } catch {
    throw new BadRequestException('The workbook is malformed or could not be read.');
  }
  if (!workbook.worksheets.length || workbook.worksheets.length > MAX_SHEETS)
    throw new BadRequestException(`The workbook must contain 1–${MAX_SHEETS} sheets.`);
  const mappings: SmartImportMapping[] = [];
  const sheets: ParsedSheet[] = [];
  let workbookRows = 0;
  for (const worksheet of workbook.worksheets) {
    const nonEmptyRows = worksheet.getRows(1, worksheet.rowCount)?.filter((row) => row.values.some((value) => value != null && String(value).trim() !== '')) || [];
    if (!nonEmptyRows.length) continue;
    const headerRow = nonEmptyRows[0];
    const headers: string[] = [];
    const maxColumn = Math.min(worksheet.columnCount, MAX_COLUMNS);
    for (let col = 1; col <= maxColumn; col++) {
      const raw = normalizedHeader(cellValue(headerRow.getCell(col).value as ExcelJS.CellValue));
      headers.push(raw ? (headers.includes(raw) ? `${raw} (${col})` : raw) : `Column ${col}`);
    }
    if (!headers.some((x) => !/^Column \d+$/.test(x))) continue;
    const sheetMappings = headers.map((header, idx) => mappingFor(worksheet.name, header, idx + 1));
    mappings.push(...sheetMappings);
    const rows = [] as ParsedSheet['rows'];
    for (const row of nonEmptyRows.slice(1)) {
      const values: Record<string, unknown> = {};
      for (let col = 1; col <= maxColumn; col++) {
        const value = cellValue(row.getCell(col).value as ExcelJS.CellValue);
        if (typeof value === 'string' && value.length > 5000) throw new BadRequestException('A workbook cell exceeds the 5,000 character limit.');
        values[headers[col - 1]] = value;
      }
      if (Object.values(values).some((value) => value != null && String(value).trim() !== '')) rows.push({ rowNumber: row.number, values });
    }
    if (rows.length > MAX_ROWS_PER_SHEET) throw new BadRequestException(`Sheet ${worksheet.name} exceeds ${MAX_ROWS_PER_SHEET} data rows.`);
    workbookRows += rows.length;
    if (workbookRows > MAX_ROWS_PER_SHEET) throw new BadRequestException(`The workbook exceeds ${MAX_ROWS_PER_SHEET} total data rows.`);
    sheets.push({ name: worksheet.name.slice(0, 120), headers, rows, candidateEntities: candidateEntities(sheetMappings) });
  }
  if (!sheets.length) throw new BadRequestException('No usable sheet with a header row and data was found.');
  return { sheets, mappings, sha256: sha256(file.buffer) };
}

export function classifySmartImportIntent(message: string): boolean {
  const text = String(message || '').toLowerCase();
  const explicit = /\b(import|upload|load|bulk add|spreadsheet|workbook|excel|csv)\b/.test(text);
  const dataObject = /\b(excel|xlsx|csv|spreadsheet|workbook|supplier|vendor|item|material|product|customer|attendance|master data)\b/.test(text);
  return explicit && dataObject && !/\b(autoengineer|autoheal|bug report|feature request|fix the (?:erp|system|software))\b/.test(text);
}

export function classifyTransactionalSheet(headers: string[]): 'ATTENDANCE' | 'TRANSACTION_IMPORT_REQUIRES_SPECIALIZED_IMPORTER' | null {
  const keys = headers.map((x) => normalizeKey(x).replace(/[^a-z0-9]/g,''));
  if (keys.some((x) => /^(employee(name|id)?|attendance(date)?|checkin|checkout|punch(date|time)?)$/.test(x))) return 'ATTENDANCE';
  if (keys.some((x) => /^(po(number|date)?|purchaseorder|pr(number|date)?|purchaserequisition|grn(number|date)?|invoicenumber|invoice(date)?|stockmovement|openingstock|journal\w*|payment\w*|payroll\w*)$/.test(x))) return 'TRANSACTION_IMPORT_REQUIRES_SPECIALIZED_IMPORTER';
  return null;
}

export function buildEntityDrafts(sheet: ParsedSheet, row: ParsedSheet['rows'][number], mappings: SmartImportMapping[]) {
  const scoped = mappings.filter((mapping) => mapping.sheet === sheet.name && mapping.targetEntity && mapping.targetField);
  const valueFor = (entity: string, field: string) => {
    const mapping = scoped.find((entry) => entry.targetEntity === entity && entry.targetField === field && entry.confidence !== 'LOW');
    return mapping ? row.values[mapping.sourceColumn] : undefined;
  };
  const supplierName = valueFor('SUPPLIER', 'name');
  const supplierContact = valueFor('SUPPLIER', 'contact_person');
  const itemName = valueFor('ITEM', 'name');
  const customerName = valueFor('CUSTOMER', 'customer_name');
  const bomParent = valueFor('BOM', 'parent_name');
  const bomComponent = valueFor('BOM', 'component_name');
  const direct = (entity: string, fields: string[]) => {
    const data: Record<string, unknown> = {};
    for (const mapping of scoped.filter((m) => m.targetEntity === entity && m.targetField && m.confidence !== 'LOW')) {
      const value = row.values[mapping.sourceColumn];
      if (value != null && String(value).trim() !== '') data[mapping.targetField!] = value;
    }
    return data;
  };
  const drafts: Array<{ entity: string; values: Record<string, unknown>; confidence: 'HIGH'|'MEDIUM'|'LOW'; rowNumber: number; sheet: string }> = [];
  if (supplierName) drafts.push({ entity: 'SUPPLIER', values: direct('SUPPLIER', ['name','legal_name','code','email','phone','address','country','payment_terms','tax_id']), confidence: scoped.filter((x) => x.targetEntity === 'SUPPLIER').some((x) => x.confidence === 'LOW') ? 'LOW' : scoped.filter((x) => x.targetEntity === 'SUPPLIER').some((x) => x.confidence === 'MEDIUM') ? 'MEDIUM' : 'HIGH', rowNumber: row.rowNumber, sheet: sheet.name });
  if (supplierName && supplierContact) drafts.push({ entity: 'SUPPLIER_CONTACT', values: { supplier_name: supplierName, contact_person: supplierContact }, confidence: 'HIGH', rowNumber: row.rowNumber, sheet: sheet.name });
  else if (supplierContact) drafts.push({ entity: 'SUPPLIER_CONTACT', values: { supplier_name: null, contact_person: supplierContact }, confidence: 'MEDIUM', rowNumber: row.rowNumber, sheet: sheet.name });
  if (itemName) drafts.push({ entity: 'ITEM', values: direct('ITEM', ['name','code','description','category','uom','hsn_code']), confidence: scoped.filter((x) => x.targetEntity === 'ITEM').some((x) => x.confidence === 'LOW') ? 'LOW' : scoped.filter((x) => x.targetEntity === 'ITEM').some((x) => x.confidence === 'MEDIUM') ? 'MEDIUM' : 'HIGH', rowNumber: row.rowNumber, sheet: sheet.name });
  if (customerName) drafts.push({ entity: 'CUSTOMER', values: direct('CUSTOMER', ['customer_name','customer_code','contact_person','email','phone','billing_address','shipping_address','country','credit_days','tax_treatment']), confidence: scoped.filter((x) => x.targetEntity === 'CUSTOMER').some((x) => x.confidence === 'LOW') ? 'LOW' : 'HIGH', rowNumber: row.rowNumber, sheet: sheet.name });
  if (supplierName && itemName) drafts.push({ entity: 'ITEM_SUPPLIER_MAPPING', values: { supplier_name: supplierName, item_name: itemName }, confidence: 'HIGH', rowNumber: row.rowNumber, sheet: sheet.name });
  if (bomParent || bomComponent) drafts.push({ entity: 'BOM', values: { parent_name: bomParent ?? null, component_name: bomComponent ?? null, quantity: valueFor('BOM','quantity') ?? null }, confidence: 'MEDIUM', rowNumber: row.rowNumber, sheet: sheet.name });
  if (!drafts.length) {
    const blocked = classifyTransactionalSheet(sheet.headers);
    drafts.push({ entity: blocked || 'OTHER', values: { source: row.values }, confidence: 'LOW', rowNumber: row.rowNumber, sheet: sheet.name });
  }
  return drafts;
}

export function rowFingerprint(batchId: string, sheet: string, rowNumber: number, entity: string, values: Record<string, unknown>): string {
  const keys = entity === 'SUPPLIER' || entity === 'SUPPLIER_CONTACT' ? ['name','supplier_name','contact_person'] : entity === 'ITEM' ? ['code','name'] : entity === 'CUSTOMER' ? ['customer_code','customer_name'] : entity === 'ITEM_SUPPLIER_MAPPING' ? ['item_name','supplier_name'] : [];
  const identity = keys.length ? keys.map((key) => normalizeKey(values[key])).join('|') : `${sheet}|${rowNumber}`;
  return createHash('sha256').update(`${batchId}|${sheet}|${rowNumber}|${entity}|${identity}`).digest('hex');
}

export function fuzzyNameCandidates(value: string, names: Array<{ id: string; name: string }>) {
  const a = normalizeKey(value);
  if (!a) return [];
  return names.map((row) => {
    const b = normalizeKey(row.name);
    const distance = levenshtein(a, b);
    const prefixSimilarity = a.startsWith(b) || b.startsWith(a) ? 0.8 : 0;
    const score = Math.max(prefixSimilarity, 1 - distance / Math.max(a.length, b.length, 1));
    return { ...row, score: Number(score.toFixed(3)) };
  }).filter((row) => row.score >= 0.78 && normalizeKey(row.name) !== a).sort((x, y) => y.score - x.score).slice(0, 3);
}

function levenshtein(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const old = previous[j];
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = old;
    }
  }
  return previous[b.length];
}
