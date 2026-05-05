-- DripDrop foundational schema with strict RLS and anti-cheat fields.
create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  email text,
  wallet_address text unique,
  referrer_id uuid references public.profiles(id),
  streak_count integer not null default 0,
  last_streak_at timestamptz,
  haptics_enabled boolean not null default true,
  sounds_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.balances (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  drip_balance numeric(20, 4) not null default 0,
  claimable_drip numeric(20, 4) not null default 0,
  total_taps bigint not null default 0,
  phase text not null default 'Drip',
  cloud_darkness integer not null default 0 check (cloud_darkness between 0 and 100),
  boost_cooldown_until timestamptz,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.upgrades (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  bucket_level integer not null default 0,
  watering_can_level integer not null default 0,
  hose_level integer not null default 0,
  pump_level integer not null default 0,
  lightning_bolt_level integer not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_id uuid not null references public.profiles(id) on delete cascade,
  reward_percent numeric(5, 2) not null default 10.00,
  created_at timestamptz not null default timezone('utc', now()),
  unique(referrer_id, referred_id)
);

create table if not exists public.tap_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tap_amount numeric(20, 4) not null,
  boost_multiplier numeric(6, 2) not null default 1,
  signature_hash text not null,
  client_timestamp timestamptz not null,
  server_timestamp timestamptz not null default timezone('utc', now()),
  ip_address inet,
  user_agent text,
  accepted boolean not null default true
);

create index if not exists tap_events_user_idx on public.tap_events(user_id, server_timestamp desc);

create table if not exists public.config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.config (key, value)
values
  ('global_launch_at', jsonb_build_object('iso', '2026-12-31T00:00:00Z')),
  ('anti_cheat', jsonb_build_object('max_taps_per_second', 5, 'cooldown_seconds', 30))
on conflict (key) do nothing;

create table if not exists public.leaderboard_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  rank integer not null,
  score numeric(20, 4) not null,
  scope text not null check (scope in ('global', 'friends')),
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists touch_profiles_updated_at on public.profiles;
create trigger touch_profiles_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists touch_balances_updated_at on public.balances;
create trigger touch_balances_updated_at
before update on public.balances
for each row execute function public.touch_updated_at();

drop trigger if exists touch_upgrades_updated_at on public.upgrades;
create trigger touch_upgrades_updated_at
before update on public.upgrades
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.balances enable row level security;
alter table public.upgrades enable row level security;
alter table public.referrals enable row level security;
alter table public.tap_events enable row level security;
alter table public.config enable row level security;
alter table public.leaderboard_snapshots enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
for insert with check (auth.uid() = id);

drop policy if exists "balances_select_own" on public.balances;
create policy "balances_select_own" on public.balances
for select using (auth.uid() = user_id);

drop policy if exists "balances_update_via_service_role_only" on public.balances;
create policy "balances_update_via_service_role_only" on public.balances
for update using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "balances_insert_own" on public.balances;
create policy "balances_insert_own" on public.balances
for insert with check (auth.uid() = user_id);

drop policy if exists "upgrades_select_own" on public.upgrades;
create policy "upgrades_select_own" on public.upgrades
for select using (auth.uid() = user_id);

drop policy if exists "upgrades_mutate_own" on public.upgrades;
create policy "upgrades_mutate_own" on public.upgrades
for all using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "tap_events_select_own" on public.tap_events;
create policy "tap_events_select_own" on public.tap_events
for select using (auth.uid() = user_id);

drop policy if exists "tap_events_insert_service_only" on public.tap_events;
create policy "tap_events_insert_service_only" on public.tap_events
for insert with check (auth.role() = 'service_role');

drop policy if exists "referrals_select_own_links" on public.referrals;
create policy "referrals_select_own_links" on public.referrals
for select using (auth.uid() = referrer_id or auth.uid() = referred_id);

drop policy if exists "referrals_insert_own" on public.referrals;
create policy "referrals_insert_own" on public.referrals
for insert with check (auth.uid() = referrer_id or auth.uid() = referred_id);

drop policy if exists "config_select_public" on public.config;
create policy "config_select_public" on public.config
for select using (true);

drop policy if exists "leaderboard_select_all" on public.leaderboard_snapshots;
create policy "leaderboard_select_all" on public.leaderboard_snapshots
for select using (true);
