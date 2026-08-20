'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { LayoutGrid, Search, BarChart3, PhoneCall, UserPlus, FileText, Settings, CalendarDays, ShieldCheck, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const LINKS = [
  { href: '/', label: 'Dashboard', icon: LayoutGrid },
  { href: '/find-leads', label: 'Find Leads', icon: Search },
  { href: '/add-lead', label: 'Add Lead Manually', icon: UserPlus },
  { href: '/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/templates', label: 'Templates', icon: FileText },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*, organizations(*)').eq('id', user.id).single();
      setProfile(data);
    }
    load();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const links = profile?.role === 'super_admin' ? [...LINKS, { href: '/admin', label: 'Admin', icon: ShieldCheck }] : LINKS;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="mark"><PhoneCall size={18} color="#ff6b45" /> Lead Gen</div>
        <div className="tag">{profile?.organizations?.name || 'agency ops console'}</div>
      </div>
      <nav className="sidebar-nav">
        {links.map(l => {
          const Icon = l.icon;
          const active = pathname === l.href;
          return (
            <Link key={l.href} href={l.href} className={`sidebar-link ${active ? 'active' : ''}`}>
              <Icon size={16} />
              {l.label}
              {active && <span className="pulse-dot" style={{ marginLeft: 'auto' }} />}
            </Link>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        {profile?.organizations?.plan && (
          <div style={{ marginBottom: 8, textTransform: 'capitalize' }}>{profile.organizations.plan} plan</div>
        )}
        <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#6b6f8f', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 11, padding: 0 }}>
          <LogOut size={12} /> Log out
        </button>
      </div>
    </aside>
  );
}