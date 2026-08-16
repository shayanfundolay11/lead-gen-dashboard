'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Search, BarChart3, PhoneCall, UserPlus } from 'lucide-react';

const LINKS = [
  { href: '/', label: 'Dashboard', icon: LayoutGrid },
  { href: '/find-leads', label: 'Find Leads', icon: Search },
  { href: '/add-lead', label: 'Add Lead Manually', icon: UserPlus },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="mark"><PhoneCall size={18} color="#ff6b45" /> Lead Gen</div>
        <div className="tag">agency ops console</div>
      </div>
      <nav className="sidebar-nav">
        {LINKS.map(l => {
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
      <div className="sidebar-footer">v1 &middot; live data</div>
    </aside>
  );
}
