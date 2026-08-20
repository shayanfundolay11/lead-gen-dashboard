'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { COUNTRIES } from '../../lib/countries';
import { useOrgId } from '../../lib/useOrgId';

export default function AddLead() {
  const orgId = useOrgId();
  const [source, setSource] = useState('linkedin');
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('');
  const [country, setCountry] = useState('Pakistan');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [pitchType, setPitchType] = useState('Website pitch');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  async function handleSave() {
    if (!businessName) { setError('Business name is required'); return; }
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase.from('leads').insert({
      organization_id: orgId,
      source, country, city, keyword_matched: industry || 'Manually added',
      business_name: businessName, phone: phone || null, email: email || null,
      website: website || null, pitch_type: pitchType,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
    } else {
      setSaved(true);
      setBusinessName(''); setPhone(''); setEmail(''); setWebsite(''); setIndustry('');
    }
  }

  return (
    <div className="page">
      <Link href="/" style={{ fontSize: 13, color: 'var(--indigo)', textDecoration: 'none' }}>&larr; Back to dashboard</Link>
      <h1 style={{ marginTop: 12 }}>Add a lead manually</h1>
      <p className="sub">LinkedIn, Facebook, and Instagram don't have a free lead-discovery API like Google Places does — browse those platforms yourself and add what you find here.</p>

      <div className="panel" style={{ maxWidth: 480 }}>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Source</label>
          <select value={source} onChange={e => setSource(e.target.value)} style={fieldStyle}>
            <option value="linkedin">LinkedIn</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="google">Google</option>
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Business name *</label>
          <input type="text" value={businessName} onChange={e => setBusinessName(e.target.value)} style={fieldStyle} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Industry / what they do</label>
          <input type="text" value={industry} onChange={e => setIndustry(e.target.value)} placeholder="e.g. Restaurant, Real Estate" style={fieldStyle} />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Country</label>
            <select value={country} onChange={e => setCountry(e.target.value)} style={fieldStyle}>
              {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>City</label>
            <input type="text" value={city} onChange={e => setCity(e.target.value)} style={fieldStyle} />
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Phone</label>
          <input type="text" value={phone} onChange={e => setPhone(e.target.value)} style={fieldStyle} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Email</label>
          <input type="text" value={email} onChange={e => setEmail(e.target.value)} style={fieldStyle} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Website (if any)</label>
          <input type="text" value={website} onChange={e => setWebsite(e.target.value)} style={fieldStyle} />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>What should we pitch them?</label>
          <select value={pitchType} onChange={e => setPitchType(e.target.value)} style={fieldStyle}>
            <option value="Website pitch">Website pitch (no website)</option>
            <option value="SEO / reach pitch">SEO / reach pitch (has website, low reach)</option>
            <option value="Social Media Marketing pitch">Social Media Marketing pitch</option>
            <option value="General pitch">General pitch</option>
          </select>
        </div>

        <button className="call-btn" style={{ width: '100%', padding: '10px 0' }} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Add lead'}
        </button>
        {error && <p style={{ color: 'var(--rose)', fontSize: 12, marginTop: 8 }}>{error}</p>}
        {saved && <p style={{ color: 'var(--teal)', fontSize: 12, marginTop: 8 }}>Lead added. <Link href="/" style={{ color: 'var(--indigo)' }}>View on dashboard &rarr;</Link></p>}
      </div>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4, fontWeight: 500 };
const fieldStyle = { width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' };