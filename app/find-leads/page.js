'use client';

import { useState } from 'react';
import Link from 'next/link';
import { INDUSTRIES } from '../../lib/industries';
import { COUNTRIES } from '../../lib/countries';
import AutocompleteInput from '../../components/AutocompleteInput';

export default function FindLeads() {
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

  async function handleFindLeads() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/find-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          industry: industry === 'other' ? customIndustry : industry,
          country: countryName, city, area, radiusKm,
        }),
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
      <Link href="/" style={{ fontSize: 13, color: '#2a78d6', textDecoration: 'none' }}>&larr; Back to dashboard</Link>
      <h1 style={{ marginTop: 12 }}>Find leads</h1>
      <p className="sub">Pick an industry and area — the pitch type (Website / SEO / Social Media) is detected automatically per business.</p>

      <div className="panel" style={{ maxWidth: 480 }}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Industry</label>
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
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Country</label>
          <select value={countryName} onChange={e => { setCountryName(e.target.value); setCity(''); setArea(''); }} style={inputStyle}>
            {COUNTRIES.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>City</label>
          <AutocompleteInput
            value={city}
            onChange={setCity}
            placeholder="Start typing a city..."
            types="(cities)"
            countryCode={countryCode}
          />
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Area (optional)</label>
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
            <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Radius (km)</label>
            <input type="number" min="1" max="50" value={radiusKm} onChange={e => setRadiusKm(e.target.value)} style={inputStyle} disabled={!area} />
          </div>
        </div>

        <button className="call-btn" style={{ width: '100%', padding: '10px 0' }} onClick={handleFindLeads} disabled={loading || !city}>
          {loading ? 'Searching...' : 'Find Leads'}
        </button>
      </div>

      {error && <div style={{ marginTop: 16, color: '#99401d' }}>Error: {error}</div>}

      {result && (
        <div style={{ marginTop: 20 }}>
          <p><strong>{result.inserted}</strong> new leads added (out of {result.found} found, duplicates skipped).</p>
          {result.results?.length > 0 && (
            <table>
              <thead><tr><th>Business</th><th>Pitch type</th></tr></thead>
              <tbody>
                {result.results.map((r, i) => (
                  <tr key={i}><td>{r.name}</td><td>{r.pitchType}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          <p style={{ marginTop: 12 }}><Link href="/" style={{ color: '#2a78d6' }}>Go to dashboard to see them &rarr;</Link></p>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '8px 10px', border: '0.5px solid var(--border)',
  borderRadius: 6, fontSize: 13, background: 'white', boxSizing: 'border-box',
};
