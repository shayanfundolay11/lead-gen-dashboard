'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

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

  if (loading) return <div className="page"><div className="empty">Loading...</div></div>;

  return (
    <div className="page">
      <h1>Pitch templates</h1>
      <p className="sub">Edit the scripts used for calls, WhatsApp, and email. Use <code>{'{business_name}'}</code> and <code>{'{industry}'}</code> — they get filled in automatically per lead.</p>

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
                  return (
                    <div key={lang}>
                      <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase' }}>{lang === 'ur' ? 'Urdu' : 'English'}</div>
                      <textarea
                        value={getValue(tmpl)}
                        onChange={e => setEdits(prev => ({ ...prev, [tmpl.id]: e.target.value }))}
                        rows={5}
                        style={{ width: '100%', padding: 10, border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
                      />
                      <button
                        className="call-btn"
                        style={{ marginTop: 8, fontSize: 12 }}
                        onClick={() => handleSave(tmpl)}
                        disabled={savingId === tmpl.id || edits[tmpl.id] === undefined}
                      >
                        {savingId === tmpl.id ? 'Saving...' : 'Save'}
                      </button>
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