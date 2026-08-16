import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client (safe to use service-level logic here, this file never runs in the browser)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(req) {
  const { leadId, phone } = await req.json();

  if (!phone) {
    return Response.json({ error: 'This lead has no phone number' }, { status: 400 });
  }
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    return Response.json({ error: 'Twilio is not configured yet (Part 3 of setup) — add TWILIO_* env vars first' }, { status: 500 });
  }
  if (!process.env.VOICE_AGENT_BASE_URL) {
    return Response.json({ error: 'Voice agent server URL is not configured yet (Part 3 of setup)' }, { status: 500 });
  }

  // Create the call row first so the dashboard shows "Calling..." immediately
  const { data: callRow, error: callInsertError } = await supabase
    .from('calls')
    .insert({ lead_id: leadId, status: 'calling', called_at: new Date().toISOString() })
    .select()
    .single();

  if (callInsertError) {
    return Response.json({ error: callInsertError.message }, { status: 500 });
  }

  // Ask Twilio to place the call. Twilio will then request TwiML from the voice-agent
  // server, which connects the call to a live media stream for the AI conversation.
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Calls.json`;
  const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');

  const params = new URLSearchParams({
    To: phone,
    From: process.env.TWILIO_PHONE_NUMBER,
    Url: `${process.env.VOICE_AGENT_BASE_URL}/twiml?callRowId=${callRow.id}&leadId=${leadId}`,
    StatusCallback: `${req.nextUrl.origin}/api/call-webhook`,
    StatusCallbackEvent: 'completed',
  });

  try {
    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const twilioData = await twilioRes.json();

    if (!twilioRes.ok) {
      await supabase.from('calls').update({ status: 'failed' }).eq('id', callRow.id);
      return Response.json({ error: twilioData.message || 'Twilio call failed' }, { status: 500 });
    }

    return Response.json({ success: true, callSid: twilioData.sid, callRowId: callRow.id });
  } catch (e) {
    await supabase.from('calls').update({ status: 'failed' }).eq('id', callRow.id);
    return Response.json({ error: e.message }, { status: 500 });
  }
}
