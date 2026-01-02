const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

const getAuthenticatedClient = (req) => {
    const token = req.headers.authorization;
    if (!token) throw new Error("Missing Authorization Header");

    return createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: token } }
    });
};

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

const getPlaylistById = async (req, res) => {
    try {
        const supabase = getAuthenticatedClient(req);
        const { id } = req.params;

        const { data: playlist, error: plError } = await supabase
            .from('playlists')
            .select('*')
            .eq('id', id)
            .single();

        if (plError || !playlist) return res.status(404).json({ error: "Playlist not found" });

        const { data: tracksData, error: tracksError } = await supabase
            .from('playlist_tracks')
            .select('*')
            .eq('playlist_id', id);

        if (tracksError) throw tracksError;

        const localTrackIds = tracksData
            .filter(item => item.source === 'local' || !item.source)
            .map(item => item.track_id);

        let localSongsMap = {};
        if (localTrackIds.length > 0) {
            const { data: localSongs, error: songsError } = await supabase
                .from('songs')
                .select('*')
                .in('id', localTrackIds);

            if (songsError) {
                console.error("Error fetching local songs:", songsError);
            } else {
                localSongs.forEach(song => {
                    localSongsMap[song.id] = song;
                });
            }
        }

        const tracks = tracksData.map(item => {
            if (item.source === 'local' || !item.source) {
                const songDetails = localSongsMap[item.track_id];
                return songDetails ? { ...songDetails, source: 'local' } : null;
            } else {
                return {
                    id: item.track_id,
                    ...item.external_data,
                    source: item.source
                };
            }
        }).filter(Boolean);

        res.json({ ...playlist, tracks });
    } catch (error) {
        console.error("Get Playlist Error:", error);
        res.status(500).json({ error: error.message });
    }
}

const addTrackToPlaylist = async (req, res) => {
    try {
        const supabase = getAuthenticatedClient(req);
        const { id } = req.params;
        const { track } = req.body;

        if (!track || !track.id) return res.status(400).json({ error: "Track data is required" });

        const { data: playlist } = await supabase
            .from('playlists')
            .select('user_id')
            .eq('id', id)
            .single();

        if (!playlist) return res.status(404).json({ error: "Playlist not found" });
        if (playlist.user_id !== req.user.id) return res.status(403).json({ error: "Unauthorized" });

        const { data: existing } = await supabase
            .from('playlist_tracks')
            .select('*')
            .eq('playlist_id', id)
            .eq('track_id', track.id.toString())
            .single();

        if (existing) return res.status(400).json({ error: "Track already in playlist" });

        const source = track.source || 'local';
        const insertPayload = {
            playlist_id: id,
            track_id: track.id.toString(),
            source: source
        };

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
