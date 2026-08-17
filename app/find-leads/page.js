'use client';

import { useState } from 'react';
import Link from 'next/link';
import { INDUSTRIES } from '../../lib/industries';
import { COUNTRIES } from '../../lib/countries';
import AutocompleteInput from '../../components/AutocompleteInput';

const PLATFORMS = [
  { key: 'google', label: 'Google Maps' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
];

export default function FindLeads() {
  const [platform, setPlatform] = useState('google');
  const [industry, setIndustry] = useState('restaurant');
  const [customIndustry, setCustomIndustry] = useState('');
  const [countryName, setCountryName] = useState('Pakistan');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [radiusKm, setRadiusKm] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const countryCode = COUNTRIES.find(c => c.name === countryName)?.code || '';
  const isGoogle = platform === 'google';

  async function handleFindLeads() {
    setLoading(true);
    setError(null);
    setResult(null);
    const industryValue = industry === 'other' ? customIndustry : INDUSTRIES.find(i => i.id === industry)?.label || industry;
    try {
      const endpoint = isGoogle ? '/api/find-leads' : '/api/find-social-leads';
      const body = isGoogle
        ? { industry: industry === 'other' ? customIndustry : industry, country: countryName, city, area, radiusKm }
        : { platform, industry: industryValue, country: countryName, city };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong');
      } else {
        setResult(data);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <Link href="/" style={{ fontSize: 13, color: 'var(--indigo)', textDecoration: 'none' }}>&larr; Back to dashboard</Link>
      <h1 style={{ marginTop: 12 }}>Find leads</h1>
      <p className="sub">Pick a platform, industry, and area. Google Maps checks website/reach automatically; social platforms search public, indexed profiles.</p>

      <div className="tabs" style={{ marginBottom: 18 }}>
        {PLATFORMS.map(p => (
          <button key={p.key} className={`tab ${platform === p.key ? 'active' : ''}`} onClick={() => setPlatform(p.key)}>{p.label}</button>
        ))}
      </div>

      <div className="panel" style={{ maxWidth: 480 }}>
        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Industry</label>
          <select value={industry} onChange={e => setIndustry(e.target.value)} style={inputStyle}>
            {INDUSTRIES.map(i => <option key={i.id} value={i.id}>{i.label}</option>)}
            <option value="other">Other (type your own)</option>
          </select>
          {industry === 'other' && (
            <input
              type="text" placeholder="e.g. Interior Design Studios"
              value={customIndustry} onChange={e => setCustomIndustry(e.target.value)}
              style={{ ...inputStyle, marginTop: 8 }}
            />
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>Country</label>
          <select value={countryName} onChange={e => { setCountryName(e.target.value); setCity(''); setArea(''); }} style={inputStyle}>
            {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={labelStyle}>City</label>
          <AutocompleteInput
            value={city}
            onChange={setCity}
            placeholder="Start typing a city..."
            types="(cities)"
            countryCode={countryCode}
          />
        </div>

        {isGoogle && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            <div style={{ flex: 2 }}>
              <label style={labelStyle}>Area (optional)</label>
              <AutocompleteInput
                value={area}
                onChange={setArea}
                placeholder="e.g. Bhatti Chowk"
                types="geocode"
                countryCode={countryCode}
                disabled={!city}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Radius (km)</label>
              <input type="number" min="1" max="50" value={radiusKm} onChange={e => setRadiusKm(e.target.value)} style={inputStyle} disabled={!area} />
            </div>
          </div>
        )}

        {!isGoogle && (
          <p style={{ fontSize: 11.5, color: 'var(--ink-muted)', marginBottom: 18 }}>
            Searches public {PLATFORMS.find(p => p.key === platform).label} profiles indexed by Google. Contact info is only found if the business listed it publicly on their profile.
          </p>
        )}

        <button className="call-btn" style={{ width: '100%', padding: '10px 0' }} onClick={handleFindLeads} disabled={loading || !city}>
          {loading ? 'Searching...' : 'Find Leads'}
        </button>
      </div>

      {error && <div style={{ marginTop: 16, color: 'var(--rose)' }}>Error: {error}</div>}

      {result && (
        <div style={{ marginTop: 20 }}>
          <p><strong>{result.inserted}</strong> new leads added (out of {result.found} found, duplicates skipped).</p>
          {result.results?.length > 0 && (
            <table>
              <thead><tr><th>Business</th><th>{isGoogle ? 'Pitch type' : 'Contact info found'}</th></tr></thead>
              <tbody>
                {result.results.map((r, i) => (
                  <tr key={i}>
                    <td>{r.name}</td>
                    <td>{isGoogle ? r.pitchType : [r.hasEmail && 'Email', r.hasPhone && 'Phone'].filter(Boolean).join(', ') || 'None found'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p style={{ marginTop: 12 }}><Link href="/" style={{ color: 'var(--indigo)' }}>Go to dashboard to see them &rarr;</Link></p>
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4 };
const inputStyle = {
  width: '100%', padding: '8px 10px', border: '0.5px solid var(--border)',
  borderRadius: 6, fontSize: 13, background: 'white', boxSizing: 'border-box',
};