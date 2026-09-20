'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Building2,
  CheckCircle2,
  CreditCard,
  Factory,
  FileText,
  Headphones,
  Mail,
  RefreshCw,
  Save,
  Send,
  Settings,
  Shield,
  ShoppingCart,
  ToggleLeft,
  ToggleRight,
  Users,
} from 'lucide-react';
import { apiClient } from '../../../../../lib/api-client';
import { hasModulePermission, readStoredUser } from '@/lib/rbac';

interface EmailConfig {
  id?: number;
  email_type: string;
  email_address: string;
  display_name?: string;
  description?: string;
  is_active?: boolean;
}

type EmailStatus = {
  outboundEnabled: boolean;
  smtpConfigured: boolean;
  gmailOAuthConfigured: boolean;
};

type EmailTestResult = {
  success: boolean;
  recipient: string;
  transport: string;
  verifiedAt: string;
};

type ScenarioDefinition = {
  code: string;
  title: string;
  description: string;
  module: string;
  trigger: string;
  timing: 'OVERDUE' | 'LOOKAHEAD';
  defaultDays: number;
  defaultScope: 'INTERNAL' | 'EXTERNAL' | 'BOTH';
  defaultSender: string;
  defaultDepartments: string[];
};

type ScenarioState = ScenarioDefinition & {
  id?: string;
  enabled: boolean;
  days: number;
  repeatEveryDays: number;
  maxReminders: number;
  recipientScope: 'INTERNAL' | 'EXTERNAL' | 'BOTH';
  senderType: string;
  departments: string[];
  recipientsText: string;
};

type SenderDefinition = {
  type: string;
  title: string;
  module: string;
  purpose: string;
  examples: string;
  usageOptions: string[];
  icon: React.ComponentType<{ className?: string }>;
};

