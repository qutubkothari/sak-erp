'use client';

import { useState } from 'react';
import { Users, Shield, Building2, Bell, Database, Mail } from 'lucide-react';
import UserManagement from './components/UserManagement';
import RoleManagement from './components/RoleManagement';
import CompanySettings from './components/CompanySettings';
import EmailSettings from './components/EmailSettings';

type TabType = 'users' | 'roles' | 'company' | 'email' | 'notifications' | 'integrations';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('users');

  const tabs = [
    { id: 'users' as TabType, label: 'User Management', icon: Users },
    { id: 'roles' as TabType, label: 'Roles & Permissions', icon: Shield },
    { id: 'company' as TabType, label: 'Company Settings', icon: Building2 },
    { id: 'email' as TabType, label: 'Email Configuration', icon: Mail },
    { id: 'notifications' as TabType, label: 'Notifications', icon: Bell },
    { id: 'integrations' as TabType, label: 'Integrations', icon: Database },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold" style={{ color: '#6F4E37' }}>
          Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: '#8B6F47' }}>
          Manage your company settings, users, and permissions
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b" style={{ borderColor: '#E8DCC4' }}>
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  isActive
                    ? 'border-[#8B6F47] text-[#6F4E37] font-semibold'
                    : 'border-transparent text-[#8B6F47] hover:text-[#6F4E37] hover:border-[#E8DCC4]'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'roles' && <RoleManagement />}
        {activeTab === 'company' && <CompanySettings />}
        {activeTab === 'email' && <EmailSettings />}
        {activeTab === 'notifications' && (
          <div className="text-center py-12" style={{ color: '#8B6F47' }}>
            <Bell className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Notification settings coming soon</p>
          </div>
        )}
        {activeTab === 'integrations' && (
          <div className="text-center py-12" style={{ color: '#8B6F47' }}>
            <Database className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Integration settings coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}
