'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, Globe2, MapPin, Phone, Mail, Save } from 'lucide-react';
import { apiClient } from '../../../../../lib/api-client';
import { hasModulePermission, readStoredUser } from '@/lib/rbac';

type Company = {
  id: string;
  name: string;
  domain?: string;
  address?: string;
  phone?: string;
  email?: string;
  tax_id?: string;
  logo_url?: string;
  settings?: Record<string, any>;
  market_profile?: 'INDIA' | 'UAE' | 'EGYPT';
  default_currency?: 'INR' | 'AED' | 'EGP';
  tax_regime?: string;
};

type OrganizationForm = {
  companyName: string;
  portalUrl: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  email: string;
  taxId: string;
  tradingName: string;
  secondaryPhone: string;
  accountsEmail: string;
  logoUrl: string;
  timezone: string;
  language: string;
  marketProfile: 'INDIA' | 'UAE' | 'EGYPT';
};

const defaultForm: OrganizationForm = {
  companyName: '',
  portalUrl: '',
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
  phone: '',
  email: '',
  taxId: '',
  tradingName: '',
  secondaryPhone: '',
  accountsEmail: '',
  logoUrl: '',
  timezone: 'Asia/Kolkata',
  language: 'English',
  marketProfile: 'INDIA',
};

function parseOrganization(company: Company): OrganizationForm {
  const saved = company.settings?.organization || {};
  const marketProfile = ['UAE', 'EGYPT'].includes(String(company.market_profile))
    ? company.market_profile as 'UAE' | 'EGYPT'
    : 'INDIA';
  return {
    ...defaultForm,
    companyName: company.name || '',
    portalUrl: company.domain || '',
    street: saved.street || company.address || '',
    city: saved.city || '',
    state: saved.state || '',
    postalCode: saved.postalCode || '',
    country: marketProfile === 'EGYPT' ? 'Egypt' : marketProfile === 'UAE' ? 'United Arab Emirates' : saved.country || defaultForm.country,
    phone: company.phone || saved.phone || '',
    email: company.email || saved.email || '',
    taxId: company.tax_id || saved.taxId || '',
    tradingName: saved.tradingName || '',
    secondaryPhone: saved.secondaryPhone || '',
    accountsEmail: saved.accountsEmail || '',
    logoUrl: company.logo_url || '',
    timezone: normalizeTimezone(saved.timezone) || (marketProfile === 'EGYPT' ? 'Africa/Cairo' : marketProfile === 'UAE' ? 'Asia/Dubai' : defaultForm.timezone),
    language: saved.language || (marketProfile === 'EGYPT' ? 'Arabic' : defaultForm.language),
    marketProfile,
  };
}

function normalizeTimezone(value: unknown): string {
  const timezone = String(value || '').trim();
  if (!timezone) return '';
  if (timezone.includes('Africa/Cairo')) return 'Africa/Cairo';
  if (timezone.includes('Asia/Dubai')) return 'Asia/Dubai';
  if (timezone.includes('Asia/Kolkata')) return 'Asia/Kolkata';
  if (timezone.includes('Etc/UTC') || timezone.includes('Greenwich')) return 'Etc/UTC';
  if (timezone.includes('America/New_York') || timezone.includes('Eastern Time')) return 'America/New_York';
  return timezone;
}

function buildAddress(form: OrganizationForm): string {
  return [form.street, form.city, form.state, form.postalCode, form.country]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(', ');
}

