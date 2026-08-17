'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

const INTEGRATIONS = [
  {
    key: 'google_places', name: 'Google Places / Geocoding / PageSpeed',
    desc: 'Powers Find Leads, city/area autocomplete, and SEO audit.',
    configureUrl: 'https://console.cloud.google.com/apis/credentials',
    envVar: 'GOOGLE_API_KEY',
  },
  {
    key: 'supabase', name: 'Supabase database',
    desc: 'Stores all leads, calls, and templates.',
    configureUrl: 'https://supabase.com/dashboard',
    envVar: 'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY',
  },
  {
    key: 'anthropic', name: 'Anthropic (Claude)',
    desc: 'Generates new pitch template variations on the Templates page.',
    configureUrl: 'https://console.anthropic.com',
    envVar: 'ANTHROPIC_API_KEY',
  },
  {
    key: 'twilio', name: 'Twilio',
    desc: 'Places the actual outbound AI phone calls.',
    configureUrl: 'https://console.twilio.com',
    envVar: 'TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER',
  },
  {
    key: 'voice_agent', name: 'Voice agent server (Render)',
    desc: 'Handles the live AI conversation during calls.',
    configureUrl: 'https://dashboard.render.com',
    envVar: 'VOICE_AGENT_BASE_URL',
  },
];

export default function Settings() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch('/api/settings-status').then(r => r.json()).then(setStatus);
  }, []);

  return (
    <div className="page">
      <h1>Settings</h1>
      <p className="sub">Integration status. Actual API keys are configured in Vercel's Environment Variables — not editable here, for security.</p>

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
        To change a value: go to Vercel &rarr; your project &rarr; Settings &rarr; Environment Variables, update it there, then redeploy.
      </p>
    </div>
  );
}