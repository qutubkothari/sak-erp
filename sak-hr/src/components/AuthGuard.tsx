'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: string | string[];
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/login');
      return;
    }

    if (requiredRole) {
      const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
      if (!roles.includes(session.user.role)) {
        router.push('/performance');
      }
    }
  }, [session, status, router, requiredRole]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F4EF]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-[#6F4E37] border-t-transparent"></div>
          <p className="mt-4 text-[#36454F]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!roles.includes(session.user.role)) {
      return null;
    }
  }

  return <>{children}</>;
}

export function UserMenu() {
  const { data: session } = useSession();
  const router = useRouter();

  if (!session) return null;

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/auth/login');
  };

  return (
    <div className="flex items-center gap-4">
      <div className="text-right">
        <p className="text-sm font-medium text-[#36454F]">
          {session.user.name || session.user.email}
        </p>
        <p className="text-xs text-[#6F4E37] capitalize">
          {session.user.role}
        </p>
      </div>
      <button
        onClick={handleSignOut}
        className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-[#6F4E37] to-[#4A3525] rounded-lg
          hover:from-[#5A3E2F] hover:to-[#3A2515] 
          focus:outline-none focus:ring-2 focus:ring-[#6F4E37] focus:ring-offset-2
          transition-all duration-200"
      >
        Sign Out
      </button>
    </div>
  );
}
