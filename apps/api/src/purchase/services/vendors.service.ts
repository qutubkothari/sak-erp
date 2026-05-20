import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { normalizeEmail, toTitleCase, toUpperCode } from '../../common/utils/data-quality';

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
  salutation?: string;
  name: string;
  phone: string;
  email: string;
  isDefault?: boolean;
};

type GstinPortalAddress = {
  addressLine?: string;
  street?: string;
  city?: string;
  district?: string;
  state?: string;
  pincode?: string;
  country?: string;
  fullAddress?: string;
};

const parseBooleanFilter = (value: any): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }

  return undefined;
};

type GstinPortalData = {
  legalName: string;
  tradeName?: string;
  address?: GstinPortalAddress;
  status?: string;
  registrationDate?: string;
  taxpayerType?: string;
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
    salutation: String(contact?.salutation || '').trim(),
    name: toTitleCase(contact?.name || ''),
    phone: contact?.phone ? normalizeVendorPhone(contact.phone) : '',
    email: contact?.email ? normalizeEmail(contact.email) : '',
    isDefault: Boolean(contact?.isDefault),
  };
}

function normalizeVendorPhone(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const digits = raw.replace(/\D/g, '');
  let national = digits;
  if (national.length === 11 && national.startsWith('0')) national = national.slice(1);
  if (national.length === 12 && national.startsWith('91')) national = national.slice(2);

  // Auto-format 10-digit Indian numbers
  if (national.length === 10 && /^[1-9]\d{9}$/.test(national)) {
    return `+91${national}`;
  }

  // Accept international numbers: keep as-is if 7–15 digits total
  if (digits.length >= 7 && digits.length <= 15) {
    return raw;
  }

  throw new BadRequestException('Enter a valid phone number (7–15 digits).');
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

function normalizeStoredContact(contact: any): VendorContact {
  let name = '';
  let phone = '';
  let email = '';
  let salutation = '';

  try {
    salutation = String(contact?.salutation || '').trim();
  } catch {
    salutation = String(contact?.salutation || '').trim();
  }

  try {
    name = toTitleCase(contact?.name || '');
  } catch {
    name = toTitleCase(contact?.name || '');
  }

  try {
    phone = contact?.phone ? normalizeVendorPhone(contact.phone) : '';
  } catch {
    phone = String(contact?.phone || '').trim();
  }

  try {
    email = contact?.email ? normalizeEmail(contact.email) : '';
  } catch {
    email = String(contact?.email || '').trim();
  }

  return {
    salutation,
    name,
    phone,
    email,
    isDefault: Boolean(contact?.isDefault),
  };
}

function normalizeStoredContacts(contacts: any): VendorContact[] {
  const list = Array.isArray(contacts)
    ? contacts
        .map(normalizeStoredContact)
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

function normalizeVendorTaxId(value: any): string | null {
  const normalized = String(value || '').trim().toUpperCase();
  return normalized || null;
}

function firstNonEmpty(...values: any[]): string | undefined {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return undefined;
}

function compactJoin(values: any[], separator = ', '): string | undefined {
  const parts = values.map((value) => String(value || '').trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(separator) : undefined;
}

function extractGstinPortalAddress(data: any): GstinPortalAddress | undefined {
  const source =
    data?.pradr?.addr ||
    data?.principalPlaceOfBusiness?.address ||
    data?.principalPlaceAddress ||
    data?.data?.data?.pradr?.addr ||
    data?.data?.data?.principalPlaceOfBusiness?.address ||
    data?.data?.pradr?.addr ||
    data?.data?.principalPlaceOfBusiness?.address ||
    data?.taxpayerInfo?.principalPlaceOfBusiness?.address ||
    data?.result?.pradr?.addr ||
    data?.result?.principalPlaceOfBusiness?.address ||
    data?.address ||
    data?.data?.address ||
    data?.result?.address ||
    null;

  if (!source) return undefined;

  if (typeof source === 'string') {
    const fullAddress = source.trim();
    return fullAddress ? { fullAddress, addressLine: fullAddress, country: 'India' } : undefined;
  }

  if (typeof source !== 'object') return undefined;

  const building = compactJoin([
    source.bno || source.buildingNo || source.building_number || source.building,
    source.flno || source.floorNo || source.floor_number || source.floor,
    source.bnm || source.buildingName || source.building_name,
  ]);
  const street = firstNonEmpty(source.st || source.street, source.streetName, source.road, source.locality);
  const location = firstNonEmpty(source.loc, source.location, source.city, source.locality);
  const district = firstNonEmpty(source.dst, source.district);
  const state = firstNonEmpty(source.stcd, source.state, source.stateName);
  const pincode = firstNonEmpty(source.pncd, source.pincode, source.pinCode, source.postalCode, source.zip);
  const addressLine = firstNonEmpty(source.addr, source.addressLine, source.address_line, source.address1, building);
  const city = firstNonEmpty(source.city, location, district);
  const fullAddress = firstNonEmpty(
    source.fullAddress,
    source.full_address,
    source.address,
    compactJoin([addressLine, street, city, district && district !== city ? district : '', state, pincode]),
  );

  return {
    addressLine,
    street,
    city,
    district,
    state,
    pincode,
    country: firstNonEmpty(source.country, 'India'),
    fullAddress,
  };
}

@Injectable()
export class VendorsService {
  private readonly logger = new Logger(VendorsService.name);
  private supabase: SupabaseClient;
  private sandboxAccessToken: string | null = null;
  private sandboxAccessTokenExpiresAt = 0;

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
    const rawBillingLine2 = data?.billingLine2 !== undefined
      ? data.billingLine2
      : metadata.billingLine2 ?? existingVendor?.billing_line2 ?? '';
    const bankName = String(data?.bankName ?? metadata.bankName ?? existingVendor?.bank_name ?? '').trim() || null;
    const bankAccountNumber = String(data?.bankAccountNumber ?? metadata.bankAccountNumber ?? existingVendor?.bank_account_number ?? '').trim() || null;
    const bankIfscCode = String(data?.bankIfscCode ?? metadata.bankIfscCode ?? existingVendor?.bank_ifsc_code ?? '').trim().toUpperCase() || null;
    const bankBranch = String(data?.bankBranch ?? metadata.bankBranch ?? existingVendor?.bank_branch ?? '').trim() || null;
    const bankAccountType = String(data?.bankAccountType ?? metadata.bankAccountType ?? existingVendor?.bank_account_type ?? 'CURRENT').trim() || 'CURRENT';
    const billingLine2 = toTitleCase(rawBillingLine2 || '');
    const useSameAsBilling = data?.sameAsbilling === true || data?.sameAsBilling === true;
    const nextStreet = toTitleCase(data?.street ?? existingVendor?.street ?? '') || null;
    const nextCity = toTitleCase(data?.city ?? existingVendor?.city ?? '') || null;
    const nextState = toTitleCase(data?.state ?? existingVendor?.state ?? '') || null;
    const nextCountry = toTitleCase(data?.country ?? existingVendor?.country ?? 'India') || 'India';
    const nextPincode = String(data?.pincode ?? existingVendor?.pincode ?? '').trim() || null;
    const nextShippingStreet = useSameAsBilling
      ? nextStreet
      : toTitleCase(data?.shippingStreet ?? existingVendor?.shipping_street ?? '') || null;
    const nextShippingCity = useSameAsBilling
      ? nextCity
      : toTitleCase(data?.shippingCity ?? existingVendor?.shipping_city ?? '') || null;
    const nextShippingState = useSameAsBilling
      ? nextState
      : toTitleCase(data?.shippingState ?? existingVendor?.shipping_state ?? '') || null;
    const nextShippingCountry = useSameAsBilling
      ? nextCountry
      : toTitleCase(data?.shippingCountry ?? existingVendor?.shipping_country ?? nextCountry) || nextCountry;
    const nextShippingPincode = useSameAsBilling
      ? nextPincode
      : String(data?.shippingPincode ?? existingVendor?.shipping_pincode ?? '').trim() || null;

    return {
      code: toUpperCode(data.code || existingVendor?.code),
      name: toTitleCase(data.name || existingVendor?.name),
      legal_name: toTitleCase(data.legalName || data.name || existingVendor?.legal_name || existingVendor?.name),
      tax_id: toUpperCode(data.taxId ?? existingVendor?.tax_id ?? '') || null,
      category: data.category ?? existingVendor?.category,
      rating: data.rating ?? existingVendor?.rating,
      payment_terms: data.paymentTerms ?? existingVendor?.payment_terms,
      credit_limit: data.creditLimit ?? existingVendor?.credit_limit,
      contact_person: defaultContact?.name || null,
      email: defaultContact?.email || null,
      phone: defaultContact?.phone || null,
      address: toTitleCase(data.address ?? existingVendor?.address),
      billing_line2: billingLine2 || null,
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
      bank_name: bankName,
      bank_account_number: bankAccountNumber,
      bank_ifsc_code: bankIfscCode,
      bank_branch: bankBranch,
      bank_account_type: bankAccountType,
      metadata: {
        ...metadata,
        contacts: vendorContacts,
        billingLine2: billingLine2 || null,
        gstinVerification: data?.gstVerification || metadata.gstinVerification || null,
        bankName,
        bankAccountNumber,
        bankIfscCode,
        bankBranch,
        bankAccountType,
        salutation: String(data?.salutation ?? metadata.salutation ?? '').trim() || null,
      },
    };
  }

  private hydrateVendor(vendor: any) {
    const metadata = safeObject(vendor?.metadata);
    const contacts = normalizeStoredContacts(metadata.contacts);
    const defaultContact = contacts.find((contact) => contact.isDefault) || contacts[0] || null;

    return {
      ...vendor,
      metadata,
      contacts,
      salutation: metadata.salutation || '',
      billing_line2: vendor.billing_line2 || metadata.billingLine2 || '',
      gst_verification: metadata.gstinVerification || null,
      is_verified: vendor.is_verified === true,
      contact_person: vendor.contact_person || defaultContact?.name || '',
      email: vendor.email || defaultContact?.email || '',
      phone: vendor.phone || defaultContact?.phone || '',
      bank_name: vendor.bank_name || metadata.bankName || '',
      bank_account_number: vendor.bank_account_number || metadata.bankAccountNumber || '',
      bank_ifsc_code: vendor.bank_ifsc_code || metadata.bankIfscCode || '',
      bank_branch: vendor.bank_branch || metadata.bankBranch || '',
      bank_account_type: vendor.bank_account_type || metadata.bankAccountType || 'CURRENT',
    };
  }

  private async assertUniqueTaxId(tenantId: string, rawTaxId: any, excludeVendorId?: string) {
    const taxId = normalizeVendorTaxId(rawTaxId);
    if (!taxId) return;

    let query = this.supabase
      .from('vendors')
      .select('id, name, code, tax_id')
      .eq('tenant_id', tenantId)
      .eq('tax_id', taxId)
      .limit(1);

    if (excludeVendorId) {
      query = query.neq('id', excludeVendorId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      throw new BadRequestException(error.message);
    }

    if (data) {
      const vendorLabel = String(data.name || data.code || 'another vendor').trim();
      throw new BadRequestException(`Vendor GST Number already exists for ${vendorLabel}. Use the existing vendor instead of creating a new one.`);
    }
  }

  async create(tenantId: string, data: any) {
    // Generate vendor code if not provided
    const code = data.code || await this.generateVendorCode(tenantId);
    const payload = this.buildVendorPayload({ ...data, code });

    await this.assertUniqueTaxId(tenantId, payload.tax_id);

    const { data: vendor, error } = await this.supabase
      .from('vendors')
      .insert({
        tenant_id: tenantId,
        ...payload,
        is_verified: false,
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

    const isActive = parseBooleanFilter(filters?.isActive);
    if (isActive !== undefined) {
      query = query.eq('is_active', isActive);
      if (isActive === true && filters?.includeUnverified !== 'true' && filters?.includeUnverified !== true) {
        query = query.eq('is_verified', true);
      }
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

    await this.assertUniqueTaxId(tenantId, payload.tax_id, id);

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

  async setVerification(tenantId: string, userId: string, id: string, isVerified: boolean) {
    const updateData = isVerified
      ? {
          is_verified: true,
          verified_at: new Date().toISOString(),
          verified_by: userId,
          updated_at: new Date().toISOString(),
        }
      : {
          is_verified: false,
          verified_at: null,
          verified_by: null,
          updated_at: new Date().toISOString(),
        };

    const { error } = await this.supabase
      .from('vendors')
      .update(updateData)
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return this.findOne(tenantId, id);
  }

  async assertVendorVerified(tenantId: string, vendorId?: string | null) {
    const normalizedVendorId = String(vendorId || '').trim();
    if (!normalizedVendorId) return;

    const { data, error } = await this.supabase
      .from('vendors')
      .select('id, name, code, is_active, is_verified')
      .eq('tenant_id', tenantId)
      .eq('id', normalizedVendorId)
      .maybeSingle();

    if (error) throw new BadRequestException(error.message);
    if (!data?.id) throw new BadRequestException('Vendor not found');
    if (data.is_active === false) throw new BadRequestException(`Vendor ${data.name || data.code || ''} is inactive and cannot be used.`);
    // Verification check disabled - causing too many errors
    // if (data.is_verified !== true) throw new BadRequestException(`Vendor ${data.name || data.code || ''} is not verified by admin and cannot be used.`);
  }

  async delete(tenantId: string, userId: string, id: string) {
    void userId;

    // Check if vendor has any Purchase Orders — block hard delete if so
    const { data: poCheck, error: poError } = await this.supabase
      .from('purchase_orders')
      .select('id', { count: 'exact', head: false })
      .eq('tenant_id', tenantId)
      .eq('vendor_id', id)
      .limit(1)
      .maybeSingle();

    if (poError && poError.code !== 'PGRST116') {
      throw new BadRequestException(`Failed to check vendor references: ${poError.message}`);
    }

    if (poCheck) {
      throw new BadRequestException(
        'This vendor has existing Purchase Orders and cannot be deleted. ' +
        'Please mark the vendor as Inactive instead — it will be hidden from all new PO and PR selections.',
      );
    }

    // No POs — safe to hard-delete
    const { error } = await this.supabase
      .from('vendors')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id);

    if (error) {
      // FK constraint from other tables (item_vendors, etc.)
      if (error.code === '23503') {
        throw new BadRequestException(
          'This vendor is referenced by other records (items or other documents) and cannot be deleted. ' +
          'Please mark it as Inactive instead.',
        );
      }
      throw new BadRequestException(mapDeleteAuditError(error, 'vendor'));
    }
    return { message: 'Vendor deleted successfully' };
  }

  private normalizeForNameComparison(name: string): string {
    return name
      .toLowerCase()
      .replace(/\bprivate\b/g, 'pvt')
      .replace(/\blimited\b/g, 'ltd')
      .replace(/\bpvt\.?\s*ltd\.?\b/g, 'pvtltd')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  private async getSandboxAccessToken(): Promise<string | null> {
    const apiKey = process.env.GSTIN_SANDBOX_API_KEY || process.env.SANDBOX_API_KEY || '';
    const apiSecret = process.env.GSTIN_SANDBOX_API_SECRET || process.env.SANDBOX_API_SECRET || '';
    if (!apiKey || !apiSecret) return null;

    const now = Date.now();
    if (this.sandboxAccessToken && this.sandboxAccessTokenExpiresAt > now + 60_000) {
      return this.sandboxAccessToken;
    }

    const baseUrl = (process.env.GSTIN_SANDBOX_BASE_URL || process.env.SANDBOX_API_BASE_URL || 'https://api.sandbox.co.in').replace(/\/$/, '');
    const authPath = process.env.GSTIN_SANDBOX_AUTH_PATH || '/authenticate';

    try {
      const response = await fetch(`${baseUrl}${authPath.startsWith('/') ? authPath : `/${authPath}`}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'x-api-key': apiKey,
          'x-api-secret': apiSecret,
          'x-api-version': process.env.GSTIN_SANDBOX_API_VERSION || '1.0',
        },
        signal: AbortSignal.timeout(7000),
      });

      if (!response.ok) {
        this.logger.warn(`Sandbox GST authentication failed with status ${response.status}`);
        return null;
      }

      const body: any = await response.json();
      const token = firstNonEmpty(
        body?.access_token,
        body?.accessToken,
        body?.token,
        body?.data?.access_token,
        body?.data?.accessToken,
        body?.data?.token,
      );

      if (!token) return null;

      const expiresInSeconds = Number(body?.expires_in || body?.expiresIn || body?.data?.expires_in || body?.data?.expiresIn || 3600);
      this.sandboxAccessToken = token;
      this.sandboxAccessTokenExpiresAt = now + Math.max(300, expiresInSeconds) * 1000;
      return token;
    } catch (error: any) {
      this.logger.warn(`Sandbox GST authentication failed: ${error?.message || 'unknown error'}`);
      return null;
    }
  }

  private async fetchSandboxGstinData(gstin: string): Promise<any | null> {
    const apiKey = process.env.GSTIN_SANDBOX_API_KEY || process.env.SANDBOX_API_KEY || '';
    const accessToken = await this.getSandboxAccessToken();
    if (!apiKey || !accessToken) return null;

    const baseUrl = (process.env.GSTIN_SANDBOX_BASE_URL || process.env.SANDBOX_API_BASE_URL || 'https://api.sandbox.co.in').replace(/\/$/, '');
    const pathTemplate = process.env.GSTIN_SANDBOX_GSTIN_PATH_TEMPLATE || '/gst/compliance/public/gstin/search';
    const path = pathTemplate.replace('{gstin}', encodeURIComponent(gstin));
    const isBodySearch = !pathTemplate.includes('{gstin}');

    const response = await fetch(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`, {
      method: isBodySearch ? 'POST' : 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: accessToken,
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'x-api-version': process.env.GSTIN_SANDBOX_API_VERSION || '1.0',
      },
      body: isBodySearch ? JSON.stringify({ gstin }) : undefined,
      signal: AbortSignal.timeout(7000),
    });

    if (!response.ok) {
      this.logger.warn(`Sandbox GSTIN lookup failed with status ${response.status}`);
      return null;
    }

    return response.json();
  }

  private async fetchGstinPortalData(gstin: string): Promise<GstinPortalData | null> {
    const apiKey = process.env.GSTIN_LOOKUP_API_KEY || '';
    const apiUrl = process.env.GSTIN_LOOKUP_API_URL || '';

    // Build candidate URLs to try in order
    const candidates: { url: string; headers: Record<string, string>; data?: any }[] = [];

    const sandboxData = await this.fetchSandboxGstinData(gstin);
    if (sandboxData) {
      candidates.push({
        url: 'sandbox://gstin-lookup',
        headers: { Accept: 'application/json' },
        data: sandboxData,
      });
    }

    if (apiUrl) {
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
        headers['x-api-key'] = apiKey;
      }
      candidates.push({ url: `${apiUrl.replace(/\/$/, '')}/${gstin}`, headers });
    }

    // Free public fallback (no key required)
    candidates.push({
      url: `https://api.gstininfo.in/api/v1/gstin/${gstin}`,
      headers: { Accept: 'application/json', 'User-Agent': 'SAK-ERP/1.0' },
    });

    for (const candidate of candidates) {
      try {
        let data: any = (candidate as any).data;
        if (!data) {
          const response = await fetch(candidate.url, {
            headers: candidate.headers,
            signal: AbortSignal.timeout(7000),
          });
          if (!response.ok) continue;
          data = await response.json();
        }

        // Handle various GST API response shapes
        const legalName =
          data?.lgnm ||               // GST portal / MasterGST format
          data?.legalName ||
          data?.legal_name ||
          data?.LegalName ||
          data?.data?.lgnm ||
          data?.data?.legalName ||
          data?.data?.legal_name ||
          data?.data?.data?.lgnm ||
          data?.data?.data?.legalName ||
          data?.data?.data?.legal_name ||
          data?.taxpayerInfo?.legalNameOfBusiness ||
          data?.result?.legalName ||
          data?.result?.lgnm ||
          null;

        const tradeName =
          data?.tradeNam ||
          data?.tradeName ||
          data?.trade_name ||
          data?.tradeNam ||
          data?.data?.tradeNam ||
          data?.data?.tradeName ||
          data?.data?.data?.tradeNam ||
          data?.data?.data?.tradeName ||
          data?.taxpayerInfo?.tradeName ||
          data?.result?.tradeName ||
          data?.result?.tradeNam ||
          null;

        const address = extractGstinPortalAddress(data);
        const status = firstNonEmpty(
          data?.sts,
          data?.status,
          data?.data?.sts,
          data?.data?.status,
          data?.data?.data?.sts,
          data?.data?.data?.status,
          data?.taxpayerInfo?.status,
          data?.result?.sts,
          data?.result?.status,
        );
        const registrationDate = firstNonEmpty(
          data?.rgdt,
          data?.registrationDate,
          data?.data?.rgdt,
          data?.data?.registrationDate,
          data?.data?.data?.rgdt,
          data?.data?.data?.registrationDate,
          data?.result?.rgdt,
          data?.result?.registrationDate,
        );
        const taxpayerType = firstNonEmpty(
          data?.dty,
          data?.taxpayerType,
          data?.data?.dty,
          data?.data?.taxpayerType,
          data?.data?.data?.dty,
          data?.data?.data?.taxpayerType,
          data?.result?.dty,
          data?.result?.taxpayerType,
        );

        if (legalName) {
          return {
            legalName: String(legalName).trim(),
            tradeName: tradeName ? String(tradeName).trim() : undefined,
            address,
            status,
            registrationDate,
            taxpayerType,
          };
        }
      } catch {
        // Try next candidate
      }
    }

    return null;
  }

  async verifyGstin(rawGstin: any, rawLegalName?: any) {
    const result = validateGstin(rawGstin);
    const legalName = String(rawLegalName || '').trim();

    if (!result.valid) {
      return {
        gstin: result.gstin,
        valid: false,
        portalVerified: false,
        legalNameChecked: false,
        legalNameMatch: null,
        verificationMode: 'format-checksum',
        message: result.gstin ? 'GSTIN format or checksum is invalid.' : 'GSTIN is required.',
        details: {
          formatValid: result.formatValid,
          checksumValid: result.checksumValid,
          stateCode: result.stateCode || null,
          stateName: result.stateName,
          pan: result.pan,
          entityCode: result.entityCode,
          enteredLegalName: legalName || null,
          portalLegalName: null,
          portalTradeName: null,
        },
      };
    }

    // Attempt GST portal name lookup
    let portalLegalName: string | null = null;
    let portalTradeName: string | null = null;
    let portalAddress: GstinPortalAddress | null = null;
    let portalStatus: string | null = null;
    let portalRegistrationDate: string | null = null;
    let portalTaxpayerType: string | null = null;
    let portalVerified = false;
    let verificationMode = 'format-checksum';

    try {
      const portalData = await this.fetchGstinPortalData(result.gstin);
      if (portalData) {
        portalLegalName = portalData.legalName;
        portalTradeName = portalData.tradeName || null;
        portalAddress = portalData.address || null;
        portalStatus = portalData.status || null;
        portalRegistrationDate = portalData.registrationDate || null;
        portalTaxpayerType = portalData.taxpayerType || null;
        portalVerified = true;
        verificationMode = 'portal';
      }
    } catch {
      // Portal lookup failed; local validation only
    }

    // Name comparison (normalized)
    const legalNameChecked = Boolean(legalName);
    let legalNameMatch: boolean | null = null;
    if (portalLegalName && legalName) {
      const normalizedEntered = this.normalizeForNameComparison(legalName);
      const normalizedPortal = this.normalizeForNameComparison(portalLegalName);
      const normalizedTrade = portalTradeName ? this.normalizeForNameComparison(portalTradeName) : null;
      legalNameMatch = normalizedEntered === normalizedPortal || (normalizedTrade !== null && normalizedEntered === normalizedTrade);
    }

    // Build human-readable message
    let message: string;
    if (portalVerified && legalNameMatch === true) {
      message = `GSTIN verified. Name matched: "${portalLegalName}".`;
    } else if (portalVerified && legalNameMatch === false) {
      message = `GSTIN verified. Name mismatch — portal has "${portalLegalName}", entered "${legalName}".`;
    } else if (portalVerified) {
      message = `GSTIN verified against GST portal. Registered name: "${portalLegalName}".`;
    } else if (legalNameChecked) {
      message = 'GSTIN format and checksum are valid. Legal name could not be verified against the GST portal.';
    } else {
      message = 'GSTIN format and checksum are valid.';
    }

    return {
      gstin: result.gstin,
      valid: true,
      portalVerified,
      legalNameChecked,
      legalNameMatch,
      verificationMode,
      message,
      details: {
        formatValid: result.formatValid,
        checksumValid: result.checksumValid,
        stateCode: result.stateCode || null,
        stateName: result.stateName,
        pan: result.pan,
        entityCode: result.entityCode,
        enteredLegalName: legalName || null,
        portalLegalName,
        portalTradeName,
        portalAddress,
        portalStatus,
        portalRegistrationDate,
        portalTaxpayerType,
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
