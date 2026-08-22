'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useOrgId } from '../../lib/useOrgId';

const VIEWS = ['month', 'week', 'day'];
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function startOfWeek(d) {
  const copy = new Date(d);
  copy.setDate(copy.getDate() - copy.getDay());
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export default function Calendar() {
  const orgId = useOrgId();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('month');
  const [anchor, setAnchor] = useState(new Date());

  useEffect(() => {
    if (!orgId) return;
    async function load() {
      const { data } = await supabase.from('leads').select('*').eq('organization_id', orgId).not('next_action_at', 'is', null);
      setLeads(data || []);
      setLoading(false);
    }
    load();
  }, [orgId]);

  function tasksOn(date) {
    return leads.filter(l => sameDay(new Date(l.next_action_at), date))
      .sort((a, b) => new Date(a.next_action_at) - new Date(b.next_action_at));
  }

  function navigate(dir) {
    const copy = new Date(anchor);
    if (view === 'month') copy.setMonth(copy.getMonth() + dir);
    else if (view === 'week') copy.setDate(copy.getDate() + dir * 7);
    else copy.setDate(copy.getDate() + dir);
    setAnchor(copy);
  }

  const monthGrid = useMemo(() => {
    const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const gridStart = startOfWeek(firstOfMonth);
    const days = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      days.push(d);
    }
    return days;
  }, [anchor]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [anchor]);

  const headerLabel = view === 'month'
    ? anchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : view === 'week'
    ? `${weekDays[0].toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
    : anchor.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const today = new Date();

  if (loading) return <div className="page"><div className="empty">Loading...</div></div>;

  return (
    <div className="page">
      <h1>Follow-up calendar</h1>
      <p className="sub">Every lead with a scheduled follow-up (set on the lead detail page) shows up here.</p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => navigate(-1)} className="call-btn" style={{ background: 'var(--navy-950)', padding: '6px 10px' }}><ChevronLeft size={14} /></button>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, minWidth: 180, textAlign: 'center' }}>{headerLabel}</span>
          <button onClick={() => navigate(1)} className="call-btn" style={{ background: 'var(--navy-950)', padding: '6px 10px' }}><ChevronRight size={14} /></button>
          <button onClick={() => setAnchor(new Date())} className="call-btn" style={{ background: 'var(--indigo)', fontSize: 12 }}>Today</button>
        </div>
        <div className="tabs" style={{ marginBottom: 0 }}>
          {VIEWS.map(v => (
            <button key={v} className={`tab ${view === v ? 'active' : ''}`} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>
          ))}
        </div>
      </div>

      {view === 'month' && (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#fbfaf7' }}>
            {WEEKDAY_LABELS.map(w => (
              <div key={w} style={{ padding: '8px 10px', fontSize: 11, fontWeight: 600, color: 'var(--ink-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{w}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {monthGrid.map((d, i) => {
              const inMonth = d.getMonth() === anchor.getMonth();
              const isToday = sameDay(d, today);
              const dayTasks = tasksOn(d);
              return (
                <div
                  key={i}
                  onClick={() => { setAnchor(d); setView('day'); }}
                  style={{
                    minHeight: 84, padding: 8, borderRight: (i + 1) % 7 !== 0 ? '1px solid var(--border)' : 'none',
                    borderBottom: '1px solid var(--border)', cursor: 'pointer', opacity: inMonth ? 1 : 0.35,
                    background: isToday ? 'var(--signal-dim)' : 'white',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 500, marginBottom: 4 }}>{d.getDate()}</div>
                  {dayTasks.slice(0, 2).map(t => (
                    <div key={t.id} style={{ fontSize: 10.5, background: 'var(--indigo-dim)', color: 'var(--indigo)', borderRadius: 4, padding: '2px 4px', marginBottom: 2, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {t.business_name}
                    </div>
                  ))}
                  {dayTasks.length > 2 && <div style={{ fontSize: 10, color: 'var(--ink-muted)' }}>+{dayTasks.length - 2} more</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'week' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 10 }}>
          {weekDays.map(d => {
            const dayTasks = tasksOn(d);
            const isToday = sameDay(d, today);
            return (
              <div key={d.toISOString()} className="panel" style={{ background: isToday ? 'var(--signal-dim)' : 'white', minHeight: 160 }}>
                <div style={{ fontSize: 11, color: 'var(--ink-muted)', fontWeight: 600, marginBottom: 6 }}>{WEEKDAY_LABELS[d.getDay()]} {d.getDate()}</div>
                {dayTasks.length === 0 ? (
                  <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>—</div>
                ) : dayTasks.map(t => (
                  <Link key={t.id} href={`/leads/${t.id}`} style={{ display: 'block', fontSize: 11.5, marginBottom: 6, color: 'var(--ink)', textDecoration: 'none' }}>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--indigo)' }}>{new Date(t.next_action_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</div>
                    <div style={{ fontWeight: 500 }}>{t.business_name}</div>
                  </Link>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {view === 'day' && (
        <div>
          {tasksOn(anchor).length === 0 ? (
            <div className="empty">No follow-ups scheduled for this day.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tasksOn(anchor).map(t => (
                <Link key={t.id} href={`/leads/${t.id}`} className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', textDecoration: 'none', color: 'var(--ink)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{t.business_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-secondary)' }}>{t.keyword_matched} &middot; {t.city}, {t.country}</div>
                  </div>
                  <div className="mono" style={{ fontSize: 13, color: 'var(--indigo)', fontWeight: 600 }}>
                    {new Date(t.next_action_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}