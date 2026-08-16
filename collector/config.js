module.exports = {
  GOOGLE_API_KEY: process.env.GOOGLE_API_KEY || 'PASTE_YOUR_GOOGLE_PLACES_KEY',
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ohypfsgjjmhgfzbafiyg.supabase.co',
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'PASTE_YOUR_SUPABASE_ANON_KEY',

  // Add as many countries/cities as you want. See countries.js for the full name list.
  locations: [
    { country: 'Pakistan', city: 'Lahore', area: '', radiusKm: 10 },
    { country: 'Qatar', city: 'Doha', area: '', radiusKm: 10 },
  ],

  // Mix catalog ids (see keywords.js) with your own free-text "Other" keywords
  selectedKeywords: [
    'website_development',
    'seo',
    'social_media_marketing',
  ],

  reach: {
    maxReviewCount: 15,
  },

  maxResultsPerKeyword: 20,
};
