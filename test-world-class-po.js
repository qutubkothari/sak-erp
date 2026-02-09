/**
 * Test script for World-Class PO Generation
 * 
 * This script demonstrates how to generate a professional PO PDF
 * with all the world-class features.
 */

const { WorldClassPoPdfService } = require('../../apps/api/dist/purchase/services/world-class-po-pdf.service');
const fs = require('fs');
const path = require('path');

async function testPOGeneration() {
  console.log('============================================================================');
  console.log('Testing World-Class PO PDF Generation');
  console.log('============================================================================');
  console.log('');

  const service = new WorldClassPoPdfService();

  // Sample PO data - you can modify this to test different scenarios
  const testPOData = {
    // Header
    poNumber: 'PO-2026-001',
    poDate: '2026-02-09',
    revision: 1,
    quotationRef: 'QUOT-2026-045',
    prNumber: 'PR-2026-123',

    // Vendor Details
    vendorName: 'ABC Industrial Suppliers Pvt Ltd',
    vendorCode: 'VEND-001',
    vendorAddress: '123, Industrial Estate, Phase 2',
    vendorCity: 'Mumbai',
    vendorState: 'Maharashtra',
    vendorPincode: '400001',
    vendorCountry: 'India',
    vendorGSTIN: '27AABCU9603R1ZM',
    vendorPAN: 'AABCU9603R',
    vendorEmail: 'sales@abcindustrial.com',
    vendorPhone: '+91 22 1234 5678',
    vendorContactPerson: 'Mr. Rajesh Kumar',

    // Company Details
    companyName: 'SAK AUTOMATIONS',
    companyAddress: 'No. 45, Industrial Area, SIDCO Estate',
    companyCity: 'Chennai',
    companyState: 'Tamil Nadu',
    companyPincode: '600098',
    companyGSTIN: '33AABCS5678F1Z5',
    companyPAN: 'AABCS5678F',
    companyEmail: 'purchase@sakautomations.com',
    companyPhone: '+91 44 2345 6789',
    companyWebsite: 'www.sakautomations.com',

    // Delivery Details (if different from company)
    deliveryAddress: 'SAK Automations - Unit 2, Plot No. 67, SIPCOT Industrial Park',
    deliveryCity: 'Sriperumbudur',
    deliveryState: 'Tamil Nadu',
    deliveryPincode: '602105',
    deliveryContactPerson: 'Mr. Suresh - Stores Manager',
    deliveryPhone: '+91 98765 43210',

    // Items
    items: [
      {
        sl_no: 1,
        item_code: 'STL-PLATE-001',
        item_name: 'MS Steel Plate 10mm x 4ft x 8ft',
        description: 'Mild Steel Plate, Grade IS2062',
        hsn_code: '7208',
        quantity: 50,
        uom: 'Nos',
        unit_price: 5000,
        discount_percent: 5,
        discount_amount: 250,
        taxable_amount: 4750,
        cgst_rate: 9,
        cgst_amount: 427.50,
        sgst_rate: 9,
        sgst_amount: 427.50,
        total_price: 5605,
        specifications: 'As per IS 2062 Grade A',
        delivery_date: '2026-02-20',
      },
      {
        sl_no: 2,
        item_code: 'HYD-CYL-500',
        item_name: 'Hydraulic Cylinder 500mm Stroke',
        description: '50 Ton capacity, 500mm stroke',
        hsn_code: '8412',
        quantity: 10,
        uom: 'Nos',
        unit_price: 25000,
        discount_percent: 10,
        discount_amount: 2500,
        taxable_amount: 22500,
        cgst_rate: 9,
        cgst_amount: 2025,
        sgst_rate: 9,
        sgst_amount: 2025,
        total_price: 26550,
        specifications: 'With rod seal kit and mounting brackets',
      },
      {
        sl_no: 3,
        item_code: 'ELC-MTR-7.5',
        item_name: 'Electric Motor 7.5 HP, 3 Phase',
        description: 'Crompton/Bharat make, 1440 RPM',
        hsn_code: '8501',
        quantity: 5,
        uom: 'Nos',
        unit_price: 15000,
        taxable_amount: 15000,
        cgst_rate: 9,
        cgst_amount: 1350,
        sgst_rate: 9,
        sgst_amount: 1350,
        total_price: 17700,
        specifications: 'With certificate of conformity',
      },
      {
        sl_no: 4,
        item_code: 'BRG-6308',
        item_name: 'Ball Bearing 6308 ZZ',
        description: 'SKF/FAG make, sealed type',
        hsn_code: '8482',
        quantity: 100,
        uom: 'Nos',
        unit_price: 450,
        discount_percent: 15,
        discount_amount: 67.50,
        taxable_amount: 382.50,
        cgst_rate: 9,
        cgst_amount: 34.43,
        sgst_rate: 9,
        sgst_amount: 34.43,
        total_price: 451.36,
        specifications: 'Original make only, no substitutes',
      },
      {
        sl_no: 5,
        item_code: 'VALVE-SOL-24V',
        item_name: 'Solenoid Valve 24V DC, 3/4 inch',
        description: 'Normally closed, pressure rating 10 bar',
        hsn_code: '8481',
        quantity: 20,
        uom: 'Nos',
        unit_price: 1200,
        taxable_amount: 1200,
        cgst_rate: 9,
        cgst_amount: 108,
        sgst_rate: 9,
        sgst_amount: 108,
        total_price: 1416,
        specifications: 'With coil and connector',
      },
    ],

    // Financial Summary
    subtotal: 580250,
    totalDiscount: 28175,
    taxableAmount: 552075,
    cgstTotal: 49686.75,
    sgstTotal: 49686.75,
    tcsAmount: 0,
    roundOff: -0.50,
    grandTotal: 651448,

    // Terms & Conditions
    paymentTerms: '30 days from invoice date',
    deliveryDate: '2026-02-28',
    terms: {
      payment_terms: '30 days from invoice date via RTGS/NEFT',
      delivery_terms: 'FOB Destination - Buyer\'s facility',
      freight_terms: 'Freight prepaid and added to invoice',
      insurance_terms: 'Transit insurance by seller',
      validity_days: 30,
      warranty_terms: '12 months from date of installation or 18 months from supply, whichever is earlier',
      inspection_terms: 'Material subject to inspection and approval at buyer site',
      packaging_terms: 'Proper industrial packaging with moisture protection',
    },

    // Special Instructions
    specialInstructions: `1. Delivery to be made in 3 batches as per attached delivery schedule
2. Test certificates to be provided for all materials
3. Prior intimation of 48 hours required before delivery
4. Material to be inspected at seller premises before dispatch
5. All items must bear proper identification tags`,

    remarks: 'Urgent requirement for ongoing project. Please expedite.',

    // Authorization
    preparedBy: 'Ramesh - Purchase Officer',
    reviewedBy: 'Suresh - Purchase Manager',
    approvedBy: 'Saif - Director',

    // Additional
    currency: 'INR',
    incoterms: 'FOB',
    projectName: 'Assembly Line Automation - Phase 2',
  };

  console.log('Generating PDF with sample data...');
  console.log('');
  console.log('PO Details:');
  console.log(`  PO Number: ${testPOData.poNumber}`);
  console.log(`  Vendor: ${testPOData.vendorName}`);
  console.log(`  Items: ${testPOData.items.length}`);
  console.log(`  Grand Total: ₹${testPOData.grandTotal.toLocaleString('en-IN')}`);
  console.log('');

  try {
    const pdfBuffer = await service.generatePOPdf(testPOData);
    const outputPath = path.join(__dirname, 'test-po-output.pdf');
    fs.writeFileSync(outputPath, pdfBuffer);

    console.log('✓ PDF generated successfully!');
    console.log(`✓ Saved to: ${outputPath}`);
    console.log('');
    console.log('File size:', (pdfBuffer.length / 1024).toFixed(2), 'KB');
    console.log('');
    console.log('Features included:');
    console.log('  ✓ Professional letterhead integration');
    console.log('  ✓ GST-compliant format with HSN codes');
    console.log('  ✓ CGST/SGST breakdown');
    console.log('  ✓ Discount calculations');
    console.log('  ✓ Comprehensive terms & conditions');
    console.log('  ✓ Multi-signature authorization');
    console.log('  ✓ Amount in words (Lakhs format)');
    console.log('  ✓ Professional color scheme');
    console.log('  ✓ Multi-page support with headers');
    console.log('');
  } catch (error) {
    console.error('❌ Error generating PDF:', error.message);
    console.error('');
    console.error('Stack trace:');
    console.error(error.stack);
    process.exit(1);
  }

  console.log('============================================================================');
  console.log('Test Complete!');
  console.log('============================================================================');
}

// Run the test
testPOGeneration();
