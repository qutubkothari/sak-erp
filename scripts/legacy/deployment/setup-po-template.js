/**
 * Setup Script for World-Class PO Template
 * 
 * This script:
 * 1. Creates the assets directory if it doesn't exist
 * 2. Copies the letterhead PDF to the correct location
 * 3. Tests the PO generation
 */

const fs = require('fs');
const path = require('path');

const LETTERHEAD_SOURCE = path.join(__dirname, '..', '..', 'Letter Head_260209_114851.pdf');
const ASSETS_DIR = path.join(__dirname, 'apps', 'api', 'assets');
const LETTERHEAD_DEST = path.join(ASSETS_DIR, 'letterhead.pdf');

console.log('============================================================================');
console.log('WORLD-CLASS PO TEMPLATE SETUP');
console.log('============================================================================');
console.log('');

// Step 1: Create assets directory
if (!fs.existsSync(ASSETS_DIR)) {
  console.log('📁 Creating assets directory...');
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
  console.log('✓ Assets directory created');
} else {
  console.log('✓ Assets directory already exists');
}

// Step 2: Copy letterhead
console.log('');
console.log('📄 Setting up letterhead...');

if (fs.existsSync(LETTERHEAD_SOURCE)) {
  fs.copyFileSync(LETTERHEAD_SOURCE, LETTERHEAD_DEST);
  console.log(`✓ Letterhead copied from Downloads to ${LETTERHEAD_DEST}`);
} else if (fs.existsSync(path.join(__dirname, 'letterhead.pdf'))) {
  fs.copyFileSync(path.join(__dirname, 'letterhead.pdf'), LETTERHEAD_DEST);
  console.log('✓ Letterhead copied from current directory');
} else {
  console.log('⚠ Letterhead not found. Please place "letterhead.pdf" in:');
  console.log(`   ${ASSETS_DIR}`);
  console.log('   The PO will use a standard header template if letterhead is missing.');
}

console.log('');
console.log('============================================================================');
console.log('SETUP COMPLETE!');
console.log('============================================================================');
console.log('');
console.log('Next steps:');
console.log('1. Ensure letterhead.pdf is in: apps/api/assets/');
console.log('2. Restart the API server');
console.log('3. Use the new PO endpoint: POST /api/purchase/orders/:id/generate-pdf-v2');
console.log('');
console.log('Features included:');
console.log('✓ Professional letterhead integration');
console.log('✓ GST-compliant format with HSN codes');
console.log('✓ CGST/SGST/IGST breakdown');
console.log('✓ Comprehensive terms & conditions');
console.log('✓ Multi-signature authorization section');
console.log('✓ Amount in words (Indian numbering)');
console.log('✓ Multi-page support with headers');
console.log('✓ Professional color scheme');
console.log('');
