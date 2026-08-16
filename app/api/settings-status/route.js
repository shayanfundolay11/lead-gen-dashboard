export async function GET() {
  return Response.json({
    google_places: Boolean(process.env.GOOGLE_API_KEY),
    supabase: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    twilio: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER),
    voice_agent: Boolean(process.env.VOICE_AGENT_BASE_URL),
  });
}