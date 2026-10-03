import sharp from 'sharp';
import { emptyExtraction } from './document-analysis.engine';
import { extractDocument, safeDocumentFile } from './document-analysis.extraction';
import { DOCUMENT_QUALITY_CASES, documentQualityFixture } from './document-quality.fixture';
const mockCreateResponse = jest.fn();
jest.mock('openai', () => ({ __esModule:true, default:jest.fn(() => ({ responses:{create:mockCreateResponse} })) }));
describe('Bounded OCR preprocessing and fallback', () => {
  const previousKey=process.env.OPENAI_API_KEY;
  beforeEach(()=>{process.env.OPENAI_API_KEY='test-only-not-a-real-key';mockCreateResponse.mockReset();});
  afterAll(()=>{if(previousKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=previousKey;});
  it('applies EXIF orientation and removes active image metadata',async()=>{
    const buffer=await sharp({create:{width:12,height:20,channels:3,background:'#ffffff'}}).jpeg().withMetadata({orientation:6}).toBuffer();
    const sanitized=await safeDocumentFile({buffer,size:buffer.length,mimetype:'image/jpeg',originalname:'quotation.jpg'} as any);
    const metadata=await sharp(sanitized.bytes).metadata();
    expect(metadata.width).toBe(20);expect(metadata.height).toBe(12);expect(metadata.orientation).toBeUndefined();
  });
  it('bounds raster dimensions without enlarging small images',async()=>{
    const buffer=await sharp({create:{width:4000,height:100,channels:3,background:'#ffffff'}}).png().toBuffer();
    const sanitized=await safeDocumentFile({buffer,size:buffer.length,mimetype:'image/png',originalname:'invoice.png'} as any);
    expect((await sharp(sanitized.bytes).metadata()).width).toBe(3000);
  });
  it('includes the safe PDF for raster pages in a mixed multipage document',async()=>{
    mockCreateResponse.mockResolvedValue({output_text:JSON.stringify(emptyExtraction())});
    await extractDocument({bytes:Buffer.from('%PDF- fixture only'),mime:'application/pdf',pages:[{page:1,text:'Supplier: Real text source'},{page:2,text:''}]},'invoice.pdf','compare');
    const request=mockCreateResponse.mock.calls[0][0];
    expect(request.input[0].content.some((part:any)=>part.type==='input_file')).toBe(true);
    expect(request.input[0].content.some((part:any)=>part.type==='input_text'&&part.text.includes('Real text source'))).toBe(true);
    expect(request.store).toBe(false);
  });
  it('rejects OCR facts referencing nonexistent pages',async()=>{
    const extraction=emptyExtraction();extraction.fields.supplier={kind:'EXTRACTED_FACT',value:'Supplier',page:99,snippet:'Supplier',confidence:'HIGH',method:'VISION_OCR'};
    mockCreateResponse.mockResolvedValue({output_text:JSON.stringify(extraction)});
    const result=await extractDocument({bytes:Buffer.from('image fixture'),mime:'image/png',pages:[]},'document.png','');
    expect(result.fields.supplier.value).toBeNull();expect(result.fields.supplier.confidence).toBe('LOW');
  });
  it('extracts raster pages even when another page has verified line items',async()=>{
    const extraction=emptyExtraction('SUPPLIER_INVOICE');
    extraction.fields.invoice_number={kind:'EXTRACTED_FACT',value:'INV-2',page:2,snippet:'Invoice number: INV-2',confidence:'HIGH',method:'VISION_OCR'};
    mockCreateResponse.mockResolvedValue({output_text:JSON.stringify(extraction)});
    const result=await extractDocument({bytes:Buffer.from('%PDF- fixture'),mime:'application/pdf',pages:[{page:1,text:'Item code | Description | Quantity\nITEM-1 | Recorded item | 3'},{page:2,text:''}]},'invoice.pdf','');
    expect(mockCreateResponse).toHaveBeenCalledTimes(1);
    expect(result.lines[0].source_item_code.value).toBe('ITEM-1');
    expect(result.lines[0].quantity.confidence).toBe('HIGH');
    expect(result.fields.invoice_number.value).toBe('INV-2');
    expect(result.fields.invoice_number.confidence).toBe('MEDIUM');
  });
  it('still rejects unsupported snippets on text-bearing pages in mixed PDFs',async()=>{
    const extraction=emptyExtraction();extraction.fields.supplier={kind:'EXTRACTED_FACT',value:'Invented',page:1,snippet:'Invented',confidence:'HIGH',method:'VISION_OCR'};
    mockCreateResponse.mockResolvedValue({output_text:JSON.stringify(extraction)});
    const result=await extractDocument({bytes:Buffer.from('%PDF- fixture'),mime:'application/pdf',pages:[{page:1,text:'Recorded text'},{page:2,text:''}]},'document.pdf','');
    expect(result.fields.supplier.value).toBeNull();
  });
  it('does not promote image extraction confidence',async()=>{
    const extraction=emptyExtraction('SUPPLIER_QUOTATION');extraction.classification_confidence='HIGH';extraction.fields.supplier={kind:'EXTRACTED_FACT',value:'Supplier',page:1,snippet:'Supplier',confidence:'HIGH',method:'VISION_OCR'};
    mockCreateResponse.mockResolvedValue({output_text:JSON.stringify(extraction)});
    const result=await extractDocument({bytes:Buffer.from('image fixture'),mime:'image/png',pages:[]},'quotation.png','');
    expect(result.classification_confidence).toBe('MEDIUM');expect(result.fields.supplier.confidence).toBe('MEDIUM');
  });
  it('preserves verified text headers when structured OCR is incomplete',async()=>{
    mockCreateResponse.mockResolvedValue({output_text:JSON.stringify(emptyExtraction())});
    const result=await extractDocument({bytes:Buffer.from('%PDF- fixture'),mime:'application/pdf',pages:[{page:1,text:'Supplier: Recorded Supplier\nCurrency: EGP'}]},'quotation.pdf','');
    expect(result.fields.currency.value).toBe('EGP');expect(result.fields.currency.method).toBe('PDF_TEXT');
  });
  it('keeps manual fallback when the extraction provider fails',async()=>{
    mockCreateResponse.mockRejectedValue(new Error('Unavailable'));
    const result=await extractDocument({bytes:Buffer.from('fixture'),mime:'image/png',pages:[]},'document.png','');
    expect(result.warnings.join(' ')).toContain('manually');expect(result.fields.supplier.value).toBeNull();
  });
  it('never upgrades provider LOW confidence', async () => {
    const extraction = emptyExtraction();
    extraction.fields.supplier = {kind:'EXTRACTED_FACT',value:'Unclear Supplier',page:1,snippet:'Unclear Supplier',confidence:'LOW',method:'VISION_OCR'};
    mockCreateResponse.mockResolvedValue({output_text:JSON.stringify(extraction)});
    const result = await extractDocument({bytes:Buffer.from('image fixture'),mime:'image/png',pages:[]},'quotation.png','');
    expect(result.fields.supplier.confidence).toBe('LOW');
    expect(mockCreateResponse).toHaveBeenCalledTimes(1);
  });
  it.each(DOCUMENT_QUALITY_CASES)('validates synthetic quality evidence and bounded fallback for %s', async kind => {
    const fixture = await documentQualityFixture(kind);
    const safe = await safeDocumentFile(fixture);
    const drawing = kind === 'drawing-title-block', invoice = kind === 'rotated-invoice';
    const extraction = emptyExtraction(drawing ? 'TECHNICAL_DRAWING' : invoice ? 'SUPPLIER_INVOICE' : 'SUPPLIER_QUOTATION');
    extraction.classification_confidence = 'HIGH';
    const field = drawing ? 'drawing_number' : invoice ? 'invoice_number' : 'quotation_number';
    const value = drawing ? 'FIX-D-001' : invoice ? 'FIX-I-001' : 'FIX-Q-001';
    extraction.fields[field] = {kind:'EXTRACTED_FACT',value,page:kind === 'mixed-raster-pdf' ? 2 : 1,snippet:value,confidence:kind === 'low-contrast' ? 'LOW' : 'HIGH',method:'VISION_OCR'};
    mockCreateResponse.mockResolvedValue({output_text:JSON.stringify(extraction)});
    const result = await extractDocument(safe,fixture.originalname,'');
    expect(result.type).toBe(extraction.type);
    expect(result.fields[field].value).toBe(value);
    expect(result.fields[field].page).toBeGreaterThanOrEqual(1);
    expect(['HIGH','MEDIUM','LOW']).toContain(result.fields[field].confidence);
    if (kind === 'clean-quotation' || kind === 'mixed-raster-pdf') {
      expect(result.lines[0].quantity.value).toBe(12);
      expect(result.lines[0].quantity.confidence).toBe('HIGH');
    } else expect(result.fields[field].confidence).toBe(kind === 'low-contrast' ? 'LOW' : 'MEDIUM');
    expect(mockCreateResponse.mock.calls.length).toBeLessThanOrEqual(1);
    mockCreateResponse.mockReset(); mockCreateResponse.mockRejectedValue(new Error('Unavailable'));
    const fallback = await extractDocument(safe,fixture.originalname,'');
    if (safe.mime !== 'application/pdf') expect(fallback.warnings.join(' ')).toContain('manually');
    expect(mockCreateResponse.mock.calls.length).toBeLessThanOrEqual(1);
  }, 30000);
  it('extracts only raster pages with their original evidence map', async () => {
    const { PDFDocument, StandardFonts } = await import('pdf-lib');
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    pdf.addPage().drawText('Supplier: Fixture Engineering', {font});
    pdf.addPage();
    const buffer = Buffer.from(await pdf.save());
    const safe = await safeDocumentFile({buffer,size:buffer.length,mimetype:'application/pdf',originalname:'mixed.pdf'} as Express.Multer.File);
    expect(safe.rasterPageNumbers).toEqual([2]);
    if (!safe.rasterPdf) throw new Error('Expected selective raster PDF');
    expect((await PDFDocument.load(safe.rasterPdf)).getPageCount()).toBe(1);
    mockCreateResponse.mockResolvedValue({output_text:JSON.stringify(emptyExtraction())});
    const result = await extractDocument(safe,'quotation.pdf','');
    expect(result.fields.supplier.value).toBe('Fixture Engineering');
    expect(result.fields.supplier.confidence).toBe('HIGH');
    expect(mockCreateResponse.mock.calls[0][0].input[0].content.some((part: {text?:string}) => part.text?.includes('original_page'))).toBe(true);
    expect(mockCreateResponse).toHaveBeenCalledTimes(1);
  }, 30000);
});