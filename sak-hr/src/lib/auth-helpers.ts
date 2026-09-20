import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export async function requireAuth() {
  const session = await auth();
  
  if (!session) {
    redirect('/auth/login');
  }
  
  return session;
}

export async function requireRole(allowedRoles: string[]) {
  const session = await requireAuth();
  
  if (!allowedRoles.includes(session.user.role)) {
    redirect('/dashboard');
  }
  
  return session;
}

export async function requireManager() {
  return requireRole(['admin', 'manager']);
}

export async function requireAdmin() {
  return requireRole(['admin']);
}
