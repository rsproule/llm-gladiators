-- Add creator_name column to gladiator_agents table
alter table public.gladiator_agents 
  add column if not exists creator_name text;

-- Add index for creator_name
create index if not exists gladiator_agents_creator_name_idx on public.gladiator_agents (creator_name);
