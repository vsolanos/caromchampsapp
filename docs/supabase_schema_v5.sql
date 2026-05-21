-- CaromChamps v5.0.0 - Supabase schema
-- Ejecutar en Supabase SQL Editor antes de publicar la versión v5.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null default '',
  country_iso text not null default 'CR',
  phone_country_code text not null default '+506',
  phone_local text not null default '',
  avatar_url text not null default '',
  role text not null default 'ORGANIZER' check (role in ('ADMIN','ORGANIZER','VIEWER')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','INACTIVE','PENDING')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_app_states (
  owner_user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.championship_shares (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  championship_id text not null,
  championship_name text not null,
  snapshot jsonb not null default '{}'::jsonb,
  access_mode text not null default 'ACTIVE_USERS_WITH_LINK',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  type text not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'ADMIN'
      and p.status = 'ACTIVE'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    full_name,
    country_iso,
    phone_country_code,
    phone_local,
    avatar_url,
    role,
    status
  ) values (
    new.id,
    lower(coalesce(new.email, '')),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email, ''),
    coalesce(new.raw_user_meta_data->>'country_iso', 'CR'),
    coalesce(new.raw_user_meta_data->>'phone_country_code', '+506'),
    coalesce(new.raw_user_meta_data->>'phone_local', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', ''),
    case when lower(coalesce(new.email, '')) = 'vsolanos@gmail.com' then 'ADMIN' else 'ORGANIZER' end,
    'ACTIVE'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(nullif(excluded.full_name, ''), profiles.full_name),
    role = case when excluded.email = 'vsolanos@gmail.com' then 'ADMIN' else profiles.role end,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_app_states enable row level security;
alter table public.championship_shares enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin on public.profiles
for select using (auth.uid() = id or public.is_admin());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
for insert with check (
  auth.uid() = id
  and (role = 'ORGANIZER' or lower(email) = 'vsolanos@gmail.com')
);

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin on public.profiles
for update using (auth.uid() = id or public.is_admin())
with check (
  public.is_admin()
  or (
    auth.uid() = id
    and role = (select p.role from public.profiles p where p.id = auth.uid())
    and status = (select p.status from public.profiles p where p.id = auth.uid())
  )
);

-- User app state: each user owns one full state document; admin can read all.
drop policy if exists user_app_states_select_own_or_admin on public.user_app_states;
create policy user_app_states_select_own_or_admin on public.user_app_states
for select using (auth.uid() = owner_user_id or public.is_admin());

drop policy if exists user_app_states_insert_own on public.user_app_states;
create policy user_app_states_insert_own on public.user_app_states
for insert with check (auth.uid() = owner_user_id);

drop policy if exists user_app_states_update_own on public.user_app_states;
create policy user_app_states_update_own on public.user_app_states
for update using (auth.uid() = owner_user_id)
with check (auth.uid() = owner_user_id);

-- Shared championships: owners manage their links; any active authenticated user can read active shared links.
drop policy if exists championship_shares_select_active_users on public.championship_shares;
create policy championship_shares_select_active_users on public.championship_shares
for select using (
  is_active = true
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.status = 'ACTIVE')
);

drop policy if exists championship_shares_insert_owner on public.championship_shares;
create policy championship_shares_insert_owner on public.championship_shares
for insert with check (auth.uid() = owner_user_id);

drop policy if exists championship_shares_update_owner_or_admin on public.championship_shares;
create policy championship_shares_update_owner_or_admin on public.championship_shares
for update using (auth.uid() = owner_user_id or public.is_admin())
with check (auth.uid() = owner_user_id or public.is_admin());

-- Audit logs
drop policy if exists audit_logs_insert_own on public.audit_logs;
create policy audit_logs_insert_own on public.audit_logs
for insert with check (auth.uid() = user_id or public.is_admin());

drop policy if exists audit_logs_select_own_or_admin on public.audit_logs;
create policy audit_logs_select_own_or_admin on public.audit_logs
for select using (auth.uid() = user_id or public.is_admin());

-- Storage bucket for avatars. Run after Storage is available in the project.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-avatars', 'user-avatars', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects
for select using (bucket_id = 'user-avatars');

drop policy if exists avatars_insert_own_folder on storage.objects;
create policy avatars_insert_own_folder on storage.objects
for insert with check (
  bucket_id = 'user-avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists avatars_update_own_folder on storage.objects;
create policy avatars_update_own_folder on storage.objects
for update using (
  bucket_id = 'user-avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists avatars_delete_own_folder on storage.objects;
create policy avatars_delete_own_folder on storage.objects
for delete using (
  bucket_id = 'user-avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);
