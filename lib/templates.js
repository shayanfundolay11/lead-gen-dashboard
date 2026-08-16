export function applyTemplate(body, lead) {
  if (!body) return '';
  return body
    .replaceAll('{business_name}', lead.business_name || '')
    .replaceAll('{industry}', (lead.keyword_matched || 'business').toLowerCase());
}