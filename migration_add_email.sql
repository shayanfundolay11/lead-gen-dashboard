-- Run this in Supabase SQL Editor (New query > paste > Run)
-- Adds email support to the existing leads table

alter table leads add column if not exists email text;
