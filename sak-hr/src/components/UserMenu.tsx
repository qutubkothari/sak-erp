'use client';

import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LogOut, User, ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export default function UserMenu() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-[#6F4E37]">
        Loading...
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/auth/login');
    router.refresh();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'employee':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#F4ECE2] transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6F4E37] to-[#4A3525] flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="text-left hidden sm:block">
            <div className="text-sm font-medium text-[#36454F]">
              {session.user.name || session.user.email}
            </div>
            <div className="text-xs text-[#6F4E37]">
              {session.user.jobRole || 'Employee'}
            </div>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[#6F4E37] transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-[#E8DCC4] z-50">
          <div className="p-4 border-b border-[#E8DCC4]">
            <div className="text-sm font-medium text-[#36454F] mb-1">
              {session.user.name || session.user.email}
            </div>
            <div className="text-xs text-[#6F4E37] mb-2">
              {session.user.email}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(
                  session.user.role
                )}`}
              >
                {session.user.role.charAt(0).toUpperCase() + session.user.role.slice(1)}
              </span>
              {session.user.department && (
                <span className="text-xs text-[#6F4E37]">
                  {session.user.department}
                </span>
              )}
            </div>
          </div>

          <div className="p-2">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
