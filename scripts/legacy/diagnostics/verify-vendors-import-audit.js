const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, 'apps/api/.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const tenantId = process.argv[2] || 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_KEY in apps/api/.env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const gstRe = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/i;
const termSet = new Set(['CREDIT', 'ADVANCE', 'COD', 'NET 30', 'NET_30', 'NET 60', 'NET_60', 'NET 90', 'NET_90', 'AGAINST INVOICE', 'AGAINST_INVOICE']);

(async () => {
  const { data, error } = await supabase
    .from('vendors')
    .select('id,code,name,legal_name,tax_id,contact_person,email,phone,payment_terms,category')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Query failed:', error.message);
    process.exit(1);
  }

  const rows = data || [];
  const stats = {
    total: rows.length,
    nameNumeric: 0,
    legalLooksGst: 0,
    emailPhone: 0,
    phoneTerms: 0,
    contactObj: 0,
    paymentTermsSet: 0,
    taxLooksGst: 0,
  };

  const anomalies = [];

  for (const row of rows) {
    const name = String(row.name || '').trim();
    const legal = String(row.legal_name || '').trim();
    const email = String(row.email || '').trim();
    const phone = String(row.phone || '').trim();
    const contact = String(row.contact_person || '').trim();
    const taxId = String(row.tax_id || '').trim();
    const paymentTerms = String(row.payment_terms || '').trim();

    const flags = [];
    if (/^\d+$/.test(name)) {
      stats.nameNumeric += 1;
      flags.push('nameNumeric');
    }
    if (gstRe.test(legal)) {
      stats.legalLooksGst += 1;
      flags.push('legalLooksGst');
    }
    if (/^[0-9+()\-\s]{7,20}$/.test(email)) {
      stats.emailPhone += 1;
      flags.push('emailPhone');
    }
    if (termSet.has(phone.toUpperCase())) {
      stats.phoneTerms += 1;
      flags.push('phoneTerms');
    }
    if (contact.includes('[object Object]')) {
      stats.contactObj += 1;
      flags.push('contactObj');
    }
    if (paymentTerms) stats.paymentTermsSet += 1;
    if (gstRe.test(taxId)) stats.taxLooksGst += 1;

    if (flags.length > 0) {
      anomalies.push({
        id: row.id,
        code: row.code,
        name: row.name,
        email: row.email,
        phone: row.phone,
        payment_terms: row.payment_terms,
        flags,
      });
    }
  }

  console.log('VENDOR_IMPORT_AUDIT', JSON.stringify({ tenantId, stats }, null, 2));
  console.log('ANOMALY_COUNT', anomalies.length);
  if (anomalies.length > 0) {
    console.log('ANOMALY_SAMPLE', JSON.stringify(anomalies.slice(0, 20), null, 2));
  }
})();
