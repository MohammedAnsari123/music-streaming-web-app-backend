const globalSupabase = require('../config/supabaseClient');
const { searchSpotify } = require('../services/spotifyService');
const { searchAudius } = require('../services/audiusService');

const globalSearch = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.status(400).json({ message: "Query parameter 'q' is required" });

        console.log(`----- Global Search: ${q} -----`);

        // Search in parallel: Local Songs, Local Podcasts, Spotify, Audius
        const [spotifyResults, audiusResults, localSongs, localPodcasts] = await Promise.all([
            searchSpotify(q),
            searchAudius(q),
            globalSupabase.from('songs').select('*').ilike('title', `%${q}%`).limit(10),
            globalSupabase.from('podcasts').select('*').ilike('title', `%${q}%`).limit(10)
        ]);

        // Format Local Songs
        const formattedSongs = (localSongs.data || []).map(song => ({
            id: song.id,
            title: song.title,
            artist: song.artist,
            album: song.album,
            image_url: song.image_url,
            audio_url: song.song_url, // For playback
            source: 'local',
            type: 'music'
        }));

        // Format Local Podcasts
        const formattedPodcasts = (localPodcasts.data || []).map(pod => ({
            id: pod.id,
            title: pod.title,
            artist: pod.publisher, // Map publisher to artist for consistent UI
            image_url: pod.image_url,
            source: 'local',
            type: 'podcast',
            description: pod.description
        }));

        const combinedResults = [
            ...formattedSongs,
            ...formattedPodcasts,
            ...spotifyResults, // Ensure spotify service returns 'type': 'music' or handled
            ...audiusResults
        ];

        res.json(combinedResults);

    } catch (error) {
        console.error("Global Search Error:", error);
        res.status(500).json({ message: "Search failed", error: error.message });
    }
}

module.exports = { globalSearch };
