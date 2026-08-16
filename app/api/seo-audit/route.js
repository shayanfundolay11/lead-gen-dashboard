import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkOnPageSignals(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const html = await res.text();

    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
    const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);

    return {
      hasTitle: Boolean(titleMatch && titleMatch[1].trim()),
      titleText: titleMatch ? titleMatch[1].trim() : null,
      hasMetaDescription: Boolean(metaDescMatch && metaDescMatch[1].trim()),
      metaDescriptionText: metaDescMatch ? metaDescMatch[1].trim() : null,
      hasViewport,
      isHttps: url.startsWith('https://'),
      reachable: true,
    };
  } catch {
    return { reachable: false, hasTitle: false, hasMetaDescription: false, hasViewport: false, isHttps: url.startsWith('https://') };
  }
}

async function checkPageSpeed(url, apiKey) {
  try {
    const params = new URLSearchParams({ url, key: apiKey, strategy: 'mobile', category: 'performance' });
    const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`, { signal: AbortSignal.timeout(15000) });
    const data = await res.json();
    if (!data.lighthouseResult) return { available: false, error: data.error?.message || 'PageSpeed Insights API not enabled or query failed' };

    const score = Math.round((data.lighthouseResult.categories?.performance?.score || 0) * 100);
    const audits = data.lighthouseResult.audits || {};
    const topIssues = Object.values(audits)
      .filter(a => a.score !== null && a.score < 0.5 && a.title)
      .slice(0, 4)
      .map(a => a.title);

    return { available: true, performanceScore: score, topIssues };
  } catch (e) {
    return { available: false, error: e.message };
  }
}

export async function POST(req) {
  const { leadId } = await req.json();
  const apiKey = process.env.GOOGLE_API_KEY;

  const { data: lead } = await supabase.from('leads').select('website').eq('id', leadId).single();
  if (!lead?.website) {
    return Response.json({ error: 'This lead has no website to audit' }, { status: 400 });
  }

  const [onPage, pageSpeed] = await Promise.all([
    checkOnPageSignals(lead.website),
    checkPageSpeed(lead.website, apiKey),
  ]);

  const audit = { onPage, pageSpeed, checkedAt: new Date().toISOString() };

  await supabase.from('leads').update({ seo_audit: audit, seo_audit_at: audit.checkedAt }).eq('id', leadId);

  return Response.json({ audit });
}