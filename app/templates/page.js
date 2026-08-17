'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { applyTemplate } from '../../lib/templates';

const PITCH_TYPES = ['Website pitch', 'SEO / reach pitch', 'Social Media Marketing pitch', 'General pitch'];
const CHANNELS = [
  { key: 'call', label: 'Call script' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'email', label: 'Email' },
];

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePitch, setActivePitch] = useState(PITCH_TYPES[0]);
  const [savingId, setSavingId] = useState(null);
  const [generatingId, setGeneratingId] = useState(null);
  const [edits, setEdits] = useState({});

  const [previewName, setPreviewName] = useState('Mei Kong Restaurant');
  const [previewIndustry, setPreviewIndustry] = useState('restaurant');

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('templates').select('*').order('channel').order('language');
      setTemplates(data || []);
      setLoading(false);
    }
    load();
  }, []);

  function getTemplate(channel, language) {
    return templates.find(t => t.pitch_type === activePitch && t.channel === channel && t.language === language);
  }

  function getValue(tmpl) {
    if (!tmpl) return '';
    return edits[tmpl.id] !== undefined ? edits[tmpl.id] : tmpl.body;
  }

  async function handleSave(tmpl) {
    setSavingId(tmpl.id);
    const newBody = edits[tmpl.id];
    const { error } = await supabase.from('templates').update({ body: newBody, updated_at: new Date().toISOString() }).eq('id', tmpl.id);
    setSavingId(null);
    if (error) {
      alert('Could not save: ' + error.message);
    } else {
      setTemplates(prev => prev.map(t => t.id === tmpl.id ? { ...t, body: newBody } : t));
    }
  }

  async function handleGenerate(tmpl, channelKey, language) {
    setGeneratingId(tmpl.id);
    try {
      const res = await fetch('/api/generate-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pitchType: activePitch, channel: channelKey, language, currentBody: getValue(tmpl) }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert('Could not generate: ' + (data.error || 'unknown error'));
      } else {
        setEdits(prev => ({ ...prev, [tmpl.id]: data.text }));
      }
    } catch (e) {
      alert('Generate request failed: ' + e.message);
    } finally {
      setGeneratingId(null);
    }
  }

  if (loading) return <div className="page"><div className="empty">Loading...</div></div>;

  return (
    <div className="page">
      <h1>Pitch templates</h1>
      <p className="sub">Edit the scripts used for calls, WhatsApp, and email. <code>{'{business_name}'}</code> and <code>{'{industry}'}</code> get filled in automatically per lead.</p>

      <div className="panel" style={{ marginBottom: 20, maxWidth: 480 }}>
        <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 8, fontWeight: 500 }}>PREVIEW WITH A SAMPLE LEAD</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={previewName} onChange={e => setPreviewName(e.target.value)} placeholder="Business name" style={fieldStyle} />
          <input value={previewIndustry} onChange={e => setPreviewIndustry(e.target.value)} placeholder="Industry" style={fieldStyle} />
        </div>
      </div>

      <div className="tabs">
        {PITCH_TYPES.map(pt => (
          <button key={pt} className={`tab ${activePitch === pt ? 'active' : ''}`} onClick={() => setActivePitch(pt)}>{pt}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {CHANNELS.map(ch => {
          const languages = ch.key === 'email' ? ['en'] : ['en', 'ur'];
          return (
            <div key={ch.key} className="panel">
              <h2 style={{ fontSize: 14, marginBottom: 12 }}>{ch.label}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: languages.length > 1 ? '1fr 1fr' : '1fr', gap: 14 }}>
                {languages.map(lang => {
                  const tmpl = getTemplate(ch.key, lang);
                  if (!tmpl) return <div key={lang} className="empty" style={{ padding: 16 }}>No template found for this combination.</div>;
                  const currentValue = getValue(tmpl);
                  const preview = applyTemplate(currentValue, { business_name: previewName, keyword_matched: previewIndustry });
                  return (
                    <div key={lang}>
                      <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase' }}>{lang === 'ur' ? 'Urdu' : 'English'}</div>
                      <textarea
                        value={currentValue}
                        onChange={e => setEdits(prev => ({ ...prev, [tmpl.id]: e.target.value }))}
                        rows={5}
                        style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button className="call-btn" style={{ fontSize: 12 }} onClick={() => handleSave(tmpl)} disabled={savingId === tmpl.id || edits[tmpl.id] === undefined}>
                          {savingId === tmpl.id ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          className="call-btn"
                          style={{ fontSize: 12, background: 'var(--indigo)', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                          onClick={() => handleGenerate(tmpl, ch.key, lang)}
                          disabled={generatingId === tmpl.id}
                        >
                          <Sparkles size={12} /> {generatingId === tmpl.id ? 'Generating...' : 'Generate new variation'}
                        </button>
                      </div>

                      <div style={{ marginTop: 10, padding: 10, background: 'var(--canvas)', border: '1px solid var(--border)', borderRadius: 8 }}>
                        <div style={{ fontSize: 10.5, color: 'var(--ink-muted)', marginBottom: 4, fontWeight: 500 }}>PREVIEW</div>
                        <p style={{ fontSize: 12.5, lineHeight: 1.5, margin: 0, color: 'var(--ink-secondary)' }}>{preview}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const fieldStyle = { flex: 1, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' };