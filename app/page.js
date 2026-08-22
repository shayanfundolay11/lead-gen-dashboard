'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Search as SearchIcon, PhoneCall, Download, UserPlus, MessageCircle, Clock } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { exportToCsv } from '../lib/exportCsv';
import { useOrgId } from '../lib/useOrgId';

const SOURCES = [
  { key: 'google', label: 'Google' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
];

const STATUS_LABELS = {
  new: 'New', contacted: 'Contacted', meeting_fixed: 'Meeting fixed', closed: 'Closed', not_interested: 'Not interested',
};

export default function Dashboard() {
  const orgId = useOrgId();
  const [activeSource, setActiveSource] = useState('google');
  const [counts, setCounts] = useState({});
  const [leads, setLeads] = useState([]);
  const [todayTasks, setTodayTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [callingId, setCallingId] = useState(null);

  const [search, setSearch] = useState('');
  const [pitchFilter, setPitchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  const loadCounts = useCallback(async () => {
    if (!orgId) return;
    const results = {};
    for (const s of SOURCES) {
      const { count } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('source', s.key).eq('organization_id', orgId);
      results[s.key] = count || 0;
    }
    setCounts(results);
  }, [orgId]);

  const loadLeads = useCallback(async (source) => {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('*, calls(status, outcome, called_at, scheduled_callback_at)')
      .eq('source', source)
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const withLatestCall = data.map(lead => {
        const sortedCalls = (lead.calls || []).sort((a, b) => new Date(b.called_at || 0) - new Date(a.called_at || 0));
        return { ...lead, latestCall: sortedCalls[0] || null };
      });
      setLeads(withLatestCall);
    }
    setLoading(false);
  }, [orgId]);

  const loadTodayTasks = useCallback(async () => {
    if (!orgId) return;
    const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
    const { data } = await supabase
      .from('leads')
      .select('*')
      .eq('organization_id', orgId)
      .not('next_action_at', 'is', null)
      .lte('next_action_at', endOfToday.toISOString())
      .order('next_action_at', { ascending: true });
    setTodayTasks(data || []);
  }, [orgId]);

  useEffect(() => { loadCounts(); loadTodayTasks(); }, [loadCounts, loadTodayTasks]);
  useEffect(() => { loadLeads(activeSource); }, [activeSource, loadLeads]);

  async function handleStatusChange(lead, newStatus) {
    await supabase.from('leads').update({ status: newStatus }).eq('id', lead.id);
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: newStatus } : l));
  }

  function whatsappLink(lead) {
    if (!lead.phone) return null;
    const digits = lead.phone.replace(/[^\d+]/g, '');
    const text = `Assalam-o-Alaikum, ${lead.business_name} se baat ho rahi hai? Main ek digital agency se contact kar raha hoon.`;
    return `https://wa.me/${digits.replace('+', '')}?text=${encodeURIComponent(text)}`;
  }

  function statusBadge(lead) {
    const call = lead.latestCall;
    if (!call) return <span className="badge b-pending">Not called</span>;
    if (call.status === 'calling') return <span className="badge b-calling">Calling...</span>;
    if (call.outcome === 'positive') return <span className="badge b-positive">Positive</span>;
    if (call.outcome === 'negative') return <span className="badge b-negative">Negative</span>;
    if (call.outcome === 'callback_requested') return <span className="badge b-callback">Callback requested</span>;
    return <span className="badge b-completed">Completed</span>;
  }

  function gapBadge(pitchType) {
    const cls = pitchType === 'Website pitch' ? 'b-signal-badge'
      : pitchType === 'SEO / reach pitch' ? 'b-amber-badge' : 'b-indigo-badge';
    return <span className={`badge ${cls}`}>{pitchType}</span>;
  }

  const pitchOptions = useMemo(() => [...new Set(leads.map(l => l.pitch_type).filter(Boolean))], [leads]);

  const filteredLeads = useMemo(() => {
    let result = leads.filter(l => {
      const matchesSearch = !search || l.business_name.toLowerCase().includes(search.toLowerCase());
      const matchesPitch = !pitchFilter || l.pitch_type === pitchFilter;
      const status = l.latestCall ? (l.latestCall.outcome || l.latestCall.status) : 'not_called';
      const matchesStatus = !statusFilter || status === statusFilter;
      return matchesSearch && matchesPitch && matchesStatus;
    });

    result.sort((a, b) => {
      let valA = a[sortBy], valB = b[sortBy];
      if (sortBy === 'created_at') { valA = new Date(valA); valB = new Date(valB); }
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [leads, search, pitchFilter, statusFilter, sortBy, sortDir]);

  function toggleSort(field) {
    if (sortBy === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('desc'); }
  }

  const totalLeads = Object.values(counts).reduce((a, b) => a + b, 0);
  const calledCount = leads.filter(l => l.latestCall).length;
  const positiveCount = leads.filter(l => l.latestCall?.outcome === 'positive').length;

  return (
    <div className="page">
      <h1>Lead generation dashboard</h1>
      <p className="sub">Live data from Supabase — updates automatically as the collector and call agent run.</p>

      <Link href="/find-leads" className="call-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 22, marginRight: 8, textDecoration: 'none' }}>
        <SearchIcon size={14} /> Find Leads
      </Link>
      <Link href="/add-lead" className="call-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 22, marginRight: 8, textDecoration: 'none', background: 'var(--indigo)' }}>
        <UserPlus size={14} /> Add Lead Manually
      </Link>
      <button
        className="call-btn"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 22, background: 'var(--navy-950)' }}
        onClick={() => exportToCsv(`leads_${activeSource}.csv`, filteredLeads.map(l => ({
          business_name: l.business_name, country: l.country, city: l.city, industry: l.keyword_matched,
          pitch_type: l.pitch_type, phone: l.phone, email: l.email, website: l.website, review_count: l.review_count,
          status: l.status, call_outcome: l.latestCall?.outcome || l.latestCall?.status || 'not_called',
        })))}
      >
        <Download size={14} /> Export CSV
      </button>

      <div className="metrics">
        <div className="metric m-navy"><div className="label">Total leads</div><div className="value">{totalLeads}</div></div>
        <div className="metric m-indigo"><div className="label">Called ({SOURCES.find(s => s.key === activeSource).label})</div><div className="value">{calledCount}</div></div>
        <div className="metric m-teal"><div className="label">Positive responses</div><div className="value">{positiveCount}</div></div>
      </div>

      {todayTasks.length > 0 && (
        <div className="panel" style={{ marginBottom: 22, borderColor: 'var(--signal)', background: 'var(--signal-dim)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontWeight: 600, fontSize: 13.5 }}>
            <Clock size={15} color="var(--signal)" /> Today's follow-ups ({todayTasks.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {todayTasks.map(t => (
              <Link key={t.id} href={`/leads/${t.id}`} style={{ fontSize: 13, color: 'var(--ink)', textDecoration: 'none', display: 'flex', justifyContent: 'space-between' }}>
                <span>{t.business_name}</span>
                <span className="mono" style={{ color: 'var(--ink-muted)' }}>{new Date(t.next_action_at).toLocaleString()}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="tabs">
        {SOURCES.map(s => (
          <button key={s.key} className={`tab ${activeSource === s.key ? 'active' : ''}`} onClick={() => setActiveSource(s.key)}>
            {s.label} <span className="count">({counts[s.key] ?? 0})</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text" placeholder="Search business name..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '7px 10px', border: '0.5px solid var(--border)', borderRadius: 6, fontSize: 13, minWidth: 200 }}
        />
        <select value={pitchFilter} onChange={e => setPitchFilter(e.target.value)} style={selectStyle}>
          <option value="">All pitch types</option>
          {pitchOptions.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="">All call outcomes</option>
          <option value="not_called">Not called</option>
          <option value="positive">Positive</option>
          <option value="negative">Negative</option>
          <option value="callback_requested">Callback requested</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {loading ? (
        <div className="empty">Loading...</div>
      ) : filteredLeads.length === 0 ? (
        <div className="empty">No leads match these filters.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th style={sortHeaderStyle} onClick={() => toggleSort('business_name')}>Business {sortBy === 'business_name' && (sortDir === 'asc' ? '↑' : '↓')}</th>
              <th style={sortHeaderStyle} onClick={() => toggleSort('country')}>Country / City {sortBy === 'country' && (sortDir === 'asc' ? '↑' : '↓')}</th>
              <th style={sortHeaderStyle} onClick={() => toggleSort('keyword_matched')}>Industry {sortBy === 'keyword_matched' && (sortDir === 'asc' ? '↑' : '↓')}</th>
              <th>Gap / Pitch</th>
              <th style={sortHeaderStyle} onClick={() => toggleSort('review_count')}>Reviews {sortBy === 'review_count' && (sortDir === 'asc' ? '↑' : '↓')}</th>
              <th>Lead status</th>
              <th>Call outcome</th>
              <th>Contact</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map(lead => (
              <tr key={lead.id}>
                <td><Link href={`/leads/${lead.id}`} style={{ color: 'var(--ink)', fontWeight: 500, textDecoration: 'none' }}>{lead.business_name}</Link></td>
                <td>{lead.city ? `${lead.city}, ` : ''}{lead.country}</td>
                <td>{lead.keyword_matched}</td>
                <td>{gapBadge(lead.pitch_type)}</td>
                <td className="mono">{lead.review_count ?? '-'}</td>
                <td>
                  <select
                    value={lead.status || 'new'}
                    onChange={e => handleStatusChange(lead, e.target.value)}
                    style={{ ...selectStyle, padding: '4px 6px', fontSize: 12 }}
                  >
                    {Object.entries(STATUS_LABELS).map(([val, label]) => <option key={val} value={val}>{label}</option>)}
                  </select>
                </td>
                <td>{statusBadge(lead)}</td>
                <td className="mono">{lead.phone || '-'}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <a className="call-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', textDecoration: 'none', opacity: lead.phone ? 1 : 0.5, pointerEvents: lead.phone ? 'auto' : 'none' }} href={`tel:${lead.phone}`}>
                      <PhoneCall size={12} /> Call
                    </a>
                    {whatsappLink(lead) && (
                      <a href={whatsappLink(lead)} target="_blank" rel="noreferrer" className="call-btn" style={{ background: '#25D366', display: 'inline-flex', alignItems: 'center', padding: '6px 10px', textDecoration: 'none' }}>
                        <MessageCircle size={12} />
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const selectStyle = { padding: '7px 10px', border: '0.5px solid var(--border)', borderRadius: 6, fontSize: 13, background: 'white' };
const sortHeaderStyle = { cursor: 'pointer', userSelect: 'none' };