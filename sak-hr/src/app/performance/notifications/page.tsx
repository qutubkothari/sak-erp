'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Bell, Check, CheckCheck, RefreshCw, Trash2 } from 'lucide-react';
import type { Notification } from '@/types/notification';

export default function NotificationsPage() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'READ'>('ALL');
  const [search, setSearch] = useState('');

  const userId = session?.user?.id;

  const fetchNotifications = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/notifications?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [userId]);

  const markAsRead = async (notificationId: string) => {
    const response = await fetch(`/api/notifications/${notificationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true }),
    });

    if (response.ok) {
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)));
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (!unreadIds.length) return;

    const response = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationIds: unreadIds, markAsRead: true }),
    });

    if (response.ok) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const deleteNotification = async (notificationId: string) => {
    const response = await fetch(`/api/notifications/${notificationId}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    }
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return notifications.filter((notification) => {
      if (filter === 'UNREAD' && notification.read) return false;
      if (filter === 'READ' && !notification.read) return false;
      if (!term) return true;
      return (
        notification.title.toLowerCase().includes(term) ||
        notification.message.toLowerCase().includes(term)
      );
    });
  }, [filter, notifications, search]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-[#F7F4EF] text-[#1F2933]">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#8B6F47]">Notifications</p>
            <h1 className="mt-3 text-3xl font-bold text-[#36454F]">Inbox</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={fetchNotifications}
              className="inline-flex items-center gap-2 rounded-lg border border-[#D9CBB6] px-3 py-2 text-xs font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="inline-flex items-center gap-2 rounded-lg border border-[#D9CBB6] px-3 py-2 text-xs font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
              >
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </button>
            )}
            <Link
              href="/performance"
              className="inline-flex items-center gap-2 rounded-lg border border-[#D9CBB6] px-3 py-2 text-xs font-semibold text-[#6F4E37] hover:bg-[#F4ECE2]"
            >
              Back to Performance
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-3 rounded-2xl border border-[#E8DCC4] bg-white p-4 shadow-sm md:grid-cols-3">
          <input
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            placeholder="Search notifications"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="rounded border border-[#E8DCC4] px-3 py-2 text-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
          >
            <option value="ALL">All</option>
            <option value="UNREAD">Unread</option>
            <option value="READ">Read</option>
          </select>
          <div className="flex items-center justify-end text-xs text-[#6F4E37]">
            {unreadCount} unread
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {loading ? (
            <div className="rounded-2xl border border-[#E8DCC4] bg-white p-6 text-center text-sm text-[#9C8162]">
              Loading notifications...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-[#E8DCC4] bg-white p-8 text-center text-sm text-[#9C8162]">
              <Bell className="mx-auto mb-2 h-10 w-10 opacity-40" />
              No notifications found.
            </div>
          ) : (
            filtered.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-xl border border-[#E8DCC4] bg-white p-4 shadow-sm ${
                  !notification.read ? 'bg-[#FEF3C7] bg-opacity-30' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#36454F]">{notification.title}</p>
                    <p className="mt-1 text-sm text-[#6F4E37]">{notification.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteNotification(notification.id)}
                    className="text-[#9C8162] hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#9C8162]">
                  <span>{new Date(notification.createdAt).toLocaleString('en-GB')}</span>
                  <div className="flex items-center gap-3">
                    {!notification.read && (
                      <button
                        type="button"
                        onClick={() => markAsRead(notification.id)}
                        className="inline-flex items-center gap-1 text-xs text-[#6F4E37] hover:underline"
                      >
                        <Check className="h-3 w-3" />
                        Mark read
                      </button>
                    )}
                    {notification.actionUrl && (
                      <Link
                        href={notification.actionUrl}
                        className="text-xs font-semibold text-[#6F4E37] hover:underline"
                        onClick={() => markAsRead(notification.id)}
                      >
                        View →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
