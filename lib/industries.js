// Industries to search for. This is what decides WHO shows up (a restaurant search
// returns restaurants, not SEO agencies). What we PITCH them (website / SEO / social
// media) is decided separately, automatically, from each business's website + review data.

const INDUSTRIES = [
  { id: 'restaurant', label: 'Restaurant', searchTerm: 'restaurants' },
  { id: 'real_estate', label: 'Real Estate', searchTerm: 'real estate agencies' },
  { id: 'oil_gas', label: 'Oil & Gas', searchTerm: 'oil and gas companies' },
  { id: 'fmcg', label: 'FMCG', searchTerm: 'FMCG companies' },
  { id: 'medical_pharma', label: 'Medical & Pharma', searchTerm: 'clinics and pharmacies' },
  { id: 'retail', label: 'Retail & Shopping', searchTerm: 'retail stores' },
  { id: 'education', label: 'Education', searchTerm: 'schools and educational institutes' },
  { id: 'construction', label: 'Construction', searchTerm: 'construction companies' },
  { id: 'hospitality', label: 'Hotels & Hospitality', searchTerm: 'hotels' },
  { id: 'automotive', label: 'Automotive', searchTerm: 'car dealerships and auto workshops' },
  { id: 'beauty_salon', label: 'Beauty & Salon', searchTerm: 'salons and spas' },
  { id: 'fitness_gym', label: 'Fitness & Gym', searchTerm: 'gyms and fitness centers' },
  { id: 'legal', label: 'Legal Services', searchTerm: 'law firms' },
  { id: 'finance', label: 'Finance & Banking', searchTerm: 'banks and financial services' },
  { id: 'logistics', label: 'Logistics & Shipping', searchTerm: 'logistics and shipping companies' },
  { id: 'manufacturing', label: 'Manufacturing', searchTerm: 'manufacturing companies' },
  { id: 'fashion', label: 'Fashion & Apparel', searchTerm: 'clothing and fashion stores' },
  { id: 'home_services', label: 'Home Services', searchTerm: 'plumbers electricians and home contractors' },
  { id: 'events', label: 'Events & Weddings', searchTerm: 'event planners and wedding services' },
  { id: 'agencies', label: 'Software / Digital Agencies', searchTerm: 'software and digital agencies' },
];

export function resolveIndustry(idOrText) {
  const found = INDUSTRIES.find(i => i.id === idOrText || i.label.toLowerCase() === String(idOrText).toLowerCase());
  if (found) return found;
  return { id: `custom_${idOrText}`, label: idOrText, searchTerm: idOrText }; // "Other" free-text industry
}

export { INDUSTRIES };
