const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

// Helper to get a user-scoped Supabase client
const getAuthenticatedClient = (req) => {
    const token = req.headers.authorization;
    if (!token) throw new Error("Missing Authorization Header");

    return createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: token } }
    });
};

// GET /api/playlists (My Playlists)
const getUserPlaylists = async (req, res) => {
    try {
        const supabase = getAuthenticatedClient(req);
        const userId = req.user.id;

        const { data, error } = await supabase
            .from('playlists')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Error in getUserPlaylists:", error);
        res.status(500).json({ error: error.message });
    }
}

// POST /api/playlists (Create)
const createPlaylist = async (req, res) => {
    try {
        const supabase = getAuthenticatedClient(req);
        const { name, description } = req.body;
        const userId = req.user.id;

        if (!name) return res.status(400).json({ error: "Name is required" });

        const { data, error } = await supabase
            .from('playlists')
            .insert([{ name, description, user_id: userId }])
            .select()
            .single();

        if (error) {
            console.error("Supabase Create Playlist Error:", error);
            throw error;
        }
        res.status(201).json(data);
    } catch (error) {
        console.error("Create Playlist Error:", error);
        res.status(500).json({ error: error.message });
    }
}

// GET /api/playlists/:id (Details + Tracks)
const getPlaylistById = async (req, res) => {
    try {
        const supabase = getAuthenticatedClient(req);
        const { id } = req.params;

        // 1. Get Playlist Details
        const { data: playlist, error: plError } = await supabase
            .from('playlists')
            .select('*')
            .eq('id', id)
            .single();

        if (plError || !playlist) return res.status(404).json({ error: "Playlist not found" });

        // 2. Fetch Playlist Items (Raw) - No Join yet
        // We select all columns to get track_id, source, and external_data
        const { data: tracksData, error: tracksError } = await supabase
            .from('playlist_tracks')
            .select('*')
            .eq('playlist_id', id);

        if (tracksError) throw tracksError;

        // 3. Separate Local vs External
        // If source is missing or 'local', we treat it as a local song ID
        const localTrackIds = tracksData
            .filter(item => item.source === 'local' || !item.source)
            .map(item => item.track_id);

        // 4. Fetch Local Song Details (Manual Join)
        let localSongsMap = {};
        if (localTrackIds.length > 0) {
            const { data: localSongs, error: songsError } = await supabase
                .from('songs')
                .select('*')
                .in('id', localTrackIds);

            if (songsError) {
                console.error("Error fetching local songs:", songsError);
            } else {
                // Create lookup map
                localSongs.forEach(song => {
                    localSongsMap[song.id] = song;
                });
            }
        }

        // 5. Merge Data
        const tracks = tracksData.map(item => {
            if (item.source === 'local' || !item.source) {
                // Return local song details + source
                const songDetails = localSongsMap[item.track_id];
                return songDetails ? { ...songDetails, source: 'local' } : null; // Filter out if deleted/not found
            } else {
                // External: Use stored JSON
                // We return a normalized track object
                return {
                    id: item.track_id,
                    ...item.external_data,
                    source: item.source
                };
            }
        }).filter(Boolean); // Remove nulls

        res.json({ ...playlist, tracks });
    } catch (error) {
        console.error("Get Playlist Error:", error);
        res.status(500).json({ error: error.message });
    }
}

// POST /api/playlists/:id/tracks (Add Track)
const addTrackToPlaylist = async (req, res) => {
    try {
        const supabase = getAuthenticatedClient(req);
        const { id } = req.params; // playlistId
        const { track } = req.body; // Expect full track object now

        if (!track || !track.id) return res.status(400).json({ error: "Track data is required" });

        // Verify Ownership
        const { data: playlist } = await supabase
            .from('playlists')
            .select('user_id')
            .eq('id', id)
            .single();

        if (!playlist) return res.status(404).json({ error: "Playlist not found" });
        if (playlist.user_id !== req.user.id) return res.status(403).json({ error: "Unauthorized" });

        // Check Duplicate
        // Note: track.id might be string (Spotify) or number (Supabase). Database col should be text.
        const { data: existing } = await supabase
            .from('playlist_tracks')
            .select('*')
            .eq('playlist_id', id)
            .eq('track_id', track.id.toString())
            .single();

        if (existing) return res.status(400).json({ error: "Track already in playlist" });

        // Prepare Insert Data
        const source = track.source || 'local';
        const insertPayload = {
            playlist_id: id,
            track_id: track.id.toString(), // Ensure string
            source: source
        };

        // If external, store metadata snapshot
        if (source !== 'local') {
            insertPayload.external_data = {
                title: track.title,
                artist: track.artist,
                album: track.album,
                image_url: track.image_url,
                audio_url: track.audio_url,
                duration: track.duration
            };
        }

        const { data, error } = await supabase
            .from('playlist_tracks')
            .insert([insertPayload])
            .select();

        if (error) throw error;
        res.status(201).json({ message: "Track added", data });

    } catch (error) {
        console.error("Add Track Error:", error);
        res.status(500).json({ error: error.message });
    }
}

// DELETE /api/playlists/:id/tracks/:trackId (Remove Track)
const removeTrackFromPlaylist = async (req, res) => {
    try {
        const supabase = getAuthenticatedClient(req);
        const { id, trackId } = req.params;

        const { data: playlist } = await supabase
            .from('playlists')
            .select('user_id')
            .eq('id', id)
            .single();

        if (!playlist) return res.status(404).json({ error: "Playlist not found" });
        if (playlist.user_id !== req.user.id) return res.status(403).json({ error: "Unauthorized" });

        const { error } = await supabase
            .from('playlist_tracks')
            .delete()
            .eq('playlist_id', id)
            .eq('track_id', trackId);

        if (error) throw error;

        res.json({ message: "Track removed from playlist" });
    } catch (error) {
        console.error("Remove Track Error:", error);
        res.status(500).json({ error: error.message });
    }
}

module.exports = {
    getUserPlaylists,
    createPlaylist,
    getPlaylistById,
    addTrackToPlaylist,
    removeTrackFromPlaylist
};