const senderDefinitions: SenderDefinition[] = [
  {
    type: 'sales',
    title: 'Sales Sender',
    module: 'Sales',
    purpose: 'Quotations, sales orders, customer dispatch documents and commercial follow-up.',
    examples: 'Quotes, sales confirmations, customer reminders',
    usageOptions: ['Quotations', 'Sales orders', 'Customer dispatch documents', 'Commercial follow-up'],
    icon: Send,
  },
  {
    type: 'purchase',
    title: 'Purchase Sender',
    module: 'Procurement',
    purpose: 'RFQs, purchase orders, vendor communication and procurement follow-up.',
    examples: 'RFQ, PO PDF, vendor clarification, delivery follow-up',
    usageOptions: ['RFQs', 'Purchase orders', 'Vendor communication', 'Procurement follow-up'],
    icon: ShoppingCart,
  },
  {
    type: 'production',
    title: 'Production Sender',
    module: 'Production',
    purpose: 'Job orders, subcontracting, shop-floor coordination and outside processing alerts.',
    examples: 'Job order, subcontracting issue, operation update',
    usageOptions: ['Job orders', 'Subcontracting', 'Shop-floor coordination', 'Outside processing alerts'],
    icon: Factory,
  },
  {
    type: 'accounts',
    title: 'Accounts Sender',
    module: 'Accounts',
    purpose: 'Supplier invoices, payment advice, advances, debit notes and account statements.',
    examples: 'Payment advice, supplier statement, debit note',
    usageOptions: ['Supplier invoices', 'Payment advice', 'Advances', 'Debit notes', 'Account statements'],
    icon: CreditCard,
  },
  {
    type: 'reminders',
    title: 'Reminder Sender',
    module: 'Automation',
    purpose: 'Automated due-date reminders, pending approvals and exception escalations.',
    examples: 'Pending approval, overdue GRN, due invoice reminder',
    usageOptions: ['Due-date reminders', 'Pending approvals', 'Exception escalations'],
    icon: Bell,
  },
  {
    type: 'quality',
    title: 'Quality Sender',
    module: 'Quality',
    purpose: 'QC inspection, rejected material, deviation notes and quality communication.',
    examples: 'QC hold, rejection note, inspection report',
    usageOptions: ['QC inspection', 'Rejected material', 'Deviation notes', 'Quality communication'],
    icon: Shield,
  },
  {
    type: 'documents',
    title: 'Document Sender',
    module: 'Documents',
    purpose: 'Document dispatch, controlled PDFs, drawings and letterhead-based communication.',
    examples: 'PDF dispatch, drawing issue, document acknowledgement',
    usageOptions: ['Document dispatch', 'Controlled PDFs', 'Drawings', 'Letterhead communication'],
    icon: FileText,
  },
  {
    type: 'support',
    title: 'Support Sender',
    module: 'Service',
    purpose: 'Customer support requests, service tickets and service communication.',
    examples: 'Ticket updates, service acknowledgement',
    usageOptions: ['Customer support requests', 'Service tickets', 'Service communication'],
    icon: Headphones,
  },
  {
    type: 'technical',
    title: 'Technical Sender',
    module: 'Engineering',
    purpose: 'Engineering questions, product specifications and technical clarification.',
    examples: 'Drawing clarification, product spec reply',
    usageOptions: ['Engineering questions', 'Product specifications', 'Technical clarification'],
    icon: Settings,
  },
  {
    type: 'hr',
    title: 'HR Sender',
    module: 'HR',
    purpose: 'Employee notifications, payroll, attendance, leave and HR communication.',
    examples: 'Leave approval, payroll note, employee document',
    usageOptions: ['Employee notifications', 'Payroll', 'Attendance', 'Leave', 'HR communication'],
    icon: Users,
  },
  {
    type: 'admin',
    title: 'Admin Sender',
    module: 'System',
    purpose: 'System notifications, critical alerts, user access and administrative messages.',
    examples: 'Access alerts, system health, security message',
    usageOptions: ['System notifications', 'Critical alerts', 'User access', 'Administrative messages'],
    icon: Building2,
  },
  {
    type: 'noreply',
    title: 'No Reply Sender',
    module: 'System',
    purpose: 'Automated notifications where users should not reply.',
    examples: 'OTP-style alerts, automated status updates',
    usageOptions: ['OTP-style alerts', 'Automated status updates'],
    icon: Mail,
  },
];

const fieldClass =
  'h-11 w-full rounded-md border bg-white px-3 text-sm outline-none transition focus:border-[#8B6F47] focus:ring-2 focus:ring-[#E8DCC4] disabled:bg-[#F8F3EA] disabled:text-[#8B6F47]';

const departments = ['Sales', 'Purchase', 'Accounts', 'Production', 'Quality', 'Service', 'Inventory', 'HR', 'Management'];

