import { createClient } from '@supabase/supabase-js';

// API routes get a fresh anon-key client by default, with no logged-in user context —
// RLS policies checking auth.uid() would see NULL and block everything. This helper
// takes the access token the browser sends and attaches it, so the request is treated
// as that logged-in user (and RLS correctly scopes it to their organization).
export function getUserScopedClient(req) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: token ? { Authorization: Bearer ${token} } : {} },
  });
}

export async function getProfile(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select(', organizations()').eq('id', user.id).single();
  return profile;
}