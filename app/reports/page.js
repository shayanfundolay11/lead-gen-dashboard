'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { Download } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { exportToCsv } from '../../lib/exportCsv';
import { useOrgId } from '../../lib/useOrgId';

const COLORS = ['#ff6b45', '#5b57e0', '#1a9c76', '#e8a13a', '#e0495f', '#12172b'];

export default function Reports() {
  const orgId = useOrgId();
  const [leads, setLeads] = useState([]);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orgId) return;
    async function load() {
      const { data: leadData } = await supabase.from('leads').select('*').eq('organization_id', orgId);
      const { data: callData } = await supabase.from('calls').select('*').eq('organization_id', orgId);
      setLeads(leadData || []);
      setCalls(callData || []);
      setLoading(false);
    }
    load();
  }, [orgId]);

  if (loading) return <div className="page"><div className="empty">Loading...</div></div>;

  const bySource = groupCount(leads, 'source');
  const byPitch = groupCount(leads, 'pitch_type');
  const byOutcome = groupCount(calls, 'outcome');
  const byStatus = groupCount(calls, 'status');
  const totalCalled = calls.length;
  const positive = calls.filter(c => c.outcome === 'positive').length;
  const negative = calls.filter(c => c.outcome === 'negative' || c.outcome === 'not_interested').length;
  const callbacks = calls.filter(c => c.outcome === 'callback_requested').length;
  const proposalsRequested = calls.filter(c => c.proposal_requested).length;

  const funnel = [
    { name: 'Total leads', count: leads.length },
    { name: 'Contacted', count: leads.filter(l => ['contacted', 'meeting_fixed', 'closed'].includes(l.status)).length },
    { name: 'Meeting fixed', count: leads.filter(l => ['meeting_fixed', 'closed'].includes(l.status)).length },
    { name: 'Closed', count: leads.filter(l => l.status === 'closed').length },
  ];

  return (
    <div className="page">
      <h1>Reports</h1>
      <p className="sub">Overall performance across all sources and calls.</p>

      <button
        className="call-btn"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 22, background: 'var(--navy-950)' }}
        onClick={() => exportToCsv('call_report.csv', calls.map(c => ({
          lead_id: c.lead_id, status: c.status, outcome: c.outcome, proposal_requested: c.proposal_requested,
          called_at: c.called_at, scheduled_callback_at: c.scheduled_callback_at,
        })))}
      >
        <Download size={14} /> Export call report CSV
      </button>

      <div className="metrics">
        <div className="metric m-navy"><div className="label">Total leads</div><div className="value">{leads.length}</div></div>
        <div className="metric m-indigo"><div className="label">Calls made</div><div className="value">{totalCalled}</div></div>
        <div className="metric m-teal"><div className="label">Positive</div><div className="value">{positive}</div></div>
        <div className="metric m-rose"><div className="label">Negative</div><div className="value">{negative}</div></div>
        <div className="metric m-signal"><div className="label">Callback requested</div><div className="value">{callbacks}</div></div>
        <div className="metric m-amber"><div className="label">Proposals requested</div><div className="value">{proposalsRequested}</div></div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <ChartPanel title="Conversion funnel (New → Contacted → Meeting Fixed → Closed)" data={funnel} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ChartPanel title="Leads by source" data={bySource} />
        <ChartPanel title="Gap distribution (pitch type)" data={byPitch} />
        <ChartPanel title="Calls by outcome" data={byOutcome} />
        <ChartPanel title="Calls by status" data={byStatus} />
      </div>
    </div>
  );
}

function groupCount(items, field) {
  const counts = {};
  items.forEach(item => {
    const key = item[field] || 'Not set';
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

function ChartPanel({ title, data }) {
  return (
    <div className="panel">
      <h2 style={{ fontSize: 14, marginBottom: 14 }}>{title}</h2>
      {data.length === 0 ? (
        <div className="empty" style={{ padding: 20 }}>No data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(120, data.length * 42)}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eeece5" horizontal={false} />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#8a8a92' }} />
            <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 12, fill: '#14151a' }} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e6e4dc' }} />
            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
              {data.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}