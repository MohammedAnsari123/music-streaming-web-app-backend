const globalSupabase = require('../config/supabaseClient');
const { createClient } = require("@supabase/supabase-js");

// Helper to get Auth Client
const getAuthClient = (req) => {
    const token = req.headers.authorization;
    if (!token) return globalSupabase; // Fallback to anonymous if no token (will fail RLS)

    return createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_KEY, {
        global: { headers: { Authorization: token } }
    });
}

const getAllPodcasts = async (req, res) => {
    try {
        const { data, error } = await globalSupabase
            .from('podcasts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Get All Podcasts Error:", error);
        res.status(500).json({ error: error.message });
    }
}

const getPodcastById = async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await globalSupabase
            .from('podcasts')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: "Podcast not found" });

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const getPodcastEpisodes = async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await globalSupabase
            .from('episodes')
            .select('*')
            .eq('podcast_id', id);

        if (error) {
            console.error("Episode fetch error:", error);
            return res.json([]);
        }
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

// POST /api/admin/podcasts
const addPodcast = async (req, res) => {
    try {
        const authSupabase = getAuthClient(req);

        const { title, publisher, description } = req.body;
        const imageFile = req.files['image'] ? req.files['image'][0] : null;

        if (!title || !description || !imageFile) {
            return res.status(400).json({ error: "Missing required fields (title, desc, image)" });
        }

        // Upload Image
        const imagePath = `podcasts/${Date.now()}_${imageFile.originalname}`;
        const { error: uploadError } = await authSupabase.storage.from('images').upload(imagePath, imageFile.buffer, {
            contentType: imageFile.mimetype
        });
        if (uploadError) throw uploadError;

        const imageUrl = authSupabase.storage.from('images').getPublicUrl(imagePath).data.publicUrl;

        // Insert Record
        const { data, error } = await authSupabase.from('podcasts').insert([{
            title, publisher, description, image_url: imageUrl
        }]).select();

        if (error) throw error;
        res.status(201).json({ message: "Podcast created", data: data[0] });
    } catch (error) {
        console.error("Add Podcast Error:", error);
        res.status(500).json({ error: error.message });
    }
}

// POST /api/admin/episodes
const addEpisode = async (req, res) => {
    try {
        const authSupabase = getAuthClient(req);

        const { podcast_id, title, description, duration } = req.body;
        const audioFile = req.files['audio'] ? req.files['audio'][0] : null;

        if (!podcast_id || !title || !audioFile) {
            return res.status(400).json({ error: "Missing required fields (podcast_id, title, audio)" });
        }

        const allowedAudioTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a'];
        if (!allowedAudioTypes.includes(audioFile.mimetype)) {
            return res.status(400).json({ error: "Invalid audio format" });
        }

        // Upload Audio
        const audioPath = `episodes/${Date.now()}_${audioFile.originalname}`;
        const { error: uploadError } = await authSupabase.storage.from('songs').upload(audioPath, audioFile.buffer, {
            contentType: audioFile.mimetype
        });

        if (uploadError) throw uploadError;
        const audioUrl = authSupabase.storage.from('songs').getPublicUrl(audioPath).data.publicUrl;

        // Insert Record
        const { data, error } = await authSupabase.from('episodes').insert([{
            podcast_id, title, description, duration, audio_url: audioUrl
        }]).select();

        if (error) throw error;
        res.status(201).json({ message: "Episode added", data: data[0] });

    } catch (error) {
        console.error("Add Episode Error:", error);
        res.status(500).json({ error: error.message });
    }
}

module.exports = { getAllPodcasts, getPodcastById, getPodcastEpisodes, addPodcast, addEpisode };
