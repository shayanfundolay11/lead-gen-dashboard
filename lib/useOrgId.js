'use client';

import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export function useOrgId() {
  const [orgId, setOrgId] = useState(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
      setOrgId(data?.organization_id || null);
    }
    load();
  }, []);

  return orgId;
}