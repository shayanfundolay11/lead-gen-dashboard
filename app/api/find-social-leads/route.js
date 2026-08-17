import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const PLATFORM_DOMAINS = {
  linkedin: 'linkedin.com',
  facebook: 'facebook.com',
  instagram: 'instagram.com',
  tiktok: 'tiktok.com',
};

function extractEmail(text) {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : null;
}

function extractPhone(text) {
  // Loosely matches phone-like sequences (7+ digits, optional +, spaces, dashes)
  const match = text.match(/\+?[\d][\d\s\-().]{7,}\d/);
  return match ? match[0].trim() : null;
}

function cleanBusinessName(title) {
  // Strip common platform suffixes like " | LinkedIn", " - Instagram", " (@handle) TikTok"
  return title.split(/\s*[|\u2013-]\s*(LinkedIn|Facebook|Instagram|TikTok)/i)[0].trim();
}

export async function POST(req) {
  const { platform, industry, country, city } = await req.json();
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CSE_ID;

  if (!apiKey || !cx) {
    return Response.json({ error: 'GOOGLE_CSE_ID (Programmable Search Engine) is not configured yet' }, { status: 500 });
  }
  const domain = PLATFORM_DOMAINS[platform];
  if (!domain) {
    return Response.json({ error: 'Unknown platform' }, { status: 400 });
  }

  const query = `site:${domain} ${industry} ${city} ${country}`;
  const params = new URLSearchParams({ key: apiKey, cx, q: query, num: '10' });

  try {
    const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) {
      return Response.json({ error: data.error?.message || 'Custom Search API request failed' }, { status: 500 });
    }

    const items = data.items || [];
    let inserted = 0;
    const results = [];

    for (const item of items) {
      const businessName = cleanBusinessName(item.title || item.link);
      const snippet = item.snippet || '';
      const email = extractEmail(snippet);
      const phone = extractPhone(snippet);

      const { data: existing } = await supabase.from('leads').select('id').eq('business_name', businessName).eq('country', country).eq('source', platform).limit(1);
      if (existing && existing.length > 0) continue;

      const { error } = await supabase.from('leads').insert({
        source: platform,
        country, city,
        keyword_matched: industry,
        business_name: businessName,
        phone, email,
        website: item.link,
        pitch_type: 'Social Media Marketing pitch',
      });

      if (!error) {
        inserted++;
        results.push({ name: businessName, hasEmail: Boolean(email), hasPhone: Boolean(phone) });
      }
    }

    return Response.json({ success: true, found: items.length, inserted, results });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}