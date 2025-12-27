-- Recreate Recently Played table to support External Tracks and unify ID types

DROP TABLE IF EXISTS recently_played;

CREATE TABLE recently_played (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  
  content_id text not null, -- Stores song.id (as text), episode.id, or external ID
  content_type text not null check (content_type in ('music', 'podcast')),
  source text default 'local', -- 'local', 'spotify', 'audius'
  external_data jsonb, -- Metadata snapshot for external items
  
  last_position numeric default 0,
  played_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  unique(user_id, content_id)
);

-- Enable RLS
ALTER TABLE recently_played ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users view own history" ON recently_played FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own history" ON recently_played FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own history" ON recently_played FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own history" ON recently_played FOR DELETE USING (auth.uid() = user_id);
