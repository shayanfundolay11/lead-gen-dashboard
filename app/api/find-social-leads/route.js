import { PLAN_LIMITS } from '../../../lib/planLimits';
import { getUserScopedClient, getProfile } from '../../../lib/authServer';

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
  const match = text.match(/\+?[\d][\d\s\-().]{7,}\d/);
  return match ? match[0].trim() : null;
}
function cleanBusinessName(title) {
  return title.split(/\s*[|\u2013-]\s*(LinkedIn|Facebook|Instagram|TikTok)/i)[0].trim();
}

export async function POST(req) {
  const supabase = getUserScopedClient(req);
  const profile = await getProfile(supabase);
  if (!profile) return Response.json({ error: 'Not logged in' }, { status: 401 });

  const org = profile.organizations;
  const isSuperAdmin = profile.role === 'super_admin';
  const limits = isSuperAdmin ? { leadsPerSearch: 50, searchesPerDay: null, totalLeadsCap: null, label: 'Super Admin' } : PLAN_LIMITS[org.plan];

  if (!isSuperAdmin && org.plan === 'demo' && org.demo_expires_at && new Date(org.demo_expires_at) < new Date()) {
    return Response.json({ error: 'Your demo has expired. Please upgrade to continue.' }, { status: 403 });
  }

  const today = new Date().toISOString().slice(0, 10);
  let searchesToday = org.searches_today;
  if (org.searches_reset_at !== today) {
    searchesToday = 0;
    await supabase.from('organizations').update({ searches_today: 0, searches_reset_at: today }).eq('id', org.id);
  }
  if (!isSuperAdmin && limits.searchesPerDay !== null && searchesToday >= limits.searchesPerDay) {
    return Response.json({ error: `Daily search limit reached (${limits.searchesPerDay} for the ${limits.label} plan).` }, { status: 403 });
  }

  const { platform, industry, country, city } = await req.json();
  const apiKey = process.env.GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CSE_ID;

  if (!apiKey || !cx) return Response.json({ error: 'GOOGLE_CSE_ID is not configured yet' }, { status: 500 });
  const domain = PLATFORM_DOMAINS[platform];
  if (!domain) return Response.json({ error: 'Unknown platform' }, { status: 400 });

  const query = `site:${domain} ${industry} ${city} ${country}`;
  const params = new URLSearchParams({ key: apiKey, cx, q: query, num: String(Math.min(limits.leadsPerSearch, 10)) });

  try {
    const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) return Response.json({ error: data.error?.message || 'Custom Search API request failed' }, { status: 500 });

    const items = data.items || [];
    let inserted = 0;
    const results = [];

    for (const item of items) {
      const businessName = cleanBusinessName(item.title || item.link);
      const snippet = item.snippet || '';
      const email = extractEmail(snippet);
      const phone = extractPhone(snippet);

      const { data: existing } = await supabase.from('leads').select('id').eq('business_name', businessName).eq('country', country).eq('source', platform).eq('organization_id', org.id).limit(1);
      if (existing && existing.length > 0) continue;

      const { error } = await supabase.from('leads').insert({
        organization_id: org.id,
        source: platform, country, city,
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

    await supabase.from('organizations').update({ searches_today: searchesToday + 1 }).eq('id', org.id);

    return Response.json({ success: true, found: items.length, inserted, results });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}