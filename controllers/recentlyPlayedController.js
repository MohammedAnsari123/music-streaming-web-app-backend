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

const saveProgress = async (req, res) => {
    try {
        const supabase = getAuthenticatedClient(req);
        const userId = req.user.id;
        const { id, type, position, track } = req.body;

        if (!id || !type) return res.status(400).json({ error: "Missing id or type" });

        const contentId = id.toString();
        const source = (track && track.source) ? track.source : 'local';

        const payload = {
            user_id: userId,
            content_id: contentId,
            content_type: type,
            source: source,
            last_position: position || 0,
            played_at: new Date().toISOString()
        };

        if (source !== 'local' && track) {
            payload.external_data = {
                title: track.title,
                artist: track.artist,
                album: track.album,
                image_url: track.image_url,
                audio_url: track.audio_url,
                duration: track.duration
            };
        }

        const { data, error } = await supabase
            .from('recently_played')
            .upsert(payload, {
                onConflict: 'user_id, content_id'
            })
            .select();

        if (error) throw error;
        res.json({ message: "Progress saved", data });
    } catch (error) {
        console.error("Save Progress Error:", error);
        res.status(500).json({ error: error.message });
    }
};

const getRecentlyPlayed = async (req, res) => {
    try {
        const supabase = getAuthenticatedClient(req);
        const userId = req.user.id;

        const { data: history, error } = await supabase
            .from('recently_played')
            .select('*')
            .eq('user_id', userId)
            .order('played_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        const localSongIds = history
            .filter(h => h.source === 'local' && h.content_type === 'music')
            .map(h => h.content_id);

        const localEpisodeIds = history
            .filter(h => h.source === 'local' && h.content_type === 'podcast')
            .map(h => h.content_id);

        let songsMap = {};
        let episodesMap = {};

        if (localSongIds.length > 0) {
            const { data: songs } = await supabase
                .from('songs')
                .select('*')
                .in('id', localSongIds);
            songs?.forEach(s => songsMap[s.id] = s);
        }

        if (localEpisodeIds.length > 0) {
            const { data: episodes } = await supabase
                .from('episodes')
                .select('*')
                .in('id', localEpisodeIds);
            episodes?.forEach(e => episodesMap[e.id] = e);
        }

        const formatted = history.map(item => {
            let details = {};

            if (item.source === 'local') {
                if (item.content_type === 'music') {
                    details = songsMap[item.content_id];
                } else {
                    details = episodesMap[item.content_id];
                }
                if (!details) return null;
            } else {
                details = {
                    id: item.content_id,
                    ...item.external_data
                };
            }

            return {
                ...details,
                history_id: item.id,
                type: item.content_type,
                last_position: item.last_position,
                played_at: item.played_at,
                source: item.source
            };
        }).filter(Boolean);

        res.json(formatted);
    } catch (error) {
        console.error("Fetch History Error:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { saveProgress, getRecentlyPlayed };
