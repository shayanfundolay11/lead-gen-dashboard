-- Run in Supabase SQL Editor

alter table leads add column if not exists status text default 'new'
  check (status in ('new', 'contacted', 'meeting_fixed', 'closed', 'not_interested'));
alter table leads add column if not exists next_action_at timestamptz;
