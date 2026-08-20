'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

const DEFAULT_TEMPLATES = [
  { pitch_type: 'Website pitch', channel: 'call', language: 'en', variant_label: 'Variation 1', body: "Hi, is this {business_name}? I'm calling from a digital agency — I noticed {business_name} doesn't have a website yet. We build affordable websites for {industry} businesses. Would you be open to a quick chat?" },
  { pitch_type: 'Website pitch', channel: 'call', language: 'ur', variant_label: 'Variation 1', body: 'Assalam-o-Alaikum, {business_name} se baat ho rahi hai? Humne dekha aapki website nahi hai. Hum {industry} businesses ke liye affordable websites banate hain. 2 minute mil sakte hain?' },
  { pitch_type: 'Website pitch', channel: 'whatsapp', language: 'en', variant_label: 'Variation 1', body: "Hi, this is regarding {business_name}. We noticed you don't have a website yet — we build affordable websites for {industry} businesses." },
  { pitch_type: 'Website pitch', channel: 'email', language: 'en', variant_label: 'Variation 1', body: 'Hi, I noticed {business_name} doesn\'t have a website yet. We build affordable websites for {industry} businesses. Open to a quick call?' },
  { pitch_type: 'SEO / reach pitch', channel: 'call', language: 'en', variant_label: 'Variation 1', body: 'Hi, is this {business_name}? Your website isn\'t showing up well on Google. We help {industry} businesses improve their search ranking. Got a minute?' },
  { pitch_type: 'SEO / reach pitch', channel: 'call', language: 'ur', variant_label: 'Variation 1', body: '{business_name} se baat ho rahi hai? Aapki website Google pe zyada nahi dikh rahi. Hum {industry} businesses ki ranking behtar karte hain. Baat kar sakte hain?' },
  { pitch_type: 'SEO / reach pitch', channel: 'whatsapp', language: 'en', variant_label: 'Variation 1', body: 'Hi, your website isn\'t ranking well on Google yet — we help {industry} businesses fix that.' },
  { pitch_type: 'SEO / reach pitch', channel: 'email', language: 'en', variant_label: 'Variation 1', body: 'Hi, we checked {business_name}\'s website and it isn\'t ranking well on Google. We specialize in {industry} SEO. Happy to share details.' },
  { pitch_type: 'Social Media Marketing pitch', channel: 'call', language: 'en', variant_label: 'Variation 1', body: 'Hi, is this {business_name}? You already have a good online presence — we help {industry} businesses grow reach further through social media.' },
  { pitch_type: 'Social Media Marketing pitch', channel: 'call', language: 'ur', variant_label: 'Variation 1', body: '{business_name} se baat ho rahi hai? Aapki presence acchi hai, hum {industry} businesses ki reach barhane mein madad karte hain.' },
  { pitch_type: 'Social Media Marketing pitch', channel: 'whatsapp', language: 'en', variant_label: 'Variation 1', body: 'Hi, your online presence looks solid — we help {industry} businesses grow it further.' },
  { pitch_type: 'Social Media Marketing pitch', channel: 'email', language: 'en', variant_label: 'Variation 1', body: 'Hi, {business_name} already has a solid presence. We help {industry} businesses grow further through social media marketing.' },
  { pitch_type: 'General pitch', channel: 'call', language: 'en', variant_label: 'Variation 1', body: 'Hi, is this {business_name}? I work with {industry} businesses on their online presence. Got a minute?' },
  { pitch_type: 'General pitch', channel: 'call', language: 'ur', variant_label: 'Variation 1', body: '{business_name} se baat ho rahi hai? Main {industry} businesses ke online presence pe kaam karta hoon. Baat kar sakte hain?' },
  { pitch_type: 'General pitch', channel: 'whatsapp', language: 'en', variant_label: 'Variation 1', body: 'Hi, we work with {industry} businesses on their online presence — open to a quick chat?' },
  { pitch_type: 'General pitch', channel: 'email', language: 'en', variant_label: 'Variation 1', body: 'Hi, we work with {industry} businesses on their online presence. Would you be open to a quick call?' },
];

export default function Signup() {
  const router = useRouter();
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email, password,
      options: { data: { org_name: orgName } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      // Email confirmation is required before login — the org/profile are already
      // created by the database trigger, templates get seeded on first login instead.
      setNeedsConfirmation(true);
      setLoading(false);
      return;
    }

    // Seed default templates for the new organization
    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', data.user.id).single();
    if (profile?.organization_id) {
      await supabase.from('templates').insert(DEFAULT_TEMPLATES.map(t => ({ ...t, organization_id: profile.organization_id })));
    }

    setLoading(false);
    router.push('/');
  }

  if (needsConfirmation) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--canvas)' }}>
        <div className="panel" style={{ width: 360, textAlign: 'center' }}>
          <h1 style={{ marginBottom: 8 }}>Check your email</h1>
          <p className="sub">We sent a confirmation link to {email}. Click it, then come back and log in.</p>
          <Link href="/login" className="call-btn" style={{ textDecoration: 'none', display: 'inline-block', marginTop: 10 }}>Go to login</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--canvas)' }}>
      <form onSubmit={handleSignup} className="panel" style={{ width: 340 }}>
        <h1 style={{ marginBottom: 4 }}>Create your account</h1>
        <p className="sub">Starts on the Demo plan — 10 leads, 7 days.</p>

        <label style={labelStyle}>Agency / business name</label>
        <input type="text" required value={orgName} onChange={e => setOrgName(e.target.value)} style={fieldStyle} />

        <label style={labelStyle}>Email</label>
        <input type="email" required value={email} onChange={e => setEmail(e.target.value)} style={fieldStyle} />

        <label style={labelStyle}>Password</label>
        <input type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} style={fieldStyle} />

        {error && <p style={{ color: 'var(--rose)', fontSize: 12.5, marginBottom: 10 }}>{error}</p>}

        <button type="submit" className="call-btn" style={{ width: '100%', padding: '10px 0', marginTop: 6 }} disabled={loading}>
          {loading ? 'Creating account...' : 'Sign up'}
        </button>

        <p style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginTop: 14, textAlign: 'center' }}>
          Already have an account? <Link href="/login" style={{ color: 'var(--indigo)' }}>Log in</Link>
        </p>
      </form>
    </div>
  );
}

const labelStyle = { display: 'block', fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4, marginTop: 12, fontWeight: 500 };
const fieldStyle = { width: '100%', padding: '9px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' };