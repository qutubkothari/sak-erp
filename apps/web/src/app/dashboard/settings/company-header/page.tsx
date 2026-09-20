import { redirect } from 'next/navigation';

export default function CompanyHeaderSettingsPage() {
  redirect('/dashboard/settings?tab=company');
}