export default function OrganizationSettings() {
  const canEditSettings = hasModulePermission(readStoredUser(), 'Settings', 'edit');
  const [company, setCompany] = useState<Company | null>(null);
  const [form, setForm] = useState<OrganizationForm>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchCompany();
  }, []);

  const adminEmail = useMemo(() => form.email || 'admin@company.com', [form.email]);
  const displayPhone = useMemo(() => form.phone || '-', [form.phone]);

  const fetchCompany = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<Company>('/tenant/current');
      setCompany(data);
      setForm(parseOrganization(data));
    } finally {
      setLoading(false);
    }
  };

  const updateField = <K extends keyof OrganizationForm>(key: K, value: OrganizationForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const uploadLogo = async (file?: File) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type)) {
      setMessage('Choose a PNG, JPG, WebP, or SVG logo file.');
      return;
    }
    setUploadingLogo(true);
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const result = await apiClient.postForm<{ url: string }>('/upload', formData);
      updateField('logoUrl', result.url);
      setMessage('Logo uploaded. Save organization details to apply it.');
    } catch (error: any) {
      setMessage(error.message || 'Logo upload failed.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!company) return;
    if (!canEditSettings) {
      setMessage('You do not have permission to update organization settings');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const nextSettings = {
        ...(company.settings || {}),
        organization: {
          tradingName: form.tradingName,
          secondaryPhone: form.secondaryPhone,
          accountsEmail: form.accountsEmail,
          street: form.street,
          city: form.city,
          state: form.state,
          postalCode: form.postalCode,
          country: form.country,
          timezone: form.timezone,
          language: form.language,
        },
      };

      const updated = await apiClient.put<Company>('/tenant/current', {
        ...company,
        name: form.companyName,
        domain: form.portalUrl,
        address: buildAddress(form),
        phone: form.phone,
        email: form.email,
        tax_id: form.taxId,
        logo_url: form.logoUrl,
        market_profile: form.marketProfile,
        settings: nextSettings,
      });

      setCompany(updated);
      setForm(parseOrganization(updated));
      const selectedLanguage = form.language === 'Arabic' ? 'ar' : 'en';
      localStorage.setItem('mizantra-language', selectedLanguage);
      setMessage('Organization information saved successfully.');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(error.message || 'Failed to save organization information');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-[#8B6F47]">Loading organization information...</div>;
  }

  return (
    <div className="min-h-[calc(100vh-96px)] bg-[#F8F3EA] p-5">
      <div className="mb-4 flex items-center justify-between border-b pb-4" style={{ borderColor: '#E8DCC4' }}>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#8B6F47' }}>Settings</p>
          <h1 className="text-2xl font-bold" style={{ color: '#3B2A1E' }}>Organization</h1>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-md border bg-white p-4" style={{ borderColor: '#E8DCC4' }}>
        <div>
          <p className="font-semibold" style={{ color: '#3B2A1E' }}>Company identity and delivery</p>
          <p className="text-sm" style={{ color: '#8B6F47' }}>Set legal and contact details here, then configure outbound email and WhatsApp.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/settings?tab=email" className="rounded-md border px-3 py-2 text-sm font-semibold" style={{ borderColor: '#D7C29E', color: '#6F4E37' }}>Email sending settings</Link>
          <Link href="/dashboard/settings/whatsapp" className="rounded-md px-3 py-2 text-sm font-semibold text-white" style={{ backgroundColor: '#167C55' }}>WhatsApp setup</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="rounded-md border bg-white" style={{ borderColor: '#E8DCC4' }}>
          <div className="border-b p-5" style={{ borderColor: '#E8DCC4' }}>
            <p className="text-xs font-bold uppercase" style={{ color: '#8B6F47' }}>Organization Info</p>
            <h2 className="mt-2 text-2xl font-semibold" style={{ color: '#3B2A1E' }}>{form.companyName || 'Company Name'}</h2>
            <p className="mt-1 text-xs" style={{ color: '#8B6F47' }}>{form.portalUrl || 'Portal URL not set'}</p>
          </div>
          <div className="space-y-5 p-5 text-sm" style={{ color: '#6F4E37' }}>
            <InfoRow icon={Building2} label="Admin" value={adminEmail} action="Change Owner" />
            <InfoRow icon={Phone} label="Phone" value={displayPhone} />
            <InfoRow icon={Mail} label="Email" value={form.email || '-'} />
            <InfoRow icon={Globe2} label="Country" value={form.country || '-'} />
            <div className="rounded-md border p-4" style={{ borderColor: '#E8DCC4', backgroundColor: '#FFFCF7' }}>
              <p className="text-xs font-bold uppercase" style={{ color: '#8B6F47' }}>Regional Defaults</p>
              <p className="mt-2 font-semibold" style={{ color: '#3B2A1E' }}>{form.timezone}</p>
              <p className="text-sm" style={{ color: '#8B6F47' }}>{form.language}</p>
            </div>
          </div>
        </aside>

        <form onSubmit={handleSubmit} className="rounded-md border bg-white" style={{ borderColor: '#E8DCC4' }}>
          <div className="border-b p-5" style={{ borderColor: '#E8DCC4' }}>
            <h2 className="font-semibold" style={{ color: '#3B2A1E' }}>Edit Organization Information</h2>
          </div>

          <div className="space-y-8 p-5">
            <SectionTitle title="Company Information" />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <TextField label="Legal Company Name" required value={form.companyName} onChange={(value) => updateField('companyName', value)} />
              <TextField label="Trading / Display Name" value={form.tradingName} onChange={(value) => updateField('tradingName', value)} />
              <TextField label="Portal URL" required value={form.portalUrl} onChange={(value) => updateField('portalUrl', value)} />
              <TextField label="Official Phone" value={form.phone} onChange={(value) => updateField('phone', value)} />
              <TextField label="Additional Contact Number" value={form.secondaryPhone} onChange={(value) => updateField('secondaryPhone', value)} />
              <TextField label="Official Email" value={form.email} onChange={(value) => updateField('email', value)} />
              <TextField label="Accounts / Invoicing Email" value={form.accountsEmail} onChange={(value) => updateField('accountsEmail', value)} />
              <TextField label={form.country === 'Egypt' || form.marketProfile === 'EGYPT' ? 'Egypt VAT Registration Number' : form.marketProfile === 'UAE' ? 'TRN / Tax Registration Number' : 'GSTIN / Tax ID'} value={form.taxId} onChange={(value) => updateField('taxId', value.toUpperCase())} />
              <div className="block text-sm font-medium" style={{ color: '#6F4E37' }}>
                Company Logo
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  {form.logoUrl && <img src={form.logoUrl} alt="Company logo preview" className="h-14 max-w-36 rounded border bg-white object-contain p-1" />}
                  <input aria-label="Upload company logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" disabled={!canEditSettings || uploadingLogo} onChange={(event) => uploadLogo(event.target.files?.[0])} className="min-w-0 flex-1 text-sm" />
                </div>
                <input type="url" value={form.logoUrl} onChange={(event) => updateField('logoUrl', event.target.value)} placeholder="Or paste a hosted image URL" className="mt-2 w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-[#8B6F47]" style={{ borderColor: '#D7C29E', color: '#3B2A1E' }} />
                <span className="mt-1 block text-xs font-normal" style={{ color: '#8B6F47' }}>{uploadingLogo ? 'Uploading logo…' : 'PNG, JPG, WebP, or SVG. Used on company documents and email branding.'}</span>
              </div>
            </div>

            <SectionTitle title="Address Information" />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <TextField label="Street" required value={form.street} onChange={(value) => updateField('street', value)} />
              <TextField label="City" required value={form.city} onChange={(value) => updateField('city', value)} />
              <TextField label="State" required value={form.state} onChange={(value) => updateField('state', value)} />
              <TextField label="Zip / Postal Code" required value={form.postalCode} onChange={(value) => updateField('postalCode', value)} />
              <SelectField label="Country" required value={form.country} options={['India', 'Egypt', 'United Arab Emirates', 'United States', 'United Kingdom']} onChange={(value) => {
                updateField('country', value);
                const profile = value === 'Egypt' ? 'EGYPT' : value === 'United Arab Emirates' ? 'UAE' : value === 'India' ? 'INDIA' : null;
                if (profile) updateField('marketProfile', profile);
                if (value === 'Egypt') updateField('timezone', 'Africa/Cairo');
                else if (value === 'United Arab Emirates') updateField('timezone', 'Asia/Dubai');
                else if (value === 'India') updateField('timezone', 'Asia/Kolkata');
              }} />
            </div>

            <SectionTitle title="Regional Information" />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <SelectField label="Market Profile" required value={form.marketProfile} options={['INDIA', 'UAE', 'EGYPT']} onChange={(value) => {
                const profile = value as OrganizationForm['marketProfile'];
                updateField('marketProfile', profile);
                if (!form.country || ['India', 'Egypt', 'United Arab Emirates'].includes(form.country)) {
                  updateField('country', profile === 'EGYPT' ? 'Egypt' : profile === 'UAE' ? 'United Arab Emirates' : 'India');
                }
                if (form.timezone === defaultForm.timezone || ['Africa/Cairo', 'Asia/Dubai', 'Asia/Kolkata'].includes(form.timezone)) {
                  updateField('timezone', profile === 'EGYPT' ? 'Africa/Cairo' : profile === 'UAE' ? 'Asia/Dubai' : 'Asia/Kolkata');
                }
              }} />
              <SelectField
                label="Time Zone"
                value={form.timezone}
                options={[
                  { value: 'Asia/Kolkata', label: 'India Standard Time (Asia/Kolkata, UTC+05:30)' },
                  { value: 'Asia/Dubai', label: 'Gulf Standard Time (Asia/Dubai, UTC+04:00)' },
                  { value: 'Africa/Cairo', label: 'Cairo, Egypt (Africa/Cairo, UTC+02:00 winter / UTC+03:00 summer)' },
                  { value: 'Etc/UTC', label: 'Greenwich Mean Time (UTC)' },
                  { value: 'America/New_York', label: 'Eastern Time (America/New_York)' },
                ]}
                onChange={(value) => updateField('timezone', value)}
              />
              <SelectField label="Language" value={form.language} options={['English', 'Hindi', 'Arabic']} onChange={(value) => updateField('language', value)} />
            </div>

            {message && (
              <div className={`rounded-md p-3 text-sm ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-800'}`}>
                {message}
              </div>
            )}
          </div>

          <div className="flex justify-end border-t p-4" style={{ borderColor: '#E8DCC4' }}>
            <button
              type="submit"
              disabled={saving || !canEditSettings}
              className="inline-flex items-center gap-2 rounded-md px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: '#8B6F47' }}
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Organization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, action }: { icon: any; label: string; value: string; action?: string }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#8B6F47' }} />
      <div className="min-w-0">
        <p className="truncate font-medium" style={{ color: '#3B2A1E' }}>{value}</p>
        <p className="text-xs" style={{ color: '#8B6F47' }}>{label}</p>
        {action && <button type="button" className="mt-1 text-xs font-semibold" style={{ color: '#0F62FE' }}>{action}</button>}
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2">
      <MapPin className="h-4 w-4" style={{ color: '#8B6F47' }} />
      <h3 className="text-sm font-bold" style={{ color: '#3156A3' }}>{title}</h3>
    </div>
  );
}

function TextField({ label, value, onChange, required }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="block text-sm font-medium" style={{ color: '#6F4E37' }}>
      {label} {required ? <span className="text-red-600">*</span> : null}
      <input
        type="text"
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-[#8B6F47]"
        style={{ borderColor: '#D7C29E', color: '#3B2A1E' }}
      />
    </label>
  );
}

function SelectField({ label, value, options, onChange, required }: { label: string; value: string; options: Array<string | { value: string; label: string }>; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label className="block text-sm font-medium" style={{ color: '#6F4E37' }}>
      {label} {required ? <span className="text-red-600">*</span> : null}
      <select
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-[#8B6F47]"
        style={{ borderColor: '#D7C29E', color: '#3B2A1E' }}
      >
        {options.map((option) => {
          const optionValue = typeof option === 'string' ? option : option.value;
          const optionLabel = typeof option === 'string' ? option : option.label;
          return <option key={optionValue} value={optionValue}>{optionLabel}</option>;
        })}
      </select>
    </label>
  );
}
