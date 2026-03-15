import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const GST_STATE_CODES: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
};

type VendorContact = {
  name: string;
  phone: string;
  email: string;
  isDefault?: boolean;
};

function safeObject(value: any): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string') return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeContact(contact: any): VendorContact {
  return {
    name: String(contact?.name || '').trim(),
    phone: String(contact?.phone || '').trim(),
    email: String(contact?.email || '').trim(),
    isDefault: Boolean(contact?.isDefault),
  };
}

function normalizeContacts(contacts: any): VendorContact[] {
  const list = Array.isArray(contacts)
    ? contacts
        .map(normalizeContact)
        .filter((contact) => contact.name || contact.phone || contact.email)
    : [];

  if (list.length === 0) return [];

  const defaultIndex = list.findIndex((contact) => contact.isDefault);
  return list.map((contact, index) => ({
    ...contact,
    isDefault: index === (defaultIndex >= 0 ? defaultIndex : 0),
  }));
}

function fallbackContacts(data: any): VendorContact[] {
  const contact = normalizeContact({
    name: data?.contactPerson,
    phone: data?.phone,
    email: data?.email,
    isDefault: true,
  });

  return contact.name || contact.phone || contact.email ? [contact] : [];
}

function mapDeleteAuditError(error: any, resourceLabel: string): string {
  const details = String(error?.details || '');
  const message = String(error?.message || '');

  if (
    error?.code === '23502' &&
    (message.includes('activity_logs') || details.includes('activity_logs')) &&
    (message.includes('user_id') || details.includes('user_id'))
  ) {
    return `Failed to delete ${resourceLabel}: database delete audit is misconfigured. Apply fix-delete-audit-trigger.sql and retry.`;
  }

  return `Failed to delete ${resourceLabel}: ${message || 'Unknown error'}`;
}

function gstinChecksumValid(gstin: string): boolean {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let factor = 2;
  let sum = 0;

  for (let index = gstin.length - 2; index >= 0; index -= 1) {
    const codePoint = alphabet.indexOf(gstin[index]);
    if (codePoint < 0) return false;

    let addend = factor * codePoint;
    factor = factor === 2 ? 1 : 2;
    addend = Math.floor(addend / 36) + (addend % 36);
    sum += addend;
  }

  const checksumCodePoint = (36 - (sum % 36)) % 36;
  return alphabet[checksumCodePoint] === gstin[gstin.length - 1];
}

function validateGstin(rawValue: any) {
  const gstin = String(rawValue || '').trim().toUpperCase();
  const formatValid = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstin);
  const checksumValid = formatValid ? gstinChecksumValid(gstin) : false;
  const stateCode = gstin.slice(0, 2);

  return {
    gstin,
    valid: formatValid && checksumValid,
    formatValid,
    checksumValid,
    stateCode,
    stateName: GST_STATE_CODES[stateCode] || null,
    pan: formatValid ? gstin.slice(2, 12) : null,
    entityCode: formatValid ? gstin.slice(12, 13) : null,
  };
}

