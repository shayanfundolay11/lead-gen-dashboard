import { resolveIndustry } from '../../../lib/industries';
import { PLAN_LIMITS } from '../../../lib/planLimits';
import { getUserScopedClient, getProfile } from '../../../lib/authServer';

const BASE = 'https://maps.googleapis.com/maps/api';
const REACH_THRESHOLD = 15;

async function geocode(country, city, area, apiKey) {
  const query = [area, city, country].filter(Boolean).join(', ');
  const url = `${BASE}/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== 'OK') throw new Error(`Could not find location "${query}": ${data.status}`);
  return data.results[0].geometry.location;
}

async function searchPlaces(searchTerm, country, city, area, radiusKm, center, apiKey, limit) {
  const locationText = area ? `${area}, ${city}, ${country}` : `${city}, ${country}`;
  const params = new URLSearchParams({ query: `${searchTerm} in ${locationText}`, key: apiKey });
  if (area) {
    params.set('location', `${center.lat},${center.lng}`);
    params.set('radius', String(Number(radiusKm) * 1000));
  }
  const res = await fetch(`${BASE}/place/textsearch/json?${params.toString()}`);
  const data = await res.json();
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Places search failed: ${data.status} ${data.error_message || ''}`);
  }
  return (data.results || []).slice(0, limit);
}

async function getDetails(placeId, apiKey) {
  const fields = 'name,formatted_phone_number,international_phone_number,website,rating,user_ratings_total,formatted_address';
  const res = await fetch(`${BASE}/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`);
  const data = await res.json();
  return data.status === 'OK' ? data.result : null;
}

async function scrapeEmailFromWebsite(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const html = await res.text();
    const matches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const filtered = matches.filter(m => !/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(m) && !m.includes('example.com') && !m.includes('sentry.io'));
    return filtered[0] || null;
  } catch {
    return null;
  }
}

function detectPitch(details) {
  const hasWebsite = Boolean(details.website);
  const reviewCount = details.user_ratings_total || 0;
  if (!hasWebsite) return 'Website pitch';
  if (reviewCount < REACH_THRESHOLD) return 'SEO / reach pitch';
  return 'Social Media Marketing pitch';
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

  // Reset the daily search counter if it's a new day
  const today = new Date().toISOString().slice(0, 10);
  let searchesToday = org.searches_today;
  if (org.searches_reset_at !== today) {
    searchesToday = 0;
    await supabase.from('organizations').update({ searches_today: 0, searches_reset_at: today }).eq('id', org.id);
  }
  if (!isSuperAdmin && limits.searchesPerDay !== null && searchesToday >= limits.searchesPerDay) {
    return Response.json({ error: `Daily search limit reached (${limits.searchesPerDay} for the ${limits.label} plan). Try again tomorrow or upgrade.` }, { status: 403 });
  }

  if (!isSuperAdmin && org.plan === 'demo' && limits.totalLeadsCap !== null) {
    const { count } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('organization_id', org.id);
    if (count >= limits.totalLeadsCap) {
      return Response.json({ error: `Demo limit reached (${limits.totalLeadsCap} leads). Please upgrade to continue.` }, { status: 403 });
    }
  }

  const { industry, country, city, area, radiusKm } = await req.json();
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) return Response.json({ error: 'GOOGLE_API_KEY is not set yet' }, { status: 500 });
  if (!country || !city) return Response.json({ error: 'Country and city are required' }, { status: 400 });

  try {
    const industryDef = resolveIndustry(industry);
    const center = area ? await geocode(country, city, area, apiKey) : null;
    const places = await searchPlaces(industryDef.searchTerm, country, city, area, radiusKm, center, apiKey, limits.leadsPerSearch);

    let inserted = 0;
    const results = [];

    for (const place of places) {
      const details = await getDetails(place.place_id, apiKey);
      if (!details) continue;

      const { data: existing } = await supabase.from('leads').select('id').eq('business_name', details.name).eq('country', country).eq('organization_id', org.id).limit(1);
      if (existing && existing.length > 0) continue;

      const pitchType = detectPitch(details);
      const email = details.website ? await scrapeEmailFromWebsite(details.website) : null;

      const { error } = await supabase.from('leads').insert({
        organization_id: org.id,
        source: 'google',
        country, city,
        area: area || null,
        keyword_matched: industryDef.label,
        business_name: details.name,
        phone: details.formatted_phone_number || details.international_phone_number || null,
        website: details.website || null,
        email,
        rating: details.rating || null,
        review_count: details.user_ratings_total || 0,
        pitch_type: pitchType,
      });

      if (!error) {
        inserted++;
        results.push({ name: details.name, pitchType });
      }
    }

    await supabase.from('organizations').update({ searches_today: searchesToday + 1 }).eq('id', org.id);

    return Response.json({ success: true, found: places.length, inserted, results });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}