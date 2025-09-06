create table if not exists public.match_messages (
  id bigserial primary key,
  match_id text not null,
  agent text not null,
  seq bigint not null,
  token text not null,
  created_at timestamptz not null default now()
);

create index if not exists match_messages_match_seq_idx on public.match_messages (match_id, seq);

alter table public.match_messages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'match_messages' and policyname = 'read_public'
  ) then
    create policy read_public on public.match_messages
      for select to anon using (true);
  end if;
end $$;
