-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- SONGS TABLE (Music)
create table if not exists songs (
  id bigint primary key generated always as identity,
  title text not null,
  artist text not null,
  album text,
  category text, 
  song_url text not null,
  image_url text, 
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- PODCASTS TABLE
create table if not exists podcasts (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  publisher text,
  description text,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- EPISODES TABLE
create table if not exists episodes (
  id uuid default uuid_generate_v4() primary key,
  podcast_id uuid references podcasts(id) on delete cascade not null,
  title text not null,
  description text,
  duration text, 
  audio_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- PLAYLISTS TABLE
create table if not exists playlists (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null, 
  name text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- PLAYLIST_TRACKS TABLE
create table if not exists playlist_tracks (
  id uuid default uuid_generate_v4() primary key,
  playlist_id uuid references playlists(id) on delete cascade not null,
  track_id bigint references songs(id) on delete cascade not null,
  added_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(playlist_id, track_id) 
);

-- RECENTLY PLAYED TABLE (Day 9)
create table if not exists recently_played (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid not null,
  track_id bigint references songs(id) on delete cascade,   -- Nullable if it's a podcast
  episode_id uuid references episodes(id) on delete cascade, -- Nullable if it's a song
  content_type text not null check (content_type in ('music', 'podcast')),
  last_position numeric default 0, -- in seconds
  played_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Constraint: A row must have either track_id or episode_id
  constraint check_content_reference check (
    (content_type = 'music' and track_id is not null) or
    (content_type = 'podcast' and episode_id is not null)
  ),
  unique(user_id, track_id), -- One entry per song per user
  unique(user_id, episode_id) -- One entry per episode per user
);

-- RLS POLICIES
alter table playlists enable row level security;
alter table playlist_tracks enable row level security;
alter table recently_played enable row level security;

-- Existing policies...
create policy "Users can view own playlists" on playlists for select using (auth.uid() = user_id);
create policy "Users can insert own playlists" on playlists for insert with check (auth.uid() = user_id);
create policy "Users can delete own playlists" on playlists for delete using (auth.uid() = user_id);

create policy "Users can view tracks in their playlists" on playlist_tracks for select using (exists (select 1 from playlists where playlists.id = playlist_tracks.playlist_id and playlists.user_id = auth.uid()));
create policy "Users can add tracks to their playlists" on playlist_tracks for insert with check (exists (select 1 from playlists where playlists.id = playlist_tracks.playlist_id and playlists.user_id = auth.uid()));
create policy "Users can remove tracks from their playlists" on playlist_tracks for delete using (exists (select 1 from playlists where playlists.id = playlist_tracks.playlist_id and playlists.user_id = auth.uid()));

-- Recently Played Policies
create policy "Users can view own history" on recently_played for select using (auth.uid() = user_id);
create policy "Users can insert own history" on recently_played for insert with check (auth.uid() = user_id);
create policy "Users can update own history" on recently_played for update using (auth.uid() = user_id);

-- PUBLIC ACCESS
alter table songs enable row level security;
create policy "Public songs access" on songs for select using (true);

alter table podcasts enable row level security;
create policy "Public podcasts access" on podcasts for select using (true);

alter table episodes enable row level security;
create policy "Public episodes access" on episodes for select using (true);
