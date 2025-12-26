const globalSupabase = require('../config/supabaseClient');
const { createClient } = require("@supabase/supabase-js");

// Helper (Reused or Utils - putting inline for now as requested by user's "clean routes" but sloppy controller implies we do logic here)
const getAuthClient = (req) => {
    const token = req.headers.authorization;
    if (!token) return globalSupabase;
    return createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_KEY, {
        global: { headers: { Authorization: token } }
    });
}

const addSong = async (req, res) => {
    try {
        const authSupabase = getAuthClient(req);

        console.log("----- Add Song Request Received -----");
        // ... (rest is same logic but using authSupabase)

        if (!req.files || !req.files['song'] || !req.files['image']) {
            return res.status(400).json({ message: "Missing files" });
        }

        const { title, artist, album, category } = req.body;
        const songFile = req.files['song'][0];
        const imageFile = req.files['image'][0];

        // VALIDATION
        const allowedAudioTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a'];
        const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];

        if (!allowedAudioTypes.includes(songFile.mimetype)) return res.status(400).json({ message: "Invalid audio format" });
        if (!allowedImageTypes.includes(imageFile.mimetype)) return res.status(400).json({ message: "Invalid image format" });

        const songPath = `songs/${Date.now()}_${songFile.originalname}`;
        const { error: songError } = await authSupabase.storage.from('songs').upload(songPath, songFile.buffer, {
            contentType: songFile.mimetype
        });
        if (songError) throw songError;

        const imagePath = `images/${Date.now()}_${imageFile.originalname}`;
        const { error: imageError } = await authSupabase.storage.from('images').upload(imagePath, imageFile.buffer, {
            contentType: imageFile.mimetype
        });
        if (imageError) throw imageError;

        const songUrl = authSupabase.storage.from('songs').getPublicUrl(songPath).data.publicUrl;
        const imageUrl = authSupabase.storage.from('images').getPublicUrl(imagePath).data.publicUrl;

        const { data, error } = await authSupabase.from('songs').insert([{
            title, artist, album, category, song_url: songUrl, image_url: imageUrl
        }]).select();

        if (error) throw error;
        res.status(201).json({ message: 'Song added successfully', song: data[0] });

    } catch (error) {
        console.error("Global Add Song Error:", error);
        res.status(500).json({ message: 'Failed to add song', error: error.message });
    }
}

const getAllSongs = async (req, res) => {
    try {
        console.log("----- Get All Songs Request Received -----");

        // Removed order('created_at') temporarily to rule out column missing issues
        const { data, error } = await globalSupabase.from('songs').select('*');

        if (error) {
            console.error("Supabase Select Error:", error);
            throw error
        }

        console.log(`Fetched ${data.length} songs`);
        res.json(data);

    } catch (error) {
        console.error("Global Get All Songs Error:", error);
        res.status(500).json({ error: error.message });
    }
}

const deleteSong = async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`----- Delete Song Request: ${id} -----`);

        const { error } = await globalSupabase.from('songs').delete().eq('id', id);

        if (error) {
            console.error("Supabase Delete Error:", error);
            throw error
        }

        res.json({ message: "Song deleted successfully" })
    } catch (error) {
        console.error("Delete Song Error:", error);
        res.status(500).json({ error: error.message });
    }
}


module.exports = { addSong, getAllSongs, deleteSong }
