'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../../../lib/api-client';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (newPassword.length < 10) return setError('Use at least 10 characters for your new password.');
    if (newPassword !== confirmation) return setError('The new passwords do not match.');
    setBusy(true);
    try {
      await apiClient.post('/auth/change-password', { oldPassword, newPassword });
      const user = await apiClient.get<any>('/auth/me');
      if (typeof window !== 'undefined') localStorage.setItem('user', JSON.stringify(user));
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Unable to change password. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8">
    <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
      <header><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Account security</p><h1 className="mt-2 text-2xl font-bold text-slate-900">Change your password</h1><p className="mt-2 text-sm leading-6 text-slate-600">Choose a personal password to finish signing in. Your account remains limited until this step is complete.</p></header>
      <label className="block space-y-1 text-sm font-medium">Temporary password<input autoComplete="current-password" required type="password" value={oldPassword} onChange={event => setOldPassword(event.target.value)} className="w-full rounded-lg border px-3 py-2.5" /></label>
      <label className="block space-y-1 text-sm font-medium">New password<input autoComplete="new-password" required minLength={10} type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} className="w-full rounded-lg border px-3 py-2.5" /></label>
      <label className="block space-y-1 text-sm font-medium">Confirm new password<input autoComplete="new-password" required minLength={10} type="password" value={confirmation} onChange={event => setConfirmation(event.target.value)} className="w-full rounded-lg border px-3 py-2.5" /></label>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-60">{busy ? 'Updating…' : 'Update password'}</button>
    </form>
  </main>;
}
