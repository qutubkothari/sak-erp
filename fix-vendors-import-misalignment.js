const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://nwkaruzvzwwuftjquypk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53a2FydXp2end3dWZ0anF1eXBrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDIzODAzMSwiZXhwIjoyMDc5ODE0MDMxfQ.fjO1zDdJehgsIl-0JsejEOKf4zO-lwvdgpRz4lQdt6Q'
);

const TENANT_ID = 'f87a5ab0-0619-4f1c-bab9-e78ca750e56c';
const APPLY = process.argv.includes('--apply');

const GST_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\-\s]{7,20}$/;
const PERSON_RE = /^(mr|mrs|ms|dr)\b|\s+/i;
const VALID_CATEGORIES = new Set(['RAW_MATERIAL', 'COMPONENT', 'SERVICE', 'CONSUMABLE']);
const TERM_MAP = {
  CREDIT: 'NET_30',
  'NET 30': 'NET_30',
  NET_30: 'NET_30',
  'NET 60': 'NET_60',
  NET_60: 'NET_60',
  'NET 90': 'NET_90',
  NET_90: 'NET_90',
  ADVANCE: 'ADVANCE',
  COD: 'COD',
  'AGAINST INVOICE': 'NET_30',
};

function isNumericName(value) {
  return /^\d+$/.test(String(value || '').trim());
}

function looksLikeGst(value) {
  return GST_RE.test(String(value || '').trim());
}

function looksLikeEmail(value) {
  return EMAIL_RE.test(String(value || '').trim());
}

function looksLikePhone(value) {
  const cleaned = String(value || '').trim();
  if (!cleaned) return false;
  if (!PHONE_RE.test(cleaned)) return false;
  const digits = cleaned.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function normalizePaymentTerms(value) {
  const key = String(value || '').trim().toUpperCase();
  return TERM_MAP[key] || null;
}

function looksLikePerson(value) {
  const text = String(value || '').trim();
  if (!text) return false;
  if (looksLikeEmail(text) || looksLikeGst(text) || looksLikePhone(text)) return false;
  return PERSON_RE.test(text) || /^[A-Za-z .'-]{3,}$/.test(text);
}

function shouldFixRow(vendor) {
  const signatureA = isNumericName(vendor.name) && looksLikeGst(vendor.legal_name);
  const signatureB = (vendor.contact_person || '').includes('[object Object]');
  const signatureC = looksLikePhone(vendor.email) && normalizePaymentTerms(vendor.phone);
  return signatureA || signatureB || signatureC;
}

function buildPatch(vendor) {
  const patch = {};
  const code = String(vendor.code || '').trim();

  if (isNumericName(vendor.name) && code) {
    patch.name = code;
  }

  if (looksLikeGst(vendor.legal_name) && !looksLikeGst(vendor.tax_id)) {
    patch.tax_id = String(vendor.legal_name).trim();
  }

  if (looksLikeGst(vendor.legal_name) && code) {
    patch.legal_name = code;
  }

  const termsFromPhone = normalizePaymentTerms(vendor.phone);
  if (termsFromPhone && !vendor.payment_terms) {
    patch.payment_terms = termsFromPhone;
  }

  if (looksLikePhone(vendor.email)) {
    patch.phone = String(vendor.email).trim();
  }

  if (looksLikeEmail(vendor.contact_person) && !looksLikeEmail(vendor.email)) {
    patch.email = String(vendor.contact_person).trim().toLowerCase();
  }

  if (((vendor.contact_person || '').includes('[object Object]') || !String(vendor.contact_person || '').trim()) && looksLikePerson(vendor.category)) {
    patch.contact_person = String(vendor.category).trim();
  }

  if (!VALID_CATEGORIES.has(String(vendor.category || '').trim())) {
    patch.category = 'RAW_MATERIAL';
  }

  if (!patch.email && !looksLikeEmail(vendor.email)) {
    patch.email = null;
  }

  patch.updated_at = new Date().toISOString();
  return patch;
}

async function main() {
  const { data: vendors, error } = await supabase
    .from('vendors')
    .select('id,code,name,legal_name,tax_id,contact_person,email,phone,payment_terms,category,tenant_id')
    .eq('tenant_id', TENANT_ID)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch vendors:', error.message);
    process.exit(1);
  }

  const targets = (vendors || []).filter(shouldFixRow);
  console.log(`Found ${targets.length} potentially corrupted vendors out of ${(vendors || []).length}`);

  const preview = targets.slice(0, 10).map(v => ({
    id: v.id,
    before: {
      code: v.code,
      name: v.name,
      legal_name: v.legal_name,
      tax_id: v.tax_id,
      contact_person: v.contact_person,
      email: v.email,
      phone: v.phone,
      payment_terms: v.payment_terms,
      category: v.category,
    },
    patch: buildPatch(v),
  }));

  console.log('Preview (first 10):');
  preview.forEach((item, idx) => {
    console.log(`\n#${idx + 1} ${item.id}`);
    console.log('before:', item.before);
    console.log('patch :', item.patch);
  });

  const backupPath = path.resolve(process.cwd(), `vendors-corrupted-backup-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(targets, null, 2));
  console.log(`\nBackup written: ${backupPath}`);

  if (!APPLY) {
    console.log('\nDry run complete. Re-run with --apply to update records.');
    return;
  }

  let updated = 0;
  for (const vendor of targets) {
    const patch = buildPatch(vendor);
    const { error: upError } = await supabase
      .from('vendors')
      .update(patch)
      .eq('id', vendor.id)
      .eq('tenant_id', TENANT_ID);

    if (upError) {
      console.error(`Failed to update ${vendor.id}: ${upError.message}`);
      continue;
    }
    updated++;
  }

  console.log(`\nUpdated ${updated} vendors.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
