'use client';

import { useState, useEffect } from 'react';
import { Mail, Save, RefreshCw } from 'lucide-react';
import { apiClient } from '../../../../../lib/api-client';

interface EmailConfig {
  id?: number;
  email_type: string;
  email_address: string;
  display_name?: string;
  description?: string;
  is_active?: boolean;
}

const emailTypeLabels: Record<string, { name: string; description: string; icon: string }> = {
  admin: {
    name: 'System Administrator',
    description: 'System notifications, critical alerts, and administrative messages',
    icon: '🔧',
  },
  sales: {
    name: 'Sales Department',
    description: 'Quotations, sales orders, and customer communications',
    icon: '💼',
  },
  support: {
    name: 'Customer Support',
    description: 'Customer support requests, service tickets, and inquiries',
    icon: '💬',
  },
  technical: {
    name: 'Technical Team',
    description: 'Technical inquiries, engineering questions, and product specifications',
    icon: '⚙️',
  },
  purchase: {
    name: 'Purchase Department',
    description: 'Purchase orders, vendor communications, and procurement',
    icon: '🛒',
  },
  hr: {
    name: 'Human Resources',
    description: 'Employee matters, payroll, leaves, and HR communications',
    icon: '👥',
  },
  noreply: {
    name: 'No Reply',
    description: 'Automated system notifications (do not reply)',
    icon: '🔔',
  },
};

export default function EmailSettings() {
  const [emailConfigs, setEmailConfigs] = useState<EmailConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchEmailConfig();
  }, []);

  const fetchEmailConfig = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<EmailConfig[]>('/emails/config');
      setEmailConfigs(data);
    } catch (error) {
      console.error('Failed to fetch email config:', error);
      setMessage('Failed to load email configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailChange = (emailType: string, newEmail: string) => {
    setEmailConfigs(
      emailConfigs.map((config) =>
        config.email_type === emailType
          ? { ...config, email_address: newEmail }
          : config
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const payload = emailConfigs.map((config) => ({
        email_type: config.email_type,
        email_address: config.email_address,
      }));

      await apiClient.put('/emails/config', payload);
      setMessage('Email configuration saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error: any) {
      setMessage(error.message || 'Failed to save email configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyToAll = () => {
    if (emailConfigs.length === 0) return;
    const firstEmail = emailConfigs[0].email_address;
    
    if (confirm(`Set all email addresses to: ${firstEmail}?`)) {
      setEmailConfigs(
        emailConfigs.map((config) => ({
          ...config,
          email_address: firstEmail,
        }))
      );
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12" style={{ color: '#8B6F47' }}>
        <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin" />
        Loading email configuration...
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="bg-white rounded-lg border-2 p-6" style={{ borderColor: '#E8DCC4' }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#E8DCC4' }}>
              <Mail className="w-6 h-6" style={{ color: '#8B6F47' }} />
            </div>
            <div>
              <h2 className="text-xl font-semibold" style={{ color: '#6F4E37' }}>
                Email Configuration
              </h2>
              <p className="text-sm" style={{ color: '#8B6F47' }}>
                Manage email addresses for different departments and functions
              </p>
            </div>
          </div>
          
          {emailConfigs.length > 1 && (
            <button
              type="button"
              onClick={handleApplyToAll}
              className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
              style={{ backgroundColor: '#E8DCC4', color: '#6F4E37' }}
            >
              Use First Email for All
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {emailConfigs.map((config) => {
            const label = emailTypeLabels[config.email_type] || {
              name: config.display_name || config.email_type,
              description: config.description || '',
              icon: '📧',
            };

            return (
              <div
                key={config.email_type}
                className="p-4 rounded-lg border-2 hover:border-opacity-80 transition-colors"
                style={{ borderColor: '#E8DCC4' }}
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl flex-shrink-0">{label.icon}</div>
                  <div className="flex-1">
                    <label
                      className="block text-sm font-semibold mb-1"
                      style={{ color: '#6F4E37' }}
                    >
                      {label.name}
                    </label>
                    <p className="text-xs mb-3" style={{ color: '#8B6F47' }}>
                      {label.description}
                    </p>
                    <input
                      type="email"
                      required
                      value={config.email_address}
                      onChange={(e) => handleEmailChange(config.email_type, e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border-2 focus:outline-none focus:border-opacity-80"
                      style={{ borderColor: '#E8DCC4', color: '#6F4E37' }}
                      placeholder={`${label.name.toLowerCase()}@company.com`}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {message && (
            <div
              className={`p-3 rounded-lg text-sm ${
                message.includes('success')
                  ? 'bg-green-50 text-green-600'
                  : 'bg-red-50 text-red-600'
              }`}
            >
              {message}
            </div>
          )}

          <div className="flex justify-between items-center pt-4">
            <p className="text-xs" style={{ color: '#8B6F47' }}>
              💡 Tip: You can use the same email for multiple departments or assign unique emails for better organization
            </p>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 rounded-lg text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#8B6F47' }}
            >
              <Save className="w-5 h-5" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Info Box */}
      <div
        className="mt-4 p-4 rounded-lg border-2"
        style={{ borderColor: '#E8DCC4', backgroundColor: '#FEF9F0' }}
      >
        <h3 className="font-semibold mb-2" style={{ color: '#6F4E37' }}>
          📖 How It Works
        </h3>
        <ul className="text-sm space-y-1" style={{ color: '#8B6F47' }}>
          <li>• <strong>Sales emails</strong> are used for quotations, sales orders, and customer communications</li>
          <li>• <strong>Purchase emails</strong> are used for POs, vendor communication, and procurement</li>
          <li>• <strong>Support emails</strong> appear in service tickets and customer inquiries</li>
          <li>• <strong>HR emails</strong> are used for employee notifications and payroll</li>
          <li>• <strong>No-Reply</strong> is used for automated notifications users should not reply to</li>
          <li>• Changes take effect immediately across the entire system</li>
        </ul>
      </div>
    </div>
  );
}
