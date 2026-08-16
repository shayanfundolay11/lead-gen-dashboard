import { createClient } from '@supabase/supabase-js';
import { resolveIndustry } from '../../../lib/industries';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const BASE = 'https://maps.googleapis.com/maps/api';
const REACH_THRESHOLD = 15; // fewer Google reviews than this = "low reach", used as a free proxy

async function geocode(country, city, area, apiKey) {
  const query = [area, city, country].filter(Boolean).join(', ');
  const url = `${BASE}/geocode/json?address=${encodeURIComponent(query)}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== 'OK') throw new Error(`Could not find location "${query}": ${data.status}`);
  return data.results[0].geometry.location;
}

async function searchPlaces(searchTerm, country, city, area, radiusKm, center, apiKey) {
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
  return (data.results || []).slice(0, 20); // capped to keep this request fast
}

async function getDetails(placeId, apiKey) {
  const fields = 'name,formatted_phone_number,international_phone_number,website,rating,user_ratings_total,formatted_address';
  const res = await fetch(`${BASE}/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`);
  const data = await res.json();
  return data.status === 'OK' ? data.result : null;
}

// Best-effort only: Google Maps never provides email addresses, this is not part of its
// data at all. If the business has a website, we try to find a public email on the
// homepage. Many sites use contact forms instead of a listed email, so this often
// returns nothing — that's expected, not a bug.
async function scrapeEmailFromWebsite(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const html = await res.text();
    const matches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const filtered = matches.filter(m => !/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(m) && !m.includes('example.com') && !m.includes('sentry.io'));
    return filtered[0] || null;
  } catch {
    return null; // site blocked scraping, timed out, or has no email listed — expected sometimes
  }
}

// This is the core fix: pitch type is decided PER BUSINESS from its own website/review
// data, not from what the user searched for. A restaurant search can return some
// businesses that need a website and others that just need SEO — both in the same run.
function detectPitch(details) {
  const hasWebsite = Boolean(details.website);
  const reviewCount = details.user_ratings_total || 0;
  if (!hasWebsite) return 'Website pitch';
  if (reviewCount < REACH_THRESHOLD) return 'SEO / reach pitch';
  return 'Social Media Marketing pitch';
}

export async function POST(req) {
  const { industry, country, city, area, radiusKm } = await req.json();
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return Response.json({ error: 'GOOGLE_API_KEY is not set in Vercel environment variables yet' }, { status: 500 });
  }
  if (!country || !city) {
    return Response.json({ error: 'Country and city are required' }, { status: 400 });
  }

  try {
    const industryDef = resolveIndustry(industry);
    const center = area ? await geocode(country, city, area, apiKey) : null;
    const places = await searchPlaces(industryDef.searchTerm, country, city, area, radiusKm, center, apiKey);

    let inserted = 0;
    const results = [];

    for (const place of places) {
      const details = await getDetails(place.place_id, apiKey);
      if (!details) continue;

      const { data: existing } = await supabase
        .from('leads')
        .select('id')
        .eq('business_name', details.name)
        .eq('country', country)
        .limit(1);
      if (existing && existing.length > 0) continue; // skip duplicates

      const pitchType = detectPitch(details);
      const email = details.website ? await scrapeEmailFromWebsite(details.website) : null;

      const { error } = await supabase.from('leads').insert({
        source: 'google',
        country,
        city,
        area: area || null,
        keyword_matched: industryDef.label, // industry, shown in the "Keyword" column
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

    return Response.json({ success: true, found: places.length, inserted, results });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
