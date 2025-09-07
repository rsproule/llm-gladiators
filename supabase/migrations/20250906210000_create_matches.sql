-- Create matches table for historical tracking
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  match_id text unique not null,
  status text not null default 'running' check (status in ('running', 'completed', 'error')),
  target_word text,
  winner text check (winner in ('offense', 'defense', 'tie')),
  winner_reason text,
  total_turns int not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by text, -- echo user id who started the match
  offense_agent_id uuid references public.gladiator_agents(id) on delete set null,
  defense_agent_id uuid references public.gladiator_agents(id) on delete set null
);

-- Add indexes
create index if not exists matches_match_id_idx on public.matches (match_id);
create index if not exists matches_status_idx on public.matches (status);
create index if not exists matches_created_by_idx on public.matches (created_by);
create index if not exists matches_started_at_idx on public.matches (started_at);

-- Enable RLS
alter table public.matches enable row level security;

-- RLS Policies - matches are public for viewing
create policy "Anyone can view completed matches" 
  on public.matches 
  for select 
  using (status = 'completed');

create policy "Users can view their own matches" 
  on public.matches 
  for select 
  using (created_by = current_setting('app.current_user_id', true));

create policy "System can insert matches" 
  on public.matches 
  for insert 
  with check (true);

create policy "System can update matches" 
  on public.matches 
  for update 
  using (true);

-- Function to update completed_at timestamp
create or replace function update_match_completed_at()
returns trigger as $$
begin
  if new.status = 'completed' and old.status != 'completed' then
    new.completed_at = now();
  end if;
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update completed_at
create trigger update_match_completed_at
  before update on public.matches
  for each row
  execute function update_match_completed_at();
