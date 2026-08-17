'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../../lib/supabaseClient';
import { generatePitchScript } from '../../../lib/generatePitch';
import { applyTemplate } from '../../../lib/templates';

export default function LeadDetail() {
  const { id } = useParams();
  const [lead, setLead] = useState(null);
  const [calls, setCalls] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calling, setCalling] = useState(false);

  const [logStatus, setLogStatus] = useState('completed');
  const [logOutcome, setLogOutcome] = useState('positive');
  const [logNotes, setLogNotes] = useState('');
  const [logProposal, setLogProposal] = useState(false);
  const [logCallbackDate, setLogCallbackDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [auditing, setAuditing] = useState(false);

  async function handleRunAudit() {
    setAuditing(true);
    try {
      const res = await fetch('/api/seo-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert('Audit failed: ' + (data.error || 'unknown error'));
      } else {
        setLead(prev => ({ ...prev, seo_audit: data.audit, seo_audit_at: data.audit.checkedAt }));
      }
    } catch (e) {
      alert('Audit request failed: ' + e.message);
    } finally {
      setAuditing(false);
    }
  }

  async function loadCalls() {
    const { data: callData } = await supabase.from('calls').select('*').eq('lead_id', id).order('created_at', { ascending: false });
    setCalls(callData || []);
  }

  useEffect(() => {
    async function load() {
      const { data: leadData } = await supabase.from('leads').select('*').eq('id', id).single();
      setLead(leadData);
      const { data: templateData } = await supabase.from('templates').select('*');
      setTemplates(templateData || []);
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

  // Each lead's id deterministically picks a variation — so this lead always shows the
  // same script on repeat visits, but different leads get different wording for variety.
  function leadSeed() {
    return String(lead.id).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  }

  function getPitch(channel, language) {
    const matches = templates.filter(t => t.pitch_type === lead.pitch_type && t.channel === channel && t.language === language);
    if (matches.length > 0) {
      const chosen = matches[leadSeed() % matches.length];
      return applyTemplate(chosen.body, lead);
    }
    const fallback = generatePitchScript(lead);
    return language === 'ur' ? fallback.ur : fallback.en;
  }

  const pitchEn = getPitch('call', 'en');
  const pitchUr = getPitch('call', 'ur');
  const whatsappText = getPitch('whatsapp', 'en');
  const emailMatches = templates.filter(t => t.pitch_type === lead.pitch_type && t.channel === 'email' && t.language === 'en');
  const emailBody = emailMatches.length > 0 ? applyTemplate(emailMatches[leadSeed() % emailMatches.length].body, lead) : pitchEn;

  return (
    <div className="page">
      <Link href="/" style={{ fontSize: 13, color: 'var(--indigo)', textDecoration: 'none' }}>&larr; Back to dashboard</Link>

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

      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <button className="call-btn" disabled={!lead.phone || calling} onClick={handleCall}>
          {calling ? 'Starting call...' : 'Call now'}
        </button>
        {lead.phone && (
          <a
            className="call-btn"
            style={{ background: '#25D366', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
            href={`https://wa.me/${lead.phone.replace(/[^\d]/g, '')}?text=${encodeURIComponent(whatsappText)}`}
            target="_blank" rel="noreferrer"
          >
            WhatsApp
          </a>
        )}
        {lead.email && (
          <a
            className="call-btn"
            style={{ background: '#5b32a8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
            href={`mailto:${lead.email}?subject=${encodeURIComponent(`Regarding ${lead.business_name}'s online presence`)}&body=${encodeURIComponent(emailBody)}`}
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

      {lead.website && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>SEO / website audit</h2>
            <button className="call-btn" style={{ background: 'var(--indigo)' }} onClick={handleRunAudit} disabled={auditing}>
              {auditing ? 'Checking...' : lead.seo_audit ? 'Re-run audit' : 'Run audit'}
            </button>
          </div>

          {lead.seo_audit ? (
            <div className="panel" style={{ marginBottom: 24 }}>
              <p className="sub" style={{ marginBottom: 12 }}>Checked {new Date(lead.seo_audit_at).toLocaleString()}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <AuditRow label="Page title" ok={lead.seo_audit.onPage?.hasTitle} detail={lead.seo_audit.onPage?.titleText} />
                  <AuditRow label="Title length (ideal 30–65 chars)" ok={lead.seo_audit.onPage?.titleLengthOk} />
                  <AuditRow label="Meta description" ok={lead.seo_audit.onPage?.hasMetaDescription} detail={lead.seo_audit.onPage?.metaDescriptionText} />
                  <AuditRow label="Description length (ideal 70–165 chars)" ok={lead.seo_audit.onPage?.metaDescriptionLengthOk} />
                  <AuditRow label="Mobile-friendly tag" ok={lead.seo_audit.onPage?.hasViewport} />
                  <AuditRow label="HTTPS (secure)" ok={lead.seo_audit.onPage?.isHttps} />
                  <AuditRow label="Exactly one H1 heading" ok={lead.seo_audit.onPage?.h1Count === 1} detail={lead.seo_audit.onPage?.h1Count != null ? `${lead.seo_audit.onPage.h1Count} found` : null} />
                  <AuditRow label="Social sharing tags (Open Graph)" ok={lead.seo_audit.onPage?.hasOpenGraph} />
                  <AuditRow label="Image alt text coverage" ok={lead.seo_audit.onPage?.imgAltRatio >= 80} detail={lead.seo_audit.onPage?.imgAltRatio != null ? `${lead.seo_audit.onPage.imgAltRatio}% of images have alt text` : 'No images found'} />
                  <AuditRow label="sitemap.xml present" ok={lead.seo_audit.onPage?.hasSitemap} />
                  <AuditRow label="robots.txt present" ok={lead.seo_audit.onPage?.hasRobots} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 6, fontWeight: 500 }}>MOBILE PAGE SPEED SCORE</div>
                  {lead.seo_audit.pageSpeed?.available ? (
                    <>
                      <div className="mono" style={{ fontSize: 32, fontWeight: 600, marginBottom: 8, color: lead.seo_audit.pageSpeed.performanceScore >= 70 ? 'var(--teal)' : lead.seo_audit.pageSpeed.performanceScore >= 40 ? 'var(--amber)' : 'var(--rose)' }}>
                        {lead.seo_audit.pageSpeed.performanceScore}/100
                      </div>
                      {lead.seo_audit.pageSpeed.topIssues?.length > 0 && (
                        <ul style={{ fontSize: 12, color: 'var(--ink-secondary)', paddingLeft: 16, margin: 0 }}>
                          {lead.seo_audit.pageSpeed.topIssues.map((issue, i) => <li key={i} style={{ marginBottom: 4 }}>{issue}</li>)}
                        </ul>
                      )}
                    </>
                  ) : (
                    <p style={{ fontSize: 12, color: 'var(--ink-muted)' }}>Not available ({lead.seo_audit.pageSpeed?.error || 'unknown reason'})</p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty" style={{ marginBottom: 24 }}>No audit run yet. Click "Run audit" to check their website.</div>
          )}
        </>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>Suggested pitch script</h2>
        <Link href="/templates" style={{ fontSize: 12, color: 'var(--indigo)', textDecoration: 'none' }}>Edit templates &rarr;</Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
        <div className="panel">
          <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 8, fontWeight: 500 }}>ENGLISH</div>
          <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>{pitchEn}</p>
        </div>
        <div className="panel">
          <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 8, fontWeight: 500 }}>URDU</div>
          <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0 }}>{pitchUr}</p>
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

function AuditRow({ label, ok, detail }) {
  return (
    <div style={{ marginBottom: 10, fontSize: 13 }}>
      <span className={`badge ${ok ? 'b-positive' : 'b-negative'}`} style={{ marginRight: 8 }}>{ok ? 'OK' : 'Missing'}</span>
      <span style={{ fontWeight: 500 }}>{label}</span>
      {detail && <div style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginTop: 2, marginLeft: 2 }}>{detail}</div>}
    </div>
  );
}