const scenarioDefinitions: ScenarioDefinition[] = [
  { code: 'CUSTOMER_PAYMENT_OVERDUE', title: 'Customer payment overdue', description: 'Remind the customer after an invoice remains unpaid beyond its due date.', module: 'SALES', trigger: 'RECEIVABLE_OVERDUE', timing: 'OVERDUE', defaultDays: 2, defaultScope: 'EXTERNAL', defaultSender: 'accounts', defaultDepartments: ['Accounts', 'Sales'] },
  { code: 'PO_DELIVERY_OVERDUE', title: 'Open PO past delivery date', description: 'Notify purchasing stakeholders when an approved or partially received PO remains open.', module: 'PURCHASE', trigger: 'PO_OVERDUE', timing: 'OVERDUE', defaultDays: 1, defaultScope: 'INTERNAL', defaultSender: 'purchase', defaultDepartments: ['Purchase', 'Management'] },
  { code: 'QUOTATION_EXPIRING', title: 'Quotation follow-up', description: 'Contact the customer before a quotation expires.', module: 'SALES', trigger: 'QUOTATION_EXPIRING', timing: 'LOOKAHEAD', defaultDays: 3, defaultScope: 'EXTERNAL', defaultSender: 'sales', defaultDepartments: ['Sales'] },
  { code: 'SERVICE_SLA_RISK', title: 'Service SLA at risk', description: 'Alert service owners before an open ticket breaches its SLA.', module: 'SERVICE', trigger: 'SERVICE_SLA_RISK', timing: 'LOOKAHEAD', defaultDays: 1, defaultScope: 'INTERNAL', defaultSender: 'support', defaultDepartments: ['Service', 'Management'] },
  { code: 'SERVICE_CONTRACT_EXPIRING', title: 'Service contract expiry', description: 'Remind customers that an active service contract is approaching expiry.', module: 'SERVICE', trigger: 'SERVICE_CONTRACT_EXPIRING', timing: 'LOOKAHEAD', defaultDays: 30, defaultScope: 'BOTH', defaultSender: 'support', defaultDepartments: ['Service', 'Sales'] },
  { code: 'WARRANTY_EXPIRING', title: 'Warranty expiry', description: 'Inform customers and service stakeholders before warranty coverage ends.', module: 'SERVICE', trigger: 'WARRANTY_EXPIRING', timing: 'LOOKAHEAD', defaultDays: 30, defaultScope: 'BOTH', defaultSender: 'support', defaultDepartments: ['Service'] },
  { code: 'PREVENTIVE_MAINTENANCE_DUE', title: 'Preventive maintenance due', description: 'Remind responsible teams and customers about scheduled maintenance.', module: 'SERVICE', trigger: 'PREVENTIVE_MAINTENANCE_DUE', timing: 'LOOKAHEAD', defaultDays: 7, defaultScope: 'BOTH', defaultSender: 'support', defaultDepartments: ['Service', 'Production'] },
  { code: 'LOW_STOCK', title: 'Low-stock exception', description: 'Notify purchase and inventory teams about unresolved low-stock alerts.', module: 'INVENTORY', trigger: 'LOW_STOCK', timing: 'OVERDUE', defaultDays: 0, defaultScope: 'INTERNAL', defaultSender: 'reminders', defaultDepartments: ['Inventory', 'Purchase'] },
  { code: 'QUALITY_REJECTION', title: 'High rejection rate', description: 'Escalate production quality rejection rates above the configured threshold.', module: 'OPERATIONS', trigger: 'QUALITY_REJECTION_RATE', timing: 'OVERDUE', defaultDays: 7, defaultScope: 'INTERNAL', defaultSender: 'quality', defaultDepartments: ['Quality', 'Production', 'Management'] },
  { code: 'CUSTOMER_CREDIT_EXPOSURE', title: 'Customer credit exposure', description: 'Alert accounts and sales when exposure exceeds the customer credit limit.', module: 'FINANCE', trigger: 'CUSTOMER_CREDIT_EXPOSURE', timing: 'OVERDUE', defaultDays: 0, defaultScope: 'INTERNAL', defaultSender: 'accounts', defaultDepartments: ['Accounts', 'Sales', 'Management'] },
];

function defaultScenarioState(definition: ScenarioDefinition): ScenarioState {
  return { ...definition, enabled: false, days: definition.defaultDays, repeatEveryDays: 3, maxReminders: 5, recipientScope: definition.defaultScope, senderType: definition.defaultSender, departments: definition.defaultDepartments, recipientsText: '' };
}

function normalizeConfig(configs: EmailConfig[]): EmailConfig[] {
  const byType = new Map(configs.map((config) => [config.email_type, config]));
  return senderDefinitions.map((definition) => ({
    email_type: definition.type,
    email_address: '',
    display_name: definition.title.replace(' Sender', ''),
    description: definition.purpose,
    is_active: true,
    ...byType.get(definition.type),
  }));
}

function selectedUsages(definition: SenderDefinition, config: EmailConfig): string[] {
  const description = String(config.description || definition.purpose).toLowerCase();
  return definition.usageOptions.filter((option) => description.includes(option.toLowerCase()));
}

