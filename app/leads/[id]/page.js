'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import { generatePitchScript } from '../../../lib/generatePitch';

export default function LeadDetail() {
  const { id } = useParams();
  const [lead, setLead] = useState(null);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);

  const [logStatus, setLogStatus] = useState('completed');
  const [logOutcome, setLogOutcome] = useState('positive');
  const [logNotes, setLogNotes] = useState('');
  const [logProposal, setLogProposal] = useState(false);
  const [logCallbackDate, setLogCallbackDate] = useState('');
  const [saving, setSaving] = useState(false);

  async function loadCalls() {
    const { data: callData } = await supabase.from('calls').select('*').eq('lead_id', id).order('created_at', { ascending: false });
    setCalls(callData || []);
  }

  useEffect(() => {
    async function load() {
      const { data: leadData } = await supabase.from('leads').select('*').eq('id', id).single();
      setLead(leadData);
      await loadCalls();
      setLoading(false);
    }
    if (id) load();
  }, [id]);

  async function handleLogCall() {
    setSaving(true);
    const { error } = await supabase.from('calls').insert({
      lead_id: id,
      status: logStatus,
      outcome: logOutcome,
      transcript: logNotes || null,
      proposal_requested: logProposal,
      scheduled_callback_at: logCallbackDate ? new Date(logCallbackDate).toISOString() : null,
      called_at: new Date().toISOString(),
    });

    // Auto-advance the lead's overall status based on the outcome, and set a
    // reminder date if a callback was requested — this is what feeds "Today's follow-ups".
    const newLeadStatus = logOutcome === 'positive' ? 'meeting_fixed'
      : logOutcome === 'callback_requested' ? 'contacted'
      : logOutcome === 'not_interested' ? 'not_interested'
      : 'contacted';
    await supabase.from('leads').update({
      status: newLeadStatus,
      next_action_at: logCallbackDate ? new Date(logCallbackDate).toISOString() : null,
    }).eq('id', id);

    setSaving(false);
    if (error) {
      alert('Could not save: ' + error.message);
    } else {
      setLogNotes('');
      setLogProposal(false);
      setLogCallbackDate('');
      await loadCalls();
      const { data: leadData } = await supabase.from('leads').select('*').eq('id', id).single();
      setLead(leadData);
    }
  }

  async function handleStatusChange(newStatus) {
    await supabase.from('leads').update({ status: newStatus }).eq('id', id);
    setLead(prev => ({ ...prev, status: newStatus }));
  }

  async function handleNextActionChange(value) {
    await supabase.from('leads').update({ next_action_at: value ? new Date(value).toISOString() : null }).eq('id', id);
    setLead(prev => ({ ...prev, next_action_at: value ? new Date(value).toISOString() : null }));
  }

  async function handleCall() {
    setCalling(true);
    try {
      const res = await fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, phone: lead.phone }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert('Call could not start: ' + (err.error || 'unknown error'));
      }
    } catch (e) {
      alert('Call request failed: ' + e.message);
    } finally {
      setCalling(false);
    }
  }

  if (loading) return <div className="page"><div className="empty">Loading...</div></div>;
  if (!lead) return <div className="page"><div className="empty">Lead not found.</div></div>;

  const pitch = generatePitchScript(lead);

  return (
    <div className="page">
      <Link href="/" style={{ fontSize: 13, color: '#2a78d6', textDecoration: 'none' }}>&larr; Back to dashboard</Link>

      <h1 style={{ marginTop: 12 }}>{lead.business_name}</h1>
      <p className="sub">{lead.keyword_matched} &middot; {lead.city ? `${lead.city}, ` : ''}{lead.country}</p>

      <div className="metrics">
        <div className="metric"><div className="label">Pitch type</div><div className="value" style={{ fontSize: 15 }}>{lead.pitch_type}</div></div>
        <div className="metric"><div className="label">Phone</div><div className="value" style={{ fontSize: 15 }}>{lead.phone || 'Not found'}</div></div>
        <div className="metric"><div className="label">Email</div><div className="value" style={{ fontSize: 15 }}>{lead.email || 'Not found'}</div></div>
        <div className="metric"><div className="label">Reviews</div><div className="value" style={{ fontSize: 15 }}>{lead.review_count ?? '-'}</div></div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <div>
          <label style={labelStyle}>Lead status</label>
          <select value={lead.status || 'new'} onChange={e => handleStatusChange(e.target.value)} style={{ ...fieldStyle, width: 200 }}>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="meeting_fixed">Meeting fixed</option>
            <option value="closed">Closed</option>
            <option value="not_interested">Not interested</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Next follow-up reminder</label>
          <input
            type="datetime-local"
            value={lead.next_action_at ? new Date(lead.next_action_at).toISOString().slice(0, 16) : ''}
            onChange={e => handleNextActionChange(e.target.value)}
            style={{ ...fieldStyle, width: 220 }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button className="call-btn" disabled={!lead.phone || calling} onClick={handleCall}>
          {calling ? 'Starting call...' : 'Call now'}
        </button>
        {lead.phone && (
          <a
            className="call-btn"
            style={{ background: '#25D366', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
            href={`https://wa.me/${lead.phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(pitch.en)}`}
            target="_blank" rel="noreferrer"
          >
            WhatsApp
          </a>
        )}
        {lead.email && (
          <a
            className="call-btn"
            style={{ background: '#5b32a8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
            href={`mailto:${lead.email}?subject=${encodeURIComponent(`Regarding ${lead.business_name}'s online presence`)}&body=${encodeURIComponent(pitch.en)}`}
          >
            Email this pitch
          </a>
        )}
        {lead.website && (
          <a className="call-btn" style={{ background: '#898781', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }} href={lead.website} target="_blank" rel="noreferrer">
            Visit website
          </a>
        )}
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Suggested pitch script</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
        <div className="panel">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500 }}>ENGLISH</div>
          <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>{pitch.en}</p>
        </div>
        <div className="panel">
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500 }}>URDU</div>
          <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>{pitch.ur}</p>
        </div>
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Log a call manually</h2>
      <p className="sub" style={{ marginBottom: 12 }}>Called this lead yourself? Record what happened here — this is what feeds the Reports page.</p>
      <div className="panel" style={{ marginBottom: 24, maxWidth: 600 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelStyle}>Call status</label>
            <select value={logStatus} onChange={e => setLogStatus(e.target.value)} style={fieldStyle}>
              <option value="completed">Completed</option>
              <option value="no_answer">No answer</option>
              <option value="failed">Failed / couldn't connect</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Outcome</label>
            <select value={logOutcome} onChange={e => setLogOutcome(e.target.value)} style={fieldStyle}>
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
              <option value="callback_requested">Callback requested</option>
              <option value="not_interested">Not interested</option>
            </select>
          </div>
        </div>

        {logOutcome === 'callback_requested' && (
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Callback date/time</label>
            <input type="datetime-local" value={logCallbackDate} onChange={e => setLogCallbackDate(e.target.value)} style={fieldStyle} />
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Notes (what did they say?)</label>
          <textarea value={logNotes} onChange={e => setLogNotes(e.target.value)} rows={3} style={{ ...fieldStyle, resize: 'vertical' }} placeholder="Optional notes about the call..." />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 14 }}>
          <input type="checkbox" checked={logProposal} onChange={e => setLogProposal(e.target.checked)} />
          They asked for a proposal
        </label>

        <button className="call-btn" onClick={handleLogCall} disabled={saving}>
          {saving ? 'Saving...' : 'Save call record'}
        </button>
      </div>

      <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>Call history</h2>
      {calls.length === 0 ? (
        <div className="empty">No calls yet for this lead.</div>
      ) : (
        <table>
          <thead><tr><th>Date</th><th>Status</th><th>Outcome</th><th>Transcript</th></tr></thead>
          <tbody>
            {calls.map(c => (
              <tr key={c.id}>
                <td>{c.called_at ? new Date(c.called_at).toLocaleString() : '-'}</td>
                <td>{c.status}</td>
                <td>{c.outcome || '-'}</td>
                <td style={{ maxWidth: 300, whiteSpace: 'pre-wrap', fontSize: 12 }}>{c.transcript || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4, fontWeight: 500 };
const fieldStyle = { width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' };
