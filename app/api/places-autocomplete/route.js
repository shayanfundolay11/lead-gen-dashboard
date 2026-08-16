export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const input = searchParams.get('input');
  const types = searchParams.get('types') || '(cities)'; // '(cities)' for city search, 'geocode' for areas
  const countryCode = searchParams.get('countryCode');
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!input || input.length < 2) {
    return Response.json({ predictions: [] });
  }
  if (!apiKey) {
    return Response.json({ error: 'GOOGLE_API_KEY not set' }, { status: 500 });
  }

  const params = new URLSearchParams({ input, types, key: apiKey });
  if (countryCode) params.set('components', `country:${countryCode}`);

  const res = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`);
  const data = await res.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    return Response.json({ error: data.status, predictions: [] }, { status: 200 });
  }

  const predictions = (data.predictions || []).map(p => ({
    description: p.description,
    mainText: p.structured_formatting?.main_text || p.description,
  }));

  return Response.json({ predictions });
}
