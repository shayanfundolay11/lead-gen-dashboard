import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function originOf(url) {
  try { return new URL(url).origin; } catch { return null; }
}

async function urlExists(url) {
  try {
    const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(4000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function checkOnPageSignals(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const html = await res.text();

    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i);
    const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
    const hasOgTitle = /<meta[^>]+property=["']og:title["']/i.test(html);
    const hasOgImage = /<meta[^>]+property=["']og:image["']/i.test(html);

    const h1Matches = html.match(/<h1[\s>]/gi) || [];
    const h1Count = h1Matches.length;

    const imgTags = html.match(/<img[^>]*>/gi) || [];
    const imgsWithAlt = imgTags.filter(tag => /alt=["'][^"']+["']/i.test(tag)).length;
    const imgAltRatio = imgTags.length > 0 ? Math.round((imgsWithAlt / imgTags.length) * 100) : null;

    const titleText = titleMatch ? titleMatch[1].trim() : null;
    const metaDescText = metaDescMatch ? metaDescMatch[1].trim() : null;

    const origin = originOf(url);
    const [hasSitemap, hasRobots] = origin ? await Promise.all([
      urlExists(`${origin}/sitemap.xml`),
      urlExists(`${origin}/robots.txt`),
    ]) : [false, false];

    return {
      reachable: true,
      hasTitle: Boolean(titleText),
      titleText,
      titleLengthOk: titleText ? titleText.length >= 30 && titleText.length <= 65 : false,
      hasMetaDescription: Boolean(metaDescText),
      metaDescriptionText: metaDescText,
      metaDescriptionLengthOk: metaDescText ? metaDescText.length >= 70 && metaDescText.length <= 165 : false,
      hasViewport,
      isHttps: url.startsWith('https://'),
      hasH1: h1Count > 0,
      h1Count,
      hasOpenGraph: hasOgTitle && hasOgImage,
      imgAltRatio,
      hasSitemap,
      hasRobots,
    };
  } catch {
    return { reachable: false, isHttps: url.startsWith('https://') };
  }
}

async function checkPageSpeed(url, apiKey) {
  try {
    const params = new URLSearchParams({ url, key: apiKey, strategy: 'mobile', category: 'performance' });
    const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`, { signal: AbortSignal.timeout(20000) });
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