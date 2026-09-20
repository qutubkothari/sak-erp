import { redirect } from 'next/navigation';

export default function EmailConfigurationPage() {
  redirect('/dashboard/settings?tab=email');
}
