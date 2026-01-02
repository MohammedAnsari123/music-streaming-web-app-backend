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

const getFavorites = async (req, res) => {
    try {
        const supabase = getAuthenticatedClient(req);
        const userId = req.user.id;

        const { data: favorites, error } = await supabase
            .from('favorites')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const localTrackIds = favorites
            .filter(f => !f.source || f.source === 'local')
            .map(f => f.song_id);

        let localSongsMap = {};
        if (localTrackIds.length > 0) {
            const { data: songs } = await supabase
                .from('songs')
                .select('*')
                .in('id', localTrackIds);

            if (songs) {
                songs.forEach(s => localSongsMap[s.id] = s);
            }
        }

        const formattedFavorites = favorites.map(f => {
            if (!f.source || f.source === 'local') {
                const song = localSongsMap[f.song_id];
                return song ? { ...song, source: 'local', liked_at: f.created_at } : null;
            } else {
                return {
                    id: f.song_id,
                    ...f.external_data,
                    source: f.source,
                    liked_at: f.created_at
                };
            }
        }).filter(Boolean);

        res.json(formattedFavorites);

    } catch (error) {
        console.error("Get Favorites Error:", error);
        res.status(500).json({ error: error.message });
    }
}

const toggleFavorite = async (req, res) => {
    try {
        const supabase = getAuthenticatedClient(req);
        const userId = req.user.id;
        const { track } = req.body;

        if (!track || !track.id) return res.status(400).json({ error: "Track data required" });

        const songId = track.id.toString();
        const source = track.source || 'local';

        const { data: existing } = await supabase
            .from('favorites')
            .select('id')
            .eq('user_id', userId)
            .eq('song_id', songId)
            .single();

        if (existing) {
            await supabase
                .from('favorites')
                .delete()
                .eq('id', existing.id);

            return res.json({ liked: false, message: "Removed from favorites" });
        } else {
            const payload = {
                user_id: userId,
                song_id: songId,
                source: source
            };

            if (source !== 'local') {
                payload.external_data = {
                    title: track.title,
                    artist: track.artist,
                    album: track.album,
                    image_url: track.image_url,
                    audio_url: track.audio_url,
                    duration: track.duration
                };
            }

            const { error: insertError } = await supabase
                .from('favorites')
                .insert([payload]);

            if (insertError) throw insertError;

            return res.json({ liked: true, message: "Added to favorites" });
        }

    } catch (error) {
        console.error("Toggle Favorite Error:", error);
        res.status(500).json({ error: error.message });
    }
}

const checkFavorite = async (req, res) => {
    try {
        const supabase = getAuthenticatedClient(req);
        const userId = req.user.id;
        const { id } = req.params;

        const { data } = await supabase
            .from('favorites')
            .select('id')
            .eq('user_id', userId)
            .eq('song_id', id.toString())
            .single();

        res.json({ liked: !!data });

    } catch (error) {
        res.json({ liked: false });
    }
}

module.exports = { getFavorites, toggleFavorite, checkFavorite };
