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

// POST /api/recently-played (Upsert)
const saveProgress = async (req, res) => {
    try {
        const supabase = getAuthenticatedClient(req);
        const userId = req.user.id;
        const { id, type, position } = req.body; // id is trackId or episodeId

        if (!id || !type) return res.status(400).json({ error: "Missing id or type" });

        const isMusic = type === 'music';
        const payload = {
            user_id: userId,
            content_type: type,
            last_position: position || 0,
            played_at: new Date().toISOString(),
            track_id: isMusic ? id : null,
            episode_id: !isMusic ? id : null
        };

        // Upsert based on unique constraints
        const { data, error } = await supabase
            .from('recently_played')
            .upsert(payload, {
                onConflict: isMusic ? 'user_id, track_id' : 'user_id, episode_id'
            })
            .select();

        if (error) throw error;
        res.json({ message: "Progress saved", data });
    } catch (error) {
        console.error("Save Progress Error:", error);
        res.status(500).json({ error: error.message });
    }
};

// GET /api/recently-played (Fetch History)
const getRecentlyPlayed = async (req, res) => {
    try {
        const supabase = getAuthenticatedClient(req);
        const userId = req.user.id;

        const { data, error } = await supabase
            .from('recently_played')
            .select(`
                *,
                songs:track_id (*),
                episodes:episode_id (*)
            `)
            .eq('user_id', userId)
            .order('played_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        // Normalize response
        const formatted = data.map(item => {
            const isMusic = item.content_type === 'music';
            const details = isMusic ? item.songs : item.episodes;
            return {
                history_id: item.id,
                type: item.content_type,
                last_position: item.last_position,
                played_at: item.played_at,
                // Spread details but keep flat structure for easy frontend consumption
                ...details
            };
        }).filter(item => item.id); // Filter out if joined content was deleted

        res.json(formatted);
    } catch (error) {
        console.error("Fetch History Error:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { saveProgress, getRecentlyPlayed };
