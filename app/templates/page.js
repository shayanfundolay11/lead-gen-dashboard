'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
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
  const [edits, setEdits] = useState({});

  const [previewName, setPreviewName] = useState('Mei Kong Restaurant');
  const [previewIndustry, setPreviewIndustry] = useState('restaurant');

  async function loadTemplates() {
    const { data } = await supabase.from('templates').select('*').order('channel').order('language').order('variant_label');
    setTemplates(data || []);
    setLoading(false);
  }

  useEffect(() => { loadTemplates(); }, []);

  function getVariants(channel, language) {
    return templates.filter(t => t.pitch_type === activePitch && t.channel === channel && t.language === language);
  }

  function getValue(tmpl) {
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

  async function handleAddVariation(channel, language) {
    const existing = getVariants(channel, language);
    const nextNum = existing.length + 1;
    const { error } = await supabase.from('templates').insert({
      pitch_type: activePitch, channel, language,
      variant_label: `Variation ${nextNum}`,
      body: existing[0]?.body || 'Write your new variation here...',
    });
    if (error) alert('Could not add: ' + error.message);
    else await loadTemplates();
  }

  async function handleDelete(tmpl) {
    if (!confirm(`Delete "${tmpl.variant_label}"?`)) return;
    const { error } = await supabase.from('templates').delete().eq('id', tmpl.id);
    if (error) alert('Could not delete: ' + error.message);
    else await loadTemplates();
  }

  if (loading) return <div className="page"><div className="empty">Loading...</div></div>;

  return (
    <div className="page">
      <h1>Pitch templates</h1>
      <p className="sub">Keep a few variations per script so every lead doesn't hear the exact same pitch. <code>{'{business_name}'}</code> and <code>{'{industry}'}</code> fill in automatically — a random variation is picked per lead.</p>

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
                  const variants = getVariants(ch.key, lang);
                  return (
                    <div key={lang}>
                      <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginBottom: 8, fontWeight: 500, textTransform: 'uppercase' }}>{lang === 'ur' ? 'Urdu' : 'English'}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {variants.map(tmpl => {
                          const currentValue = getValue(tmpl);
                          const preview = applyTemplate(currentValue, { business_name: previewName, keyword_matched: previewIndustry });
                          return (
                            <div key={tmpl.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--indigo)' }}>{tmpl.variant_label}</span>
                                {variants.length > 1 && (
                                  <button onClick={() => handleDelete(tmpl)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-muted)', display: 'flex' }}>
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </div>
                              <textarea
                                value={currentValue}
                                onChange={e => setEdits(prev => ({ ...prev, [tmpl.id]: e.target.value }))}
                                rows={4}
                                style={{ width: '100%', padding: 8, border: '1px solid var(--border)', borderRadius: 6, fontSize: 12.5, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                              />
                              <button className="call-btn" style={{ fontSize: 11.5, marginTop: 6, padding: '5px 12px' }} onClick={() => handleSave(tmpl)} disabled={savingId === tmpl.id || edits[tmpl.id] === undefined}>
                                {savingId === tmpl.id ? 'Saving...' : 'Save'}
                              </button>
                              <div style={{ marginTop: 8, padding: 8, background: 'var(--canvas)', borderRadius: 6 }}>
                                <div style={{ fontSize: 10, color: 'var(--ink-muted)', marginBottom: 3, fontWeight: 500 }}>PREVIEW</div>
                                <p style={{ fontSize: 11.5, lineHeight: 1.5, margin: 0, color: 'var(--ink-secondary)' }}>{preview}</p>
                              </div>
                            </div>
                          );
                        })}
                        <button
                          onClick={() => handleAddVariation(ch.key, lang)}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'center', padding: '8px', border: '1px dashed var(--border)', borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--ink-muted)' }}
                        >
                          <Plus size={13} /> Add variation
                        </button>
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