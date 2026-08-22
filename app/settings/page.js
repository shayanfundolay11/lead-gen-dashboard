'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { PLAN_LIMITS } from '../../lib/planLimits';

const INTEGRATIONS = [
  {
    key: 'google_places', name: 'Google Places / Geocoding / PageSpeed',
    desc: 'Powers Find Leads (Google Maps), city/area autocomplete, and SEO audit.',
    configureUrl: 'https://console.cloud.google.com/apis/credentials',
    envVar: 'GOOGLE_API_KEY',
  },
  {
    key: 'custom_search', name: 'Google Custom Search (social leads)',
    desc: 'Finds LinkedIn/Facebook/Instagram/TikTok leads via public indexed profiles.',
    configureUrl: 'https://programmablesearchengine.google.com',
    envVar: 'GOOGLE_CSE_ID',
  },
  {
    key: 'supabase', name: 'Supabase database',
    desc: 'Stores all leads, calls, and templates.',
    configureUrl: 'https://supabase.com/dashboard',
    envVar: 'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY',
  },
];

export default function Settings() {
  const [status, setStatus] = useState(null);
  const [org, setOrg] = useState(null);
  const [requestedPlan, setRequestedPlan] = useState('basic');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    fetch('/api/settings-status').then(r => r.json()).then(setStatus);
    async function loadOrg() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('*, organizations(*)').eq('id', user.id).single();
      setOrg(data?.organizations || null);
    }
    loadOrg();
  }, []);

  async function handleRequestUpgrade() {
    setSending(true);
    await supabase.from('upgrade_requests').insert({
      organization_id: org.id,
      requested_plan: requestedPlan,
      message: message || null,
    });
    setSending(false);
    setSent(true);
  }

  return (
    <div className="page">
      <h1>Settings</h1>

      {org && (
        <>
          <h2 style={{ fontSize: 15, marginBottom: 10 }}>Your plan</h2>
          <div className="panel" style={{ maxWidth: 480, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, textTransform: 'capitalize' }}>{PLAN_LIMITS[org.plan]?.label || org.plan}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>
                  {PLAN_LIMITS[org.plan]?.leadsPerSearch} leads/search &middot; {PLAN_LIMITS[org.plan]?.searchesPerDay ?? 'unlimited'} searches/day
                </div>
              </div>
              {org.plan === 'demo' && org.demo_expires_at && (
                <div style={{ fontSize: 11.5, color: 'var(--rose)' }}>Expires {new Date(org.demo_expires_at).toLocaleDateString()}</div>
              )}
            </div>

            {sent ? (
              <p style={{ fontSize: 12.5, color: 'var(--teal)' }}>Upgrade request sent. We'll be in touch to arrange payment and activate your new plan.</p>
            ) : (
              <>
                <label style={{ display: 'block', fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4, marginTop: 10 }}>Request a different plan</label>
                <select value={requestedPlan} onChange={e => setRequestedPlan(e.target.value)} style={fieldStyle}>
                  {Object.entries(PLAN_LIMITS).filter(([key]) => key !== 'demo').map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
                </select>
                <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Anything you'd like us to know (optional)" rows={2} style={{ ...fieldStyle, marginTop: 8, resize: 'vertical' }} />
                <button className="call-btn" style={{ marginTop: 10 }} onClick={handleRequestUpgrade} disabled={sending}>
                  {sending ? 'Sending...' : 'Request upgrade'}
                </button>
              </>
            )}
          </div>
        </>
      )}

      <h2 style={{ fontSize: 15, marginBottom: 10 }}>Integrations</h2>
      <p className="sub">API keys are configured in Vercel's Environment Variables — not editable here, for security.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 640 }}>
        {INTEGRATIONS.map(item => {
          const ok = status?.[item.key];
          return (
            <div key={item.key} className="panel" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {status === null ? (
                <div style={{ width: 20 }} />
              ) : ok ? (
                <CheckCircle2 size={20} color="var(--teal)" style={{ flexShrink: 0, marginTop: 2 }} />
              ) : (
                <XCircle size={20} color="var(--rose)" style={{ flexShrink: 0, marginTop: 2 }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{item.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-secondary)', marginBottom: 4 }}>{item.desc}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-muted)' }}>{item.envVar}</div>
              </div>
              <a href={item.configureUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--indigo)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                Configure <ExternalLink size={12} />
              </a>
            </div>
          );
        })}
      </div>

      <p className="sub" style={{ marginTop: 20 }}>
        Calling is done manually (tap "Call now" on a lead to dial from your own phone) — no calling provider is configured.
      </p>
    </div>
  );
}

const fieldStyle = { width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' };