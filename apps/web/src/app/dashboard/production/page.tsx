import { redirect } from 'next/navigation';

// Production Management (production orders) is no longer used.
// Keep this route only as a server redirect so old bookmarks don't break.
export default function ProductionPage() {
  redirect('/dashboard/production/job-orders/smart-items');
}
