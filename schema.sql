-- ==============================================================================
-- StreamLite Database Schema (Supabase / PostgreSQL)
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ==========================================
-- 1. PROFILES (RBAC Core)
-- ==========================================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- MIGRATION: Ensure 'role' column exists and has constraint if table already existed
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name = 'profiles' and column_name = 'role') then
        alter table public.profiles add column role text not null default 'user' check (role in ('user', 'admin'));
    end if;
end $$;

-- Trigger: Automatically create a 'user' profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url',
    'user'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Re-create trigger to ensures it's up to date
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==========================================
-- 2. CONTENT TABLES (Songs, Podcasts)
-- ==========================================
create table if not exists public.songs (
  id bigint primary key generated always as identity,
  title text not null,
  artist text not null,
  album text,
  category text, 
  song_url text not null,
  image_url text, 
  duration integer, 
  plays bigint default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.podcasts (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  publisher text,
  description text,
  image_url text,
  category text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists public.episodes (
  id uuid default uuid_generate_v4() primary key,
  podcast_id uuid references public.podcasts(id) on delete cascade not null,
  title text not null,
  description text,
  duration text, 
  audio_url text not null,
  plays bigint default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- 3. USER DATA TABLES (Playlists, Favorites)
-- ==========================================
create table if not exists public.playlists (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null, 
  name text not null,
  description text,
  is_public boolean default false,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- MIGRATION: Ensure 'is_public' exists (Fixes the ERROR: 42703)
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name = 'playlists' and column_name = 'is_public') then
        alter table public.playlists add column is_public boolean default false;
    end if;
end $$;


create table if not exists public.playlist_tracks (
  id uuid default uuid_generate_v4() primary key,
  playlist_id uuid references public.playlists(id) on delete cascade not null,
  track_id text not null, 
  source text default 'local', 
  external_data jsonb, 
  added_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(playlist_id, track_id) 
);

-- MIGRATION: Ensure new columns exist for playlist_tracks
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name = 'playlist_tracks' and column_name = 'source') then
        alter table public.playlist_tracks add column source text default 'local';
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'playlist_tracks' and column_name = 'external_data') then
        alter table public.playlist_tracks add column external_data jsonb;
    end if;
    -- Migrate track_id to text if it was bigint (Safe for IDs)
    -- alter table public.playlist_tracks alter column track_id type text; 
end $$;

create table if not exists public.favorites (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  song_id text not null,
  source text default 'local',
  external_data jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, song_id)
);

-- MIGRATION: Favorites updates
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name = 'favorites' and column_name = 'source') then
        alter table public.favorites add column source text default 'local';
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'favorites' and column_name = 'external_data') then
        alter table public.favorites add column external_data jsonb;
    end if;
    -- Ensure song_id is text to compatible with Spotify IDs
    -- alter table public.favorites alter column song_id type text;
end $$;

create table if not exists public.recently_played (
  id bigint generated by default as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  track_id text, 
  source text default 'local',
  external_data jsonb,
  played_at timestamp with time zone default now()
);

-- MIGRATION: Recently Played updates
do $$ 
begin
    if not exists (select 1 from information_schema.columns where table_name = 'recently_played' and column_name = 'source') then
        alter table public.recently_played add column source text default 'local';
    end if;
    if not exists (select 1 from information_schema.columns where table_name = 'recently_played' and column_name = 'external_data') then
        alter table public.recently_played add column external_data jsonb;
    end if;
    -- alter table public.recently_played alter column track_id type text;
end $$;

-- ==========================================
-- 4. ROW LEVEL SECURITY (Strict Policies)
-- ==========================================

-- NOTE: We drop existing policies to ensure clean application of new ones
drop policy if exists "Public view profiles" on profiles;
drop policy if exists "User update own profile" on profiles;
drop policy if exists "Public view songs" on songs;
drop policy if exists "Admins manage songs" on songs;
drop policy if exists "Public view podcasts" on podcasts;
drop policy if exists "Admins manage podcasts" on podcasts;
drop policy if exists "Public view episodes" on episodes;
drop policy if exists "Admins manage episodes" on episodes;
drop policy if exists "View own or public playlists" on playlists;
drop policy if exists "Manage own playlists" on playlists;
drop policy if exists "View playlist tracks" on playlist_tracks;
drop policy if exists "Manage playlist tracks" on playlist_tracks;
drop policy if exists "Manage own favorites" on favorites;
drop policy if exists "Manage own history" on recently_played;


-- PROFILES: Public read, User update own
alter table profiles enable row level security;
create policy "Public view profiles" on profiles for select using (true);
create policy "User update own profile" on profiles for update using (auth.uid() = id);

-- CONTENT (Songs/Podcasts): Public Read, Admin Write
alter table songs enable row level security;
create policy "Public view songs" on songs for select using (true);
create policy "Admins manage songs" on songs for all using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

alter table podcasts enable row level security;
create policy "Public view podcasts" on podcasts for select using (true);
create policy "Admins manage podcasts" on podcasts for all using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

alter table episodes enable row level security;
create policy "Public view episodes" on episodes for select using (true);
create policy "Admins manage episodes" on episodes for all using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid() and profiles.role = 'admin'
  )
);

-- USER DATA: Owner Access Only
alter table playlists enable row level security;
create policy "View own or public playlists" on playlists for select using (auth.uid() = user_id or is_public = true);
create policy "Manage own playlists" on playlists for all using (auth.uid() = user_id);

alter table playlist_tracks enable row level security;
create policy "View playlist tracks" on playlist_tracks for select using (
  exists (select 1 from playlists p where p.id = playlist_tracks.playlist_id and (p.user_id = auth.uid() or p.is_public = true))
);
create policy "Manage playlist tracks" on playlist_tracks for all using (
  exists (select 1 from playlists p where p.id = playlist_tracks.playlist_id and p.user_id = auth.uid())
);

alter table favorites enable row level security;
create policy "Manage own favorites" on favorites for all using (auth.uid() = user_id);

alter table recently_played enable row level security;
create policy "Manage own history" on recently_played for all using (auth.uid() = user_id);