@Injectable()
export class VendorsService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!,
    );
  }

  private buildVendorPayload(data: any, existingVendor?: any) {
    const metadata = safeObject(existingVendor?.metadata);
    const contacts = normalizeContacts(data?.contacts);
    const existingContacts = normalizeContacts(metadata.contacts);
    const vendorContacts =
      contacts.length > 0
        ? contacts
        : existingContacts.length > 0
          ? existingContacts
          : fallbackContacts(data).length > 0
            ? fallbackContacts(data)
            : fallbackContacts(existingVendor);
    const defaultContact = vendorContacts.find((contact) => contact.isDefault) || vendorContacts[0] || null;
    const billingLine2 = String(data?.billingLine2 || '').trim();
    const useSameAsBilling = data?.sameAsbilling === true || data?.sameAsBilling === true;
    const nextStreet = String(data?.street ?? existingVendor?.street ?? '').trim() || null;
    const nextCity = String(data?.city ?? existingVendor?.city ?? '').trim() || null;
    const nextState = String(data?.state ?? existingVendor?.state ?? '').trim() || null;
    const nextCountry = String(data?.country ?? existingVendor?.country ?? 'India').trim() || 'India';
    const nextPincode = String(data?.pincode ?? existingVendor?.pincode ?? '').trim() || null;
    const nextShippingStreet = useSameAsBilling
      ? nextStreet
      : String(data?.shippingStreet ?? existingVendor?.shipping_street ?? '').trim() || null;
    const nextShippingCity = useSameAsBilling
      ? nextCity
      : String(data?.shippingCity ?? existingVendor?.shipping_city ?? '').trim() || null;
    const nextShippingState = useSameAsBilling
      ? nextState
      : String(data?.shippingState ?? existingVendor?.shipping_state ?? '').trim() || null;
    const nextShippingCountry = useSameAsBilling
      ? nextCountry
      : String(data?.shippingCountry ?? existingVendor?.shipping_country ?? nextCountry).trim() || nextCountry;
    const nextShippingPincode = useSameAsBilling
      ? nextPincode
      : String(data?.shippingPincode ?? existingVendor?.shipping_pincode ?? '').trim() || null;

    return {
      code: data.code || existingVendor?.code,
      name: data.name || existingVendor?.name,
      legal_name: data.legalName || data.name || existingVendor?.legal_name || existingVendor?.name,
      tax_id: String(data.taxId ?? existingVendor?.tax_id ?? '').trim().toUpperCase() || null,
      category: data.category ?? existingVendor?.category,
      rating: data.rating ?? existingVendor?.rating,
      payment_terms: data.paymentTerms ?? existingVendor?.payment_terms,
      credit_limit: data.creditLimit ?? existingVendor?.credit_limit,
      contact_person: defaultContact?.name || null,
      email: defaultContact?.email || null,
      phone: defaultContact?.phone || null,
      address: data.address ?? existingVendor?.address,
      street: nextStreet,
      city: nextCity,
      state: nextState,
      country: nextCountry,
      pincode: nextPincode,
      shipping_street: nextShippingStreet,
      shipping_city: nextShippingCity,
      shipping_state: nextShippingState,
      shipping_country: nextShippingCountry,
      shipping_pincode: nextShippingPincode,
      is_active: data.isActive !== undefined ? data.isActive : existingVendor?.is_active ?? true,
      metadata: {
        ...metadata,
        contacts: vendorContacts,
        billingLine2: billingLine2 || null,
        gstinVerification: data?.gstVerification || metadata.gstinVerification || null,
      },
    };
  }

  private hydrateVendor(vendor: any) {
    const metadata = safeObject(vendor?.metadata);
    const contacts = normalizeContacts(metadata.contacts);
    const defaultContact = contacts.find((contact) => contact.isDefault) || contacts[0] || null;

    return {
      ...vendor,
      metadata,
      contacts,
      billing_line2: metadata.billingLine2 || '',
      gst_verification: metadata.gstinVerification || null,
      contact_person: vendor.contact_person || defaultContact?.name || '',
      email: vendor.email || defaultContact?.email || '',
      phone: vendor.phone || defaultContact?.phone || '',
    };
  }

  async create(tenantId: string, data: any) {
    // Generate vendor code if not provided
    const code = data.code || await this.generateVendorCode(tenantId);
    const payload = this.buildVendorPayload({ ...data, code });

    const { data: vendor, error } = await this.supabase
      .from('vendors')
      .insert({
        tenant_id: tenantId,
        ...payload,
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return this.hydrateVendor(vendor);
  }

  async findAll(tenantId: string, filters?: any) {
    console.log('🔵 [API] VendorsService.findAll called');
    console.log('🔵 [API] Tenant ID:', tenantId);
    console.log('🔵 [API] Filters:', filters);
    
    let query = this.supabase
      .from('vendors')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (filters?.category && filters.category !== 'ALL') {
      query = query.eq('category', filters.category);
    }

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive);
    }

    if (filters?.search) {
      query = query.or(`code.ilike.%${filters.search}%,name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    console.log('🔵 [API] Query result - data count:', data?.length || 0);
    console.log('🔵 [API] Query error:', error);
    if (data && data.length > 0) {
      console.log('🔵 [API] First vendor:', data[0].name);
    }

    if (error) throw new BadRequestException(error.message);
    return (data || []).map((vendor) => this.hydrateVendor(vendor));
  }

  async findOne(tenantId: string, id: string) {
    const { data, error } = await this.supabase
      .from('vendors')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single();

    if (error) throw new NotFoundException('Vendor not found');
    return this.hydrateVendor(data);
  }

  async update(tenantId: string, id: string, data: any) {
    const existing = await this.findOne(tenantId, id);
    const payload = this.buildVendorPayload(data, existing);

    const { error } = await this.supabase
      .from('vendors')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return this.findOne(tenantId, id);
  }

  async delete(tenantId: string, userId: string, id: string) {
    const { error } = await this.supabase
      .from('vendors')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);

    void userId;

    if (error) {
      throw new BadRequestException(mapDeleteAuditError(error, 'vendor'));
    }
    return { message: 'Vendor deleted successfully' };
  }

  async verifyGstin(rawGstin: any) {
    const result = validateGstin(rawGstin);

    return {
      gstin: result.gstin,
      valid: result.valid,
      verificationMode: 'format-checksum',
      message: result.valid
        ? 'GSTIN format and checksum are valid.'
        : result.gstin
          ? 'GSTIN format or checksum is invalid.'
          : 'GSTIN is required.',
      details: {
        formatValid: result.formatValid,
        checksumValid: result.checksumValid,
        stateCode: result.stateCode || null,
        stateName: result.stateName,
        pan: result.pan,
        entityCode: result.entityCode,
      },
    };
  }

  private async generateVendorCode(tenantId: string): Promise<string> {
    const prefix = 'VEN';

    // Get the count of all vendors to generate a unique code
    const { count, error } = await this.supabase
      .from('vendors')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    if (error) {
      // Fallback to timestamp-based code if count fails
      return `${prefix}${Date.now().toString().slice(-6)}`;
    }

    const nextNumber = (count || 0) + 1;
    return `${prefix}${String(nextNumber).padStart(3, '0')}`;
  }
}
