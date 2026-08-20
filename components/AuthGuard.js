'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../lib/supabaseClient';

const PUBLIC_PATHS = ['/login', '/signup'];

export default function AuthGuard({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const isPublic = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (!session && !isPublic) {
        router.replace('/login');
      } else {
        setChecked(true);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session && !isPublic) router.replace('/login');
    });

    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, [pathname, isPublic, router]);

  if (isPublic) return children;
  if (!checked) return <div style={{ padding: 40, fontSize: 13, color: 'var(--ink-muted)' }}>Loading...</div>;
  return children;
}