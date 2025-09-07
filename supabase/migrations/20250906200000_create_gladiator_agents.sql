-- Create gladiator_agents table
create table if not exists public.gladiator_agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  system_prompt text not null,
  image_url text,
  echo_user_id text not null,
  echo_api_key text not null,
  model text not null default 'gpt-4o',
  provider text not null default 'openai',
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add indexes
create index if not exists gladiator_agents_echo_user_id_idx on public.gladiator_agents (echo_user_id);
create index if not exists gladiator_agents_public_idx on public.gladiator_agents (is_public) where is_public = true;
create index if not exists gladiator_agents_created_at_idx on public.gladiator_agents (created_at);

-- Enable RLS
alter table public.gladiator_agents enable row level security;

-- RLS Policies
create policy "Users can view their own gladiators" 
  on public.gladiator_agents 
  for select 
  using (echo_user_id = current_setting('app.current_user_id', true));

create policy "Users can view public gladiators" 
  on public.gladiator_agents 
  for select 
  using (is_public = true);

create policy "Users can create their own gladiators" 
  on public.gladiator_agents 
  for insert 
  with check (echo_user_id = current_setting('app.current_user_id', true));

create policy "Users can update their own gladiators" 
  on public.gladiator_agents 
  for update 
  using (echo_user_id = current_setting('app.current_user_id', true))
  with check (echo_user_id = current_setting('app.current_user_id', true));

create policy "Users can delete their own gladiators" 
  on public.gladiator_agents 
  for delete 
  using (echo_user_id = current_setting('app.current_user_id', true));

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to auto-update updated_at
create trigger update_gladiator_agents_updated_at
  before update on public.gladiator_agents
  for each row
  execute function update_updated_at_column();
