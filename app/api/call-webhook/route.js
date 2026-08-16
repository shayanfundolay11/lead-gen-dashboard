import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Twilio posts form-encoded data here when a call ends (CallStatus, CallDuration, etc)
export async function POST(req) {
  const formData = await req.formData();
  const callStatus = formData.get('CallStatus'); // completed, no-answer, busy, failed
  const duration = formData.get('CallDuration');
  const url = new URL(req.url);

  // The call row id travels through Twilio's params via the original TwiML Url query string,
  // Twilio doesn't echo it back automatically, so the voice-agent server should also update
  // outcome/transcript directly using its own Supabase connection once the conversation ends.
  // Here we just make sure the row doesn't stay stuck on "calling" if nothing else updates it.

  const mappedStatus = callStatus === 'completed' ? 'completed'
    : callStatus === 'no-answer' ? 'no_answer'
    : 'failed';

  await supabase
    .from('calls')
    .update({ status: mappedStatus, call_duration_seconds: duration ? parseInt(duration) : null })
    .eq('status', 'calling'); // best-effort fallback; voice-agent server does the precise update

  return Response.json({ received: true });
}
