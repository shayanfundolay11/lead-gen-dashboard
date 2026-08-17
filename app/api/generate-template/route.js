export async function POST(req) {
  const { pitchType, channel, language, currentBody } = await req.json();
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return Response.json({ error: 'ANTHROPIC_API_KEY is not set in Vercel environment variables yet' }, { status: 500 });
  }

  const channelNote = channel === 'call' ? 'a phone call opener (spoken out loud, natural, not written)'
    : channel === 'whatsapp' ? 'a short WhatsApp message'
    : 'a short email body';
  const langNote = language === 'ur' ? 'Write it in natural, spoken Urdu (Roman Urdu is fine).' : 'Write it in English.';

  const prompt = `You write sales outreach scripts for a digital agency pitching "${pitchType}" to local businesses.
Write a NEW, DIFFERENT variation of ${channelNote} for this exact pitch type. ${langNote}
Keep it short (2-4 sentences), warm, and natural — not pushy.
Use the literal placeholders {business_name} and {industry} exactly as written wherever you'd mention the business name or their industry — do not replace them with real values.
Here is the current version for reference (write something meaningfully different in wording/opening, not a minor edit):
"""
${currentBody}
"""
Reply with ONLY the new script text, nothing else — no preamble, no quotes, no labels.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return Response.json({ error: data.error?.message || `Claude API error (${res.status})` }, { status: 500 });
    }
    const text = data.content?.[0]?.text?.trim();
    if (!text) return Response.json({ error: 'Claude returned an empty response' }, { status: 500 });
    return Response.json({ text });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}