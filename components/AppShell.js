'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import AuthGuard from './AuthGuard';

const PUBLIC_PATHS = ['/login', '/signup'];

export default function AppShell({ children }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.includes(pathname);

  return (
    <AuthGuard>
      {isPublic ? (
        children
      ) : (
        <div className="app-shell">
          <Sidebar />
          <div className="main">{children}</div>
        </div>
      )}
    </AuthGuard>
  );
}