export default function EmailSettings() {
  const canEditSettings = hasModulePermission(readStoredUser(), 'Settings', 'edit');
  const [emailConfigs, setEmailConfigs] = useState<EmailConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [emailStatus, setEmailStatus] = useState<EmailStatus | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<EmailTestResult | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioState[]>(scenarioDefinitions.map(defaultScenarioState));

  useEffect(() => {
    fetchEmailConfig();
  }, []);

  const activeCount = useMemo(
    () => emailConfigs.filter((config) => config.is_active !== false).length,
    [emailConfigs],
  );

  const uniqueEmailCount = useMemo(() => {
    const unique = new Set(
      emailConfigs
        .map((config) => config.email_address.trim().toLowerCase())
        .filter(Boolean),
    );
    return unique.size;
  }, [emailConfigs]);

  const fetchEmailConfig = async () => {
    try {
      setLoading(true);
      const [data, status] = await Promise.all([
        apiClient.get<EmailConfig[]>('/emails/config'),
        apiClient.get<EmailStatus>('/emails/status'),
      ]);
      let rules: any[] = [];
      let rulesAccessible = true;
      try {
        rules = await apiClient.get<any[]>('/automation/rules');
      } catch {
        rulesAccessible = false;
      }
      setEmailConfigs(normalizeConfig(data));
      setEmailStatus(status);
      setScenarios(scenarioDefinitions.map((definition) => {
        const rule = (Array.isArray(rules) ? rules : []).find((item) => item.rule_code === `EMAIL_SCENARIO_${definition.code}`);
        if (!rule) return defaultScenarioState(definition);
        const conditions = rule.conditions || {};
        return {
          ...definition,
          id: rule.id,
          enabled: rule.is_active === true,
          days: Number(definition.timing === 'LOOKAHEAD' ? conditions.days : conditions.delay_days) || 0,
          repeatEveryDays: Number(conditions.repeat_every_days) || 3,
          maxReminders: Number(conditions.max_reminders) || 5,
          recipientScope: conditions.recipient_scope || definition.defaultScope,
          senderType: conditions.sender_type || definition.defaultSender,
          departments: Array.isArray(conditions.departments) ? conditions.departments : definition.defaultDepartments,
          recipientsText: Array.isArray(rule.recipients) ? rule.recipients.join(', ') : '',
        };
      }));
      setMessage(rulesAccessible ? '' : 'Sender configuration loaded, but your account cannot access reminder policies. Ask an administrator to enable Automation & Communication.');
    } catch {
      setMessage('Failed to load email configuration');
    } finally {
      setLoading(false);
    }
  };

  const updateConfig = (emailType: string, patch: Partial<EmailConfig>) => {
    setEmailConfigs((current) =>
      current.map((config) =>
        config.email_type === emailType ? { ...config, ...patch } : config,
      ),
    );
  };

  const updateScenario = (code: string, patch: Partial<ScenarioState>) => {
    setScenarios((current) => current.map((scenario) => scenario.code === code ? { ...scenario, ...patch } : scenario));
  };

  const handleFillEmptyFromDefault = () => {
    const fallback =
      emailConfigs.find((config) => config.email_type === 'noreply')?.email_address ||
      emailConfigs.find((config) => config.email_address.trim())?.email_address ||
      '';

    if (!fallback) {
      setMessage('Enter at least one email address before copying to empty rows.');
      return;
    }

    setEmailConfigs((current) =>
      current.map((config) => ({
        ...config,
        email_address: config.email_address.trim() ? config.email_address : fallback,
      })),
    );
  };

  const handleTestConnection = async () => {
    if (!canEditSettings || !emailStatus?.outboundEnabled) return;
    setTestingConnection(true);
    setMessage('');
    try {
      const result = await apiClient.post<EmailTestResult>('/emails/test-connection', {});
      setEmailTestResult(result);
      setMessage(`Test email sent successfully to ${result.recipient} using ${result.transport}.`);
    } catch (error: any) {
      setEmailTestResult(null);
      setMessage(error.message || 'Failed to send test email');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canEditSettings) {
      setMessage('You do not have permission to update email configuration');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const payload = emailConfigs.map((config) => ({
        email_type: config.email_type,
        email_address: config.email_address.trim(),
        display_name: config.display_name?.trim(),
        description: config.description?.trim(),
        is_active: config.is_active !== false,
      }));

      await apiClient.put('/emails/config', payload);
      for (const scenario of scenarios) {
        const recipients = scenario.recipientsText.split(/[;,]/).map((value) => value.trim()).filter(Boolean);
        if (scenario.enabled && scenario.recipientScope !== 'EXTERNAL' && recipients.length === 0) {
          throw new Error(`Enter at least one internal recipient for “${scenario.title}”.`);
        }
        const rulePayload = {
          rule_code: `EMAIL_SCENARIO_${scenario.code}`,
          rule_name: scenario.title,
          module: scenario.module,
          trigger_type: scenario.trigger,
          action_type: 'EMAIL',
          recipients,
          conditions: {
            days: scenario.timing === 'LOOKAHEAD' ? scenario.days : 7,
            delay_days: scenario.timing === 'OVERDUE' ? scenario.days : 0,
            repeat_every_days: scenario.repeatEveryDays,
            max_reminders: scenario.maxReminders,
            recipient_scope: scenario.recipientScope,
            sender_type: scenario.senderType,
            departments: scenario.departments,
          },
          template_subject: `${scenario.title}: {{document_number}}`,
          template_body: `{{document_number}} requires attention under the ${scenario.title.toLowerCase()} policy.`,
          is_active: scenario.enabled,
        };
        const saved = scenario.id
          ? await apiClient.put<any>(`/automation/rules/${scenario.id}`, rulePayload)
          : await apiClient.post<any>('/automation/rules', rulePayload);
        if (!scenario.id && saved?.id) updateScenario(scenario.code, { id: saved.id });
      }
      setMessage('Email configuration saved successfully.');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(error.message || 'Failed to save email configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center" style={{ color: '#8B6F47' }}>
        <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin" />
        Loading email configuration...
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-96px)] bg-[#F8F3EA] p-5">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-end md:justify-between" style={{ borderColor: '#E8DCC4' }}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#8B6F47' }}>Settings</p>
            <h1 className="text-2xl font-bold" style={{ color: '#3B2A1E' }}>Email Configuration</h1>
            <p className="mt-1 text-sm" style={{ color: '#6F4E37' }}>
              Maintain module-wise sender identities for sales, purchase, production, accounts, reminders and system emails.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingConnection || !canEditSettings || !emailStatus?.outboundEnabled}
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold disabled:opacity-50"
              style={{ borderColor: '#A7D7C5', color: '#047857', backgroundColor: '#F4FBF7' }}
            >
              <Send className="h-4 w-4" />
              {testingConnection ? 'Sending Test...' : 'Send Test Email'}
            </button>
            <button
              type="button"
              onClick={handleFillEmptyFromDefault}
              disabled={!canEditSettings}
              className="rounded-md border px-4 py-2 text-sm font-semibold disabled:opacity-50"
              style={{ borderColor: '#CDBA96', color: '#6F4E37', backgroundColor: '#FFFDF8' }}
            >
              Copy Default to Empty
            </button>
            <button
              type="submit"
              disabled={saving || !canEditSettings}
              className="inline-flex items-center gap-2 rounded-md px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: '#8B6F47' }}
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <SummaryTile label="Configured Senders" value={emailConfigs.length} />
          <SummaryTile label="Active Senders" value={activeCount} positive />
          <SummaryTile label="Unique Mailboxes" value={uniqueEmailCount} />
          <SummaryTile label="Fallback Sender" value={emailConfigs.find((item) => item.email_type === 'noreply')?.email_address || '-'} compact />
        </div>

        {message && (
          <div
            className="rounded-md border px-4 py-3 text-sm font-medium"
            style={{
              borderColor: message.includes('success') ? '#A7F3D0' : '#FECACA',
              backgroundColor: message.includes('success') ? '#ECFDF5' : '#FEF2F2',
              color: message.includes('success') ? '#047857' : '#B91C1C',
            }}
          >
            {message}
          </div>
        )}

        <div className="rounded-md border bg-white" style={{ borderColor: '#E8DCC4' }}>
          <div className="grid grid-cols-[170px_1fr_1fr_120px] gap-3 border-b px-4 py-3 text-xs font-bold uppercase" style={{ borderColor: '#E8DCC4', color: '#6F4E37', backgroundColor: '#F5EFE3' }}>
            <div>Function</div>
            <div>Sender Email</div>
            <div>Usage</div>
            <div className="text-center">Active</div>
          </div>
          <div className="divide-y" style={{ borderColor: '#E8DCC4' }}>
            {senderDefinitions.map((definition) => {
              const config = emailConfigs.find((item) => item.email_type === definition.type);
              const Icon = definition.icon;

              if (!config) return null;
              const selected = selectedUsages(definition, config);

              return (
                <div key={definition.type} className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-[170px_1fr_1fr_120px] xl:items-start">
                  <div className="flex items-start gap-3">
                    <div className="rounded-md border p-2" style={{ borderColor: '#E8DCC4', backgroundColor: '#FFFCF7', color: '#8B6F47' }}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold" style={{ color: '#3B2A1E' }}>{config.display_name || definition.title}</p>
                      <p className="text-xs uppercase" style={{ color: '#8B6F47' }}>{definition.module}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <input
                      type="email"
                      required
                      disabled={!canEditSettings}
                      value={config.email_address}
                      onChange={(event) => updateConfig(definition.type, { email_address: event.target.value })}
                      className={fieldClass}
                      style={{ borderColor: '#D8C8AA', color: '#3B2A1E' }}
                      placeholder={`${definition.type}@company.com`}
                    />
                    <input
                      type="text"
                      disabled={!canEditSettings}
                      value={config.display_name || ''}
                      onChange={(event) => updateConfig(definition.type, { display_name: event.target.value })}
                      className={fieldClass}
                      style={{ borderColor: '#D8C8AA', color: '#3B2A1E' }}
                      placeholder="Display name"
                    />
                  </div>

                  <div className="space-y-2">
                    <details className="group rounded-md border bg-white" style={{ borderColor: '#D8C8AA' }}>
                      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold" style={{ color: '#3B2A1E' }}>
                        <span>{selected.length ? `${selected.length} usage${selected.length === 1 ? '' : 's'} selected` : 'Select permitted usages'}</span>
                        <span aria-hidden="true" className="text-[#8B6F47] transition group-open:rotate-180">⌄</span>
                      </summary>
                      <div className="grid gap-2 border-t p-3 sm:grid-cols-2" style={{ borderColor: '#E8DCC4' }}>
                        {definition.usageOptions.map((option) => {
                          const checked = selected.includes(option);
                          return (
                            <label key={option} className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2 text-sm ${checked ? 'border-[#8B6F47] bg-[#F5EFE3]' : 'border-gray-200 bg-white'}`}>
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={!canEditSettings}
                                onChange={() => {
                                  const next = checked ? selected.filter((value) => value !== option) : [...selected, option];
                                  updateConfig(definition.type, { description: next.join(', ') });
                                }}
                                className="mt-0.5 h-4 w-4 accent-[#8B6F47]"
                              />
                              <span>{option}</span>
                            </label>
                          );
                        })}
                      </div>
                    </details>
                    <p className="text-xs" style={{ color: '#8B6F47' }}>Only the selected document and notification types may use this sender.</p>
                  </div>

                  <div className="flex xl:justify-center">
                    <button
                      type="button"
                      disabled={!canEditSettings}
                      onClick={() => updateConfig(definition.type, { is_active: config.is_active === false })}
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold disabled:opacity-50"
                      style={{
                        borderColor: config.is_active === false ? '#FECACA' : '#A7F3D0',
                        backgroundColor: config.is_active === false ? '#FEF2F2' : '#ECFDF5',
                        color: config.is_active === false ? '#B91C1C' : '#047857',
                      }}
                    >
                      {config.is_active === false ? <ToggleLeft className="h-5 w-5" /> : <ToggleRight className="h-5 w-5" />}
                      {config.is_active === false ? 'Off' : 'On'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <section className="space-y-4 rounded-md border bg-white p-4" style={{ borderColor: '#E8DCC4' }}>
          <div className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-center md:justify-between" style={{ borderColor: '#E8DCC4' }}>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#8B6F47' }}>Governed reminder delivery</p>
              <h2 className="text-xl font-bold" style={{ color: '#3B2A1E' }}>Email scenarios</h2>
              <p className="mt-1 text-sm" style={{ color: '#6F4E37' }}>Select what Mizantra should monitor, who receives it, when the first email is sent and how often it repeats.</p>
            </div>
            <div className={`rounded-md border px-3 py-2 text-sm font-semibold ${emailStatus?.outboundEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
              {emailTestResult?.success
                ? `Delivery verified via ${emailTestResult.transport}`
                : emailStatus?.outboundEnabled
                  ? 'Outbound email credentials configured'
                  : 'SMTP/Gmail delivery is not connected'}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {scenarios.map((scenario) => (
              <article key={scenario.code} className="rounded-md border p-4" style={{ borderColor: scenario.enabled ? '#A7D7C5' : '#E8DCC4', backgroundColor: scenario.enabled ? '#F4FBF7' : '#FFFDF8' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold" style={{ color: '#3B2A1E' }}>{scenario.title}</p>
                    <p className="mt-1 text-xs" style={{ color: '#6F4E37' }}>{scenario.description}</p>
                    <p className="mt-1 text-[11px] font-semibold uppercase" style={{ color: '#8B6F47' }}>{scenario.module} · {scenario.defaultScope} scenario</p>
                  </div>
                  <button type="button" disabled={!canEditSettings} onClick={() => updateScenario(scenario.code, { enabled: !scenario.enabled })} className="shrink-0 disabled:opacity-50" aria-label={`Toggle ${scenario.title}`}>
                    {scenario.enabled ? <ToggleRight className="h-7 w-7 text-emerald-700" /> : <ToggleLeft className="h-7 w-7 text-gray-400" />}
                  </button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold" style={{ color: '#6F4E37' }}>
                    <span className="mb-1 block">{scenario.timing === 'OVERDUE' ? 'Send first email after (days)' : 'Send before due/expiry (days)'}</span>
                    <input type="number" min="0" max="365" value={scenario.days} disabled={!canEditSettings} onChange={(event) => updateScenario(scenario.code, { days: Math.max(0, Number(event.target.value)) })} className={fieldClass} />
                  </label>
                  <label className="text-xs font-semibold" style={{ color: '#6F4E37' }}>
                    <span className="mb-1 block">Repeat every (days)</span>
                    <input type="number" min="1" max="365" value={scenario.repeatEveryDays} disabled={!canEditSettings} onChange={(event) => updateScenario(scenario.code, { repeatEveryDays: Math.max(1, Number(event.target.value)) })} className={fieldClass} />
                  </label>
                  <label className="text-xs font-semibold" style={{ color: '#6F4E37' }}>
                    <span className="mb-1 block">Maximum reminders</span>
                    <input type="number" min="1" max="100" value={scenario.maxReminders} disabled={!canEditSettings} onChange={(event) => updateScenario(scenario.code, { maxReminders: Math.max(1, Number(event.target.value)) })} className={fieldClass} />
                  </label>
                  <label className="text-xs font-semibold" style={{ color: '#6F4E37' }}>
                    <span className="mb-1 block">Recipients</span>
                    <select value={scenario.recipientScope} disabled={!canEditSettings} onChange={(event) => updateScenario(scenario.code, { recipientScope: event.target.value as ScenarioState['recipientScope'] })} className={fieldClass}>
                      <option value="INTERNAL">Internal only</option>
                      <option value="EXTERNAL">Customer/vendor only</option>
                      <option value="BOTH">Internal and external</option>
                    </select>
                  </label>
                  <label className="text-xs font-semibold" style={{ color: '#6F4E37' }}>
                    <span className="mb-1 block">Sender identity</span>
                    <select value={scenario.senderType} disabled={!canEditSettings} onChange={(event) => updateScenario(scenario.code, { senderType: event.target.value })} className={fieldClass}>
                      {senderDefinitions.map((definition) => <option key={definition.type} value={definition.type}>{definition.title}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-semibold sm:col-span-2" style={{ color: '#6F4E37' }}>
                    <span className="mb-1 block">Internal recipient email IDs</span>
                    <input type="text" value={scenario.recipientsText} disabled={!canEditSettings || scenario.recipientScope === 'EXTERNAL'} onChange={(event) => updateScenario(scenario.code, { recipientsText: event.target.value })} className={fieldClass} placeholder="purchase@company.com, manager@company.com" />
                  </label>
                </div>

                <div className="mt-3">
                  <p className="mb-2 text-xs font-semibold" style={{ color: '#6F4E37' }}>Departments using this policy</p>
                  <div className="flex flex-wrap gap-2">
                    {departments.map((department) => {
                      const checked = scenario.departments.includes(department);
                      return <label key={department} className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${checked ? 'border-[#8B6F47] bg-[#F5EFE3]' : 'border-gray-200 bg-white'}`}><input type="checkbox" checked={checked} disabled={!canEditSettings} onChange={() => updateScenario(scenario.code, { departments: checked ? scenario.departments.filter((value) => value !== department) : [...scenario.departments, department] })} />{department}</label>;
                    })}
                  </div>
                </div>
              </article>
            ))}
          </div>
          <p className="rounded-md bg-amber-50 p-3 text-xs text-amber-900">External reminders use the customer or vendor email stored on the source record. Internal reminders require the email IDs entered above. Preview the matching records in Automation before enabling high-volume rules.</p>
        </section>

        <div className="rounded-md border p-4" style={{ borderColor: '#E8DCC4', backgroundColor: '#FFFDF8' }}>
          <div className="mb-2 flex items-center gap-2 font-semibold" style={{ color: '#3B2A1E' }}>
            <CheckCircle2 className="h-5 w-5" style={{ color: '#047857' }} />
            How this works
          </div>
          <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3" style={{ color: '#6F4E37' }}>
            <p>Each module can send documents from its configured sender identity.</p>
            <p>If SMTP does not allow that address as From, the app uses the SMTP account as From and sets this mailbox as Reply-To.</p>
            <p>The No Reply sender remains the fallback for automated status messages and system alerts.</p>
          </div>
        </div>
      </form>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  positive,
  compact,
}: {
  label: string;
  value: string | number;
  positive?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="rounded-md border bg-white px-4 py-3" style={{ borderColor: '#E8DCC4' }}>
      <p className="text-xs font-bold uppercase" style={{ color: '#8B6F47' }}>{label}</p>
      <p className={`${compact ? 'truncate text-base' : 'text-2xl'} mt-1 font-bold`} style={{ color: positive ? '#047857' : '#3B2A1E' }}>
        {value}
      </p>
    </div>
  );
}
