const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

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
        const userId = req.user.id;

        const { data: playlist, error: plError } = await supabase
            .from('playlists')
            .select('*')
            .eq('id', id)
            .single();

        if (plError || !playlist) return res.status(404).json({ error: "Playlist not found" });

        // Fetch Tracks (Join)
        const { data: tracksData, error: tracksError } = await supabase
            .from('playlist_tracks')
            .select(`
                track_id,
                songs:track_id (*)
            `)
            .eq('playlist_id', id);

        if (tracksError) throw tracksError;

        const tracks = tracksData.map(item => item.songs).filter(Boolean);

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
        const { trackId } = req.body;

        if (!trackId) return res.status(400).json({ error: "Track ID is required" });

        // Verify Ownership (still good to explicitly check, even with RLS, for clearer error messages)
        const { data: playlist } = await supabase
            .from('playlists')
            .select('user_id')
            .eq('id', id)
            .single();

        if (!playlist) return res.status(404).json({ error: "Playlist not found" });
        // RLS should prevent access if not owner, but this provides a more specific error
        if (playlist.user_id !== req.user.id) return res.status(403).json({ error: "Unauthorized to modify this playlist" });

        // Check Duplicate
        const { data: existing } = await supabase
            .from('playlist_tracks')
            .select('*')
            .eq('playlist_id', id)
            .eq('track_id', trackId)
            .single();

        if (existing) return res.status(400).json({ error: "Track already in playlist" });

        // Add
        const { data, error } = await supabase
            .from('playlist_tracks')
            .insert([{ playlist_id: id, track_id: trackId }])
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

        // Verify Ownership (still good to explicitly check, even with RLS, for clearer error messages)
        const { data: playlist } = await supabase
            .from('playlists')
            .select('user_id')
            .eq('id', id)
            .single();

        if (!playlist) return res.status(404).json({ error: "Playlist not found" });
        // RLS should prevent access if not owner, but this provides a more specific error
        if (playlist.user_id !== req.user.id) return res.status(403).json({ error: "Unauthorized to modify this playlist" });

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
