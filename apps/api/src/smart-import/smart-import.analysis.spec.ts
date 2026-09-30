import ExcelJS from 'exceljs';
import { buildEntityDrafts, classifySmartImportIntent, classifyTransactionalSheet, fuzzyNameCandidates, normalizeKey, parseWorkbook, preserveUnknownBusinessValues, rowFingerprint, validateUpload } from './smart-import.analysis';

const file=(name:string,buffer:Buffer,mimetype='application/octet-stream')=>({originalname:name,buffer,size:buffer.length,mimetype} as Express.Multer.File);

describe('Smart Import workbook analysis',()=>{
  it('parses CSV headers and rows and calculates a checksum',async()=>{
    const parsed=await parseWorkbook(file('masters.csv',Buffer.from('Material,UOM\nPin,PCS\n')));
    expect(parsed.sheets[0].headers).toEqual(['Material','UOM']);expect(parsed.sheets[0].rows[0].values.Material).toBe('Pin');expect(parsed.sha256).toHaveLength(64);
  });
  it('parses multi-sheet XLSX without assuming sheet names',async()=>{
    const wb=new ExcelJS.Workbook();for(const title of ['First data','Supplier details']){const ws=wb.addWorksheet(title);ws.addRow(['Material','Supplier Company']);ws.addRow(['Pin','Northwind']);}
    const data=Buffer.from(await wb.xlsx.writeBuffer());const parsed=await parseWorkbook(file('book.xlsx',data,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'));
    expect(parsed.sheets.map(x=>x.name)).toEqual(['First data','Supplier details']);expect(parsed.sheets).toHaveLength(2);
  });
  it('maps item, supplier, customer, contact, and item-supplier relationships',()=>{
    const headers=['Material','Supplier Company','Supplier Contact','Customer Company'];
    const workbook={name:'Any',headers,rows:[],candidateEntities:[]};
    const mappings=headers.map((sourceColumn,sourceIndex)=>({sheet:'Any',sourceColumn,sourceIndex,targetEntity:sourceColumn==='Material'?'ITEM':sourceColumn==='Customer Company'?'CUSTOMER':'SUPPLIER',targetField:sourceColumn==='Material'?'name':sourceColumn==='Customer Company'?'customer_name':sourceColumn==='Supplier Contact'?'contact_person':'name',confidence:'HIGH' as const,reason:'test'}));
    const drafts=buildEntityDrafts(workbook,{rowNumber:2,values:{Material:'Pin', 'Supplier Company':'Northwind','Supplier Contact':'Sam','Customer Company':'Retailer'}},mappings);
    expect(drafts.map(x=>x.entity)).toEqual(expect.arrayContaining(['ITEM','SUPPLIER','SUPPLIER_CONTACT','CUSTOMER','ITEM_SUPPLIER_MAPPING']));
  });
  it('rejects legacy XLS, unsupported extensions, oversized files and formula-based data',async()=>{
    expect(()=>validateUpload(file('legacy.xls',Buffer.from('PK\u0003\u0004')))).toThrow(/Legacy XLS/);
    expect(()=>validateUpload(file('program.exe',Buffer.from('MZ')))).toThrow(/Unsupported/);
    expect(()=>validateUpload(file('large.csv',Buffer.alloc(15*1024*1024+1)))).toThrow(/15 MB/);
    const wb=new ExcelJS.Workbook();const ws=wb.addWorksheet('items');ws.addRow(['Material']);ws.getCell('A2').value={formula:'1+1'};const buffer=Buffer.from(await wb.xlsx.writeBuffer());await expect(parseWorkbook(file('formula.xlsx',buffer))).rejects.toThrow(/Formula/);
  });
  it('blocks transactional and attendance sheets from the generic master importer',()=>{
    expect(classifyTransactionalSheet(['PO Number','Material'])).toBe('TRANSACTION_IMPORT_REQUIRES_SPECIALIZED_IMPORTER');
    expect(classifyTransactionalSheet(['Employee ID','Attendance Date'])).toBe('ATTENDANCE');
  });
  it('routes clear import requests while leaving ordinary ERP and AutoEngineer requests alone',()=>{
    expect(classifySmartImportIntent('Import this Excel')).toBe(true);
    expect(classifySmartImportIntent('These are suppliers, load them into vendor master')).toBe(true);
    expect(classifySmartImportIntent('Create a purchase order for supplier')).toBe(false);
    expect(classifySmartImportIntent('AutoEngineer fix import routing')).toBe(false);
  });
  it('normalizes exact names and leaves fuzzy names as review candidates',()=>{
    expect(fuzzyNameCandidates('Hero Steel',[{id:'1',name:'HERO STEEL '}])).toEqual([]);
    expect(fuzzyNameCandidates('Hero Steel',[{id:'2',name:'Hero Steel Industries'}])[0].id).toBe('2');
  });
  it('preserves unknown tenant values as NULL and flags non-null prohibited defaults',()=>{
    const columns=new Map<string,{nullable:boolean;defaultValue:string|null}>([
      ['country',{nullable:true,defaultValue:"'India'"}],['shipping_country',{nullable:true,defaultValue:"'India'"}],
      ['credit_days',{nullable:true,defaultValue:'30'}],['tax_treatment',{nullable:false,defaultValue:"'REGISTERED'"}],
      ['bank_account_type',{nullable:true,defaultValue:"'CURRENT'"}],['hsn_code',{nullable:true,defaultValue:null}],
    ]);const values:Record<string,unknown>={};
    const issues=preserveUnknownBusinessValues(columns,values);
    expect(values).toEqual({country:null,shipping_country:null,credit_days:null,bank_account_type:null});
    expect(issues.map(x=>x.field)).toEqual(['tax_treatment']);
    expect(issues[0].message).toMatch(/will not apply its default/);
    expect(issues.some(x=>x.field==='hsn_code')).toBe(false);
  });
  it('detects explicit BOM parent/component relationships without inventing quantity',()=>{
    const headers=['Assembly','Component','Qty'];const mappings=headers.map((sourceColumn,sourceIndex)=>({sheet:'BOM data',sourceColumn,sourceIndex,targetEntity:'BOM',targetField:sourceColumn==='Assembly'?'parent_name':sourceColumn==='Component'?'component_name':'quantity',confidence:'MEDIUM' as const,reason:'test'}));
    const rows=buildEntityDrafts({name:'BOM data',headers,rows:[],candidateEntities:['BOM']},{rowNumber:2,values:{Assembly:'Frame',Component:'Steel tube',Qty:null}},mappings);
    expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({entity:'BOM',values:{parent_name:'Frame',component_name:'Steel tube',quantity:null}});
  });
  it('normalizes whitespace and case deterministically and fingerprints are row-stable',()=>{
    expect(normalizeKey('  HERO   STEEL ')).toBe('hero steel');
    expect(rowFingerprint('batch','sheet',2,'SUPPLIER',{name:'Northwind'})).toBe(rowFingerprint('batch','sheet',2,'SUPPLIER',{name:' northwind '}));
    expect(rowFingerprint('batch','sheet',2,'SUPPLIER',{name:'Northwind'})).not.toBe(rowFingerprint('batch','sheet',3,'SUPPLIER',{name:'Northwind'}));
  });
  it('rejects binary CSV and MIME/extension mismatch',()=>{
    expect(()=>validateUpload(file('binary.csv',Buffer.from([0,1,2])))).toThrow(/binary/);
    expect(()=>validateUpload(file('book.xlsx',Buffer.from('not a zip'),'text/csv'))).toThrow(/signature/);
  });
  it('blocks PR, invoice, opening stock, journal, payment and payroll source headers',()=>{
    for(const header of ['PR Number','Invoice Number','Opening Stock','Journal Entry','Payment Ref','Payroll Period'])
      expect(classifyTransactionalSheet([header])).toBe('TRANSACTION_IMPORT_REQUIRES_SPECIALIZED_IMPORTER');
  });
});
