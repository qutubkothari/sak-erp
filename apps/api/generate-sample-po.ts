/**
 * Standalone script to generate a sample PO PDF for visual testing.
 * Run from apps/api directory:
 *   node_modules\.bin\ts-node.cmd -r reflect-metadata --transpile-only generate-sample-po.ts
 */

import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { WorldClassPoPdfService } from './src/purchase/services/world-class-po-pdf.service';
import { DocumentBrandingService } from './src/common/services/document-branding.service';

// ── Minimal ConfigService stub ────────────────────────────────────────────────
const configStub: any = {
  get: (key: string) => {
    const cfg: Record<string, string> = {
      COMPANY_NAME:    'SAK Industries Pvt. Ltd.',
      COMPANY_ADDRESS: '12-4-56, Industrial Estate, Vijayawada, Andhra Pradesh 520001',
      COMPANY_PHONE:   '+91 9876543210',
      COMPANY_EMAIL:   'purchase@sakindustries.in',
      COMPANY_WEBSITE: 'www.sakindustries.in',
      COMPANY_GST:     '37AAACS1234A1Z5',
    };
    return cfg[key] ?? '';
  },
};

// Build a real DocumentBrandingService (no Supabase – SUPABASE_URL not set so it skips DB)
const brandingService = new DocumentBrandingService(configStub);
// Patch getBranding to return hardcoded data (skip Supabase DB call)
(brandingService as any).getBranding = async (_tenantId: string, overrides?: any) => {
  const companyName = overrides?.companyName || 'SAK Industries Pvt. Ltd.';
  const address = overrides?.address || '12-4-56, Industrial Estate, Vijayawada, Andhra Pradesh - 520001';
  const phone = overrides?.phone || '+91 9876543210';
  const email = overrides?.email || 'purchase@sakindustries.in';
  const website = overrides?.website || 'www.sakindustries.in';
  return {
    companyName,
    legalName: companyName,
    address,
    phone,
    email,
    website,
    taxId: overrides?.taxId || '37AAACS1234A1Z5',
    logoUrl: '',
    initials: companyName.split(/\s+/).map((part: string) => part[0] || '').join('').slice(0, 2).toUpperCase(),
    addressLines: address.split(/\r?\n|,(?=\s*[A-Za-z0-9])/).map((part: string) => part.trim()).filter(Boolean),
    contactLine: [phone ? `Phone: ${phone}` : '', email ? `Email: ${email}` : '', website ? website : ''].filter(Boolean).join('  |  '),
  };
};


