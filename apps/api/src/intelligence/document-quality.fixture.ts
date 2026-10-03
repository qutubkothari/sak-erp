import sharp from 'sharp';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { Readable } from 'node:stream';

export const DOCUMENT_QUALITY_CASES = ['clean-quotation', 'photographed-quotation', 'rotated-invoice', 'low-contrast', 'mixed-raster-pdf', 'drawing-title-block', 'image-table'] as const;
export type DocumentQualityCase = typeof DOCUMENT_QUALITY_CASES[number];
export async function documentQualityFixture(kind: DocumentQualityCase): Promise<Express.Multer.File> {
  const drawing = kind === 'drawing-title-block';
  const invoice = kind === 'rotated-invoice';
  const rows = drawing ? ['Title: Fixture Drawing', 'Drawing number: FIX-D-001', 'Revision: A', 'Part number: FIX-ITEM-1', 'Dimensions: 20 x 30 mm'] : [
    'Supplier: Fixture Engineering', invoice ? 'Invoice number: FIX-I-001' : 'Quotation number: FIX-Q-001',
    'Currency: USD', 'Item code | Description | Quantity | UOM | Unit rate | Line amount',
    'FIX-ITEM-1 | Fixture bearing | 12 | NOS | 10 | 120',
  ];
  const image = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="${kind === 'low-contrast' ? '#cccccc' : '#ffffff'}"/>${rows.map((text,index) => `<text x="40" y="${70 + index * 65}" font-family="sans-serif" font-size="25" fill="${kind === 'low-contrast' ? '#aaaaaa' : '#111111'}">${text}</text>`).join('')}</svg>`);
  const raster = await sharp(image).png().toBuffer();
  let buffer: Buffer, mimetype: string, originalname: string;
  if (kind === 'clean-quotation' || kind === 'mixed-raster-pdf') {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const page = pdf.addPage([1200,800]);
    rows.forEach((text,index) => page.drawText(text, { x:40, y:730-index*65, size:25, font }));
    if (kind === 'mixed-raster-pdf') {
      const embedded = await pdf.embedPng(raster);
      pdf.addPage([1200,800]).drawImage(embedded, {x:0,y:0,width:1200,height:800});
    }
    buffer = Buffer.from(await pdf.save()); mimetype = 'application/pdf'; originalname = 'fixture-quotation.pdf';
  } else if (invoice || kind === 'photographed-quotation') {
    const photo = sharp(raster);
    buffer = await (invoice ? photo.withMetadata({orientation:6}) : photo.rotate(3,{background:'#eeeeee'})).jpeg({quality:85}).toBuffer();
    mimetype = 'image/jpeg'; originalname = invoice ? 'fixture-invoice.jpg' : 'fixture-quotation.jpg';
  } else { buffer = raster; mimetype = 'image/png'; originalname = drawing ? 'fixture-drawing.png' : 'fixture-quotation-table.png'; }
  return { fieldname:'file',originalname,encoding:'7bit',mimetype,size:buffer.length,buffer,destination:'',filename:originalname,path:'',stream:Readable.from(buffer) };
}