-- Add grouping fields for streamed tokens
create extension if not exists pgcrypto;

alter table public.match_messages
  add column if not exists message_id uuid not null default gen_random_uuid(),
  add column if not exists turn int not null default 0,
  add column if not exists chunk int not null default 0,
  add column if not exists kind text not null default 'token' check (kind in ('token','final','system'));

create index if not exists match_messages_group_idx
  on public.match_messages (match_id, agent, turn, message_id, chunk);
