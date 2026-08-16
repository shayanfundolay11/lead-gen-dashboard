# Lead gen system — full setup guide

Three separate pieces, deployed separately:

1. **Dashboard** (`lead-gen-dashboard/`) — the live website with tabs, deployed on Vercel
2. **Collector** (`lead-gen-dashboard/collector/`) — pulls Google Maps leads into Supabase, run manually or on a schedule
3. **Voice agent server** (`voice-agent-server/`) — handles the actual AI phone calls, deployed on Render (needs a persistent server, Vercel can't run this part)

## Honest caveats before you start

- **Calling always costs money per minute** — Twilio, or any provider, charges for the call itself. Free trial credit lets you test for free, but there is no permanent free tier for real phone calls anywhere.
- **Urdu voice quality is not guaranteed yet.** Deepgram (speech-to-text) and ElevenLabs (text-to-speech) both claim multilingual support, but neither is tested here — I don't have network access to actually place a test call from this environment. You will need to run a real test call and listen to how well it understands and speaks Urdu, then we adjust from there.
- This is a **first working draft** of the calling layer, not a polished product. Expect to debug real issues (audio quality, latency, edge cases) once you make your first live test call.

---

## Part 1 — Dashboard (Supabase already done)

You already ran `schema.sql` in Supabase (if not: Supabase dashboard > SQL Editor > paste `schema.sql` > Run).

1. Get your Supabase `anon public` key: Project Settings > API
2. In `lead-gen-dashboard/`, copy `.env.local.example` to `.env.local` and fill in the Supabase URL + anon key
3. Push this folder to a new GitHub repo
4. On vercel.com: "Add New Project" > import that repo > it auto-detects Next.js
5. Under Vercel project settings > Environment Variables, add the same values from `.env.local`
6. Deploy — you'll get a live URL, e.g. `https://your-project.vercel.app`

Right now the dashboard will show empty tabs (no leads yet) — that's expected until Part 2 runs.

## Part 2 — Collector (fills the Google tab)

```bash
cd lead-gen-dashboard/collector
npm install
export GOOGLE_API_KEY="your_places_api_key"
export NEXT_PUBLIC_SUPABASE_URL="https://ohypfsgjjmhgfzbafiyg.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key"
npm run collect
```

(On Windows PowerShell, use `$env:GOOGLE_API_KEY="..."` on separate lines like before.)

Edit `collector/config.js` to change countries, cities, and keywords — see `collector/countries.js` for the full country list and `collector/keywords.js` for the full keyword catalog.

Refresh the dashboard — the Google tab should now show leads.

**To automate this** (no manual re-run needed) once it's working: set up a free GitHub Actions scheduled workflow to run `npm run collect` daily. Ask me for this once Part 2 is confirmed working — it's a 15-line YAML file.

LinkedIn, Facebook, and Instagram tabs need separate collectors (each platform has different, more restricted APIs). We'll build those next once Google is confirmed working end-to-end.

## Part 3 — Voice agent (the actual AI calling)

You'll need four more accounts, all with free trial credit:

1. **Twilio** (twilio.com) — buy/verify a phone number, gives some free trial call credit
2. **Deepgram** (deepgram.com) — speech-to-text, gives $200 one-time free credit
3. **ElevenLabs** (elevenlabs.io) — text-to-speech, free tier gives 10,000 characters/month
4. **Anthropic API key** (console.anthropic.com) — powers the conversation itself, pay-as-you-go, very cheap per call

Steps:

1. Deploy `voice-agent-server/` to Render.com as a "Web Service" (connect the GitHub repo, root directory = `voice-agent-server`)
2. Add all the env vars from `.env.example` in Render's dashboard, using your real keys
3. Copy the Render URL (e.g. `https://your-app.onrender.com`)
4. In the **dashboard's** Vercel env vars, add:
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` (from Twilio)
   - `VOICE_AGENT_BASE_URL` = your Render URL
5. Redeploy the dashboard
6. Click "Call" next to any lead with a phone number — it should ring, and the AI should start talking

If something breaks on the first real call (it likely will — this is untested code), send me the error and we debug it together.

## Reporting

Once calls start happening, the dashboard automatically shows: call status (not called / calling / completed), outcome (positive / negative / callback requested / not interested), and transcript is saved in the `calls` table in Supabase (viewable directly there, or we can add a transcript view to the dashboard next).
