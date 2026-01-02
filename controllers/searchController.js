const globalSupabase = require('../config/supabaseClient');
const { searchSpotify } = require('../services/spotifyService');
const { searchAudius } = require('../services/audiusService');
const { searchInternetArchive } = require('../services/internetArchiveService');

const globalSearch = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q) return res.status(400).json({ message: "Query parameter 'q' is required" });

        console.log(`----- Global Search: ${q} -----`);

        const [spotifyResults, audiusResults, internetArchiveResults, localSongs, localPodcasts] = await Promise.all([
            searchSpotify(q),
            searchAudius(q),
            searchInternetArchive(q),
            globalSupabase.from('songs').select('*').ilike('title', `%${q}%`).limit(10),
            globalSupabase.from('podcasts').select('*').ilike('title', `%${q}%`).limit(10)
        ]);

        const formattedSongs = (localSongs.data || []).map(song => ({
            id: song.id,
            title: song.title,
            artist: song.artist,
            album: song.album,
            image_url: song.image_url,
            audio_url: song.song_url,
            source: 'local',
            type: 'music'
        }));

        const formattedPodcasts = (localPodcasts.data || []).map(pod => ({
            id: pod.id,
            title: pod.title,
            artist: pod.publisher,
            image_url: pod.image_url,
            source: 'local',
            type: 'podcast',
            description: pod.description
        }));

        const combinedResults = [
            ...formattedSongs,
            ...formattedPodcasts,
            ...spotifyResults,
            ...audiusResults,
            ...internetArchiveResults
        ];

        res.json(combinedResults);

    } catch (error) {
        console.error("Global Search Error:", error);
        res.status(500).json({ message: "Search failed", error: error.message });
    }
}

module.exports = { globalSearch };
