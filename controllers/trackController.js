const supabase = require('../config/supabaseClient');

const getAllTracks = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('songs') // Corrected table name
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Supabase Error:", error);
            throw error;
        }

        // Standardize response
        const formattedData = data.map(track => ({
            ...track,
            audio_url: track.song_url,
            source: 'local'
        }));

        res.json(formattedData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const getTrackById = async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('songs') // Corrected table name
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            throw error;
        }

        const formattedTrack = {
            ...data,
            audio_url: data.song_url,
            source: 'local'
        };

        res.json(formattedTrack);
    } catch (error) {
        res.status(404).json({ error: "Track not found" });
    }
}

const getGenres = async (req, res) => {
    try {
        // Fetch unique categories/genres from tracks (songs)
        const { data, error } = await supabase
            .from('songs') // Corrected table name
            .select('category');

        if (error) throw error;

        // Extract unique values
        const genres = [...new Set(data.map(track => track.category))];
        res.json(genres);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

module.exports = { getAllTracks, getTrackById, getGenres };
