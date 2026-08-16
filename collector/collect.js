const { createClient } = require('@supabase/supabase-js');
const config = require('./config');
const { resolveKeyword } = require('./keywords');

const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
const BASE = 'https://maps.googleapis.com/maps/api';

async function geocodeLocation(loc) {
  const query = [loc.area, loc.city, loc.country].filter(Boolean).join(', ');
  const url = `${BASE}/geocode/json?address=${encodeURIComponent(query)}&key=${config.GOOGLE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== 'OK') throw new Error(`Geocoding failed for "${query}": ${data.status}`);
  return data.results[0].geometry.location;
}

async function searchPlaces(keywordLabel, loc, center) {
  const locationText = loc.area ? `${loc.area}, ${loc.city}, ${loc.country}` : `${loc.city}, ${loc.country}`;
  const params = new URLSearchParams({ query: `${keywordLabel} in ${locationText}`, key: config.GOOGLE_API_KEY });
  if (loc.area) {
    params.set('location', `${center.lat},${center.lng}`);
    params.set('radius', String(loc.radiusKm * 1000));
  }
  const res = await fetch(`${BASE}/place/textsearch/json?${params.toString()}`);
  const data = await res.json();
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Places search failed for "${keywordLabel}": ${data.status} ${data.error_message || ''}`);
  }
  return (data.results || []).slice(0, config.maxResultsPerKeyword);
}

async function getPlaceDetails(placeId) {
  const fields = 'name,formatted_phone_number,international_phone_number,website,rating,user_ratings_total,formatted_address';
  const res = await fetch(`${BASE}/place/details/json?place_id=${placeId}&fields=${fields}&key=${config.GOOGLE_API_KEY}`);
  const data = await res.json();
  return data.status === 'OK' ? data.result : null;
}

function qualifies(details, filterType) {
  if (!details) return false;
  const hasWebsite = Boolean(details.website);
  const reviewCount = details.user_ratings_total || 0;
  if (filterType === 'no_website') return !hasWebsite;
  if (filterType === 'low_reach') return hasWebsite && reviewCount < config.reach.maxReviewCount;
  return true;
}

async function leadAlreadyExists(businessName, country) {
  const { data } = await supabase
    .from('leads')
    .select('id')
    .eq('business_name', businessName)
    .eq('country', country)
    .limit(1);
  return data && data.length > 0;
}

async function run() {
  if (!config.GOOGLE_API_KEY || config.GOOGLE_API_KEY.startsWith('PASTE_')) {
    console.error('Set GOOGLE_API_KEY before running.');
    process.exit(1);
  }
  if (!config.SUPABASE_ANON_KEY || config.SUPABASE_ANON_KEY.startsWith('PASTE_')) {
    console.error('Set NEXT_PUBLIC_SUPABASE_ANON_KEY before running.');
    process.exit(1);
  }

  let inserted = 0;

  for (const loc of config.locations) {
    console.log(`\n=== ${loc.area || loc.city}, ${loc.country} ===`);
    const center = await geocodeLocation(loc);

    for (const rawKeyword of config.selectedKeywords) {
      const keyword = resolveKeyword(rawKeyword);
      console.log(`Searching: "${keyword.label}" (${keyword.filterType})`);
      const places = await searchPlaces(keyword.label, loc, center);

      for (const place of places) {
        const details = await getPlaceDetails(place.place_id);
        if (!qualifies(details, keyword.filterType)) continue;
        if (await leadAlreadyExists(details.name, loc.country)) continue; // skip duplicates across runs

        const pitchType = keyword.filterType === 'no_website' ? 'Website pitch'
          : keyword.filterType === 'low_reach' ? 'SEO / reach pitch'
          : 'General pitch';

        const { error } = await supabase.from('leads').insert({
          source: 'google',
          country: loc.country,
          city: loc.city,
          area: loc.area || null,
          keyword_matched: keyword.label,
          business_name: details.name,
          phone: details.formatted_phone_number || details.international_phone_number || null,
          website: details.website || null,
          rating: details.rating || null,
          review_count: details.user_ratings_total || 0,
          pitch_type: pitchType,
        });

        if (error) {
          console.error(`  Failed to insert ${details.name}: ${error.message}`);
        } else {
          inserted++;
          console.log(`  + ${details.name}`);
        }
      }
    }
  }

  console.log(`\nDone. ${inserted} new leads inserted into Supabase.`);
}

run().catch(err => { console.error(err.message); process.exit(1); });