// ── Sample PO Data ────────────────────────────────────────────────────────────
const sampleData: any = {
  poNumber:              'PO/2025-26/0042',
  poDate:                '2025-04-28',
  revision:              0,
  quotationRef:          'QUO-2025-1021',
  prNumber:              'PR/2025/0018',

  vendorName:            'Precision Components Pvt. Ltd.',
  vendorCode:            'V0087',
  vendorAddress:         'Plot No. 45, APIIC Industrial Park',
  vendorCity:            'Hyderabad',
  vendorState:           'Telangana',
  vendorPincode:         '500081',
  vendorCountry:         'India',
  vendorGSTIN:           '36AABCP5678Q1Z3',
  vendorEmail:           'sales@precisioncomp.in',
  vendorPhone:           '+91 9000011111',
  vendorContactPerson:   'Mr. Rahul Sharma',

  companyName:           'SAK Industries Pvt. Ltd.',
  companyAddress:        '12-4-56, Industrial Estate',
  companyCity:           'Vijayawada',
  companyState:          'Andhra Pradesh',
  companyPincode:        '520001',
  companyGSTIN:          '37AAACS1234A1Z5',
  companyEmail:          'purchase@sakindustries.in',
  companyPhone:          '+91 9876543210',
  companyWebsite:        'www.sakindustries.in',

  deliveryAddress:       '12-4-56, Industrial Estate',
  deliveryCity:          'Vijayawada',
  deliveryState:         'Andhra Pradesh',
  deliveryPincode:       '520001',
  deliveryContactPerson: 'Mr. Store Keeper',
  deliveryPhone:         '+91 9876543211',

  items: [
    {
      sl_no: 1,
      item_code: 'MC-0045-A',
      item_name: 'Mild Steel Angle 50x50x5 mm',
      description: 'IS 2062 E250 Grade, Hot Rolled',
      hsn_code: '7216',
      quantity: 500,
      uom: 'KG',
      unit_price: 65.00,
      discount_percent: 2,
      discount_amount: 650.00,
      taxable_amount: 31850.00,
      cgst_rate: 9,
      cgst_amount: 2866.50,
      sgst_rate: 9,
      sgst_amount: 2866.50,
      igst_rate: 0,
      igst_amount: 0,
      total_price: 37583.00,
    },
    {
      sl_no: 2,
      item_code: 'MC-0112-B',
      item_name: 'MS Flat Bar 50x6 mm',
      description: 'IS 2062 Grade, Hot Rolled, Length 6m',
      hsn_code: '7216',
      quantity: 200,
      uom: 'KG',
      unit_price: 68.00,
      discount_percent: 0,
      discount_amount: 0,
      taxable_amount: 13600.00,
      cgst_rate: 9,
      cgst_amount: 1224.00,
      sgst_rate: 9,
      sgst_amount: 1224.00,
      igst_rate: 0,
      igst_amount: 0,
      total_price: 16048.00,
    },
    {
      sl_no: 3,
      item_code: 'HW-0023-C',
      item_name: 'M12 Hex Bolt & Nut Set (Gr 8.8)',
      description: 'Length 50mm, Hot Dip Galvanised, DIN 931',
      hsn_code: '7318',
      quantity: 1000,
      uom: 'NOS',
      unit_price: 12.50,
      discount_percent: 5,
      discount_amount: 625.00,
      taxable_amount: 11875.00,
      cgst_rate: 9,
      cgst_amount: 1068.75,
      sgst_rate: 9,
      sgst_amount: 1068.75,
      igst_rate: 0,
      igst_amount: 0,
      total_price: 14012.50,
    },
    {
      sl_no: 4,
      item_code: 'EL-0056-D',
      item_name: 'Welding Electrodes E6013 3.15mm',
      description: 'AWS A5.1, 20 KG Carton, Brand: ADOR / ESAB',
      hsn_code: '8311',
      quantity: 10,
      uom: 'CARTON',
      unit_price: 1850.00,
      discount_percent: 0,
      discount_amount: 0,
      taxable_amount: 18500.00,
      cgst_rate: 9,
      cgst_amount: 1665.00,
      sgst_rate: 9,
      sgst_amount: 1665.00,
      igst_rate: 0,
      igst_amount: 0,
      total_price: 21830.00,
    },
  ],

  subtotal:       75825.00,
  totalDiscount:  1275.00,
  taxableAmount:  75825.00,
  cgstTotal:      6824.25,
  sgstTotal:      6824.25,
  igstTotal:      0,
  tcsAmount:      0,
  roundOff:       0.50,
  grandTotal:     89474.00,

  paymentTerms: '30 Days from Invoice Date',
  deliveryDate: '2025-05-28',
  terms: {
    payment_terms:    '30 Days from Invoice Date',
    delivery_terms:   '28-May-2025',
    freight_terms:    'Freight Extra at Actuals',
    warranty_terms:   '12 Months from Date of Delivery',
    inspection_terms: "Inspection at Buyer's premises",
    packaging_terms:  'Standard Export Packing',
  },
  specialInstructions: 'All material must be accompanied with Mill Test Certificates. No substitution without prior written approval from the Purchase Department.',
  preparedBy:   'H. Noman',
  reviewedBy:   'Purchase Manager',
  approvedBy:   'General Manager',
  currency:     'INR',
  projectName:  'Solar EPC – Phase 2',
};

// ── Run ───────────────────────────────────────────────────────────────────────
(async () => {
  console.log('Generating sample PO PDF...');
  const service = new WorldClassPoPdfService(brandingService);
  const buffer = await service.generatePOPdf('test-tenant', sampleData);
  const outPath = path.join(__dirname, '..', '..', 'sample-po-output.pdf');
  fs.writeFileSync(outPath, buffer);
  console.log(`\n✅  PDF written to: ${outPath}`);
  console.log(`    Size: ${(buffer.length / 1024).toFixed(1)} KB`);
})().catch(err => {
  console.error('\n❌ Failed:', err?.message || err);
  process.exit(1);
});
