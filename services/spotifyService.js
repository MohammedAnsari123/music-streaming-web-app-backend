const axios = require('axios');

let spotifyToken = null;
let tokenExpiration = null;

const getSpotifyToken = async () => {
    if (spotifyToken && tokenExpiration && Date.now() < tokenExpiration) {
        return spotifyToken;
    }

    try {
        const response = await axios.post('https://accounts.spotify.com/api/token',
            new URLSearchParams({
                'grant_type': 'client_credentials',
                'client_id': process.env.SPOTIFY_CLIENT_ID,
                'client_secret': process.env.SPOTIFY_CLIENT_SECRET
            }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }
        );

        spotifyToken = response.data.access_token;
        tokenExpiration = Date.now() + (response.data.expires_in * 1000);
        return spotifyToken;
    } catch (error) {
        console.error('Error fetching Spotify token:', error.response ? error.response.data : error.message);
        throw new Error('Failed to authenticate with Spotify');
    }
};

const searchSpotify = async (query) => {
    try {
        const token = await getSpotifyToken();
        const response = await axios.get(`https://api.spotify.com/v1/search`, {
            headers: { 'Authorization': `Bearer ${token}` },
            params: {
                q: query,
                type: 'track',
                limit: 10
            }
        });

        return response.data.tracks.items.map(track => ({
            id: track.id,
            title: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            album: track.album.name,
            image_url: track.album.images[0]?.url,
            audio_url: track.preview_url,
            source: 'spotify',
            duration: track.duration_ms / 1000
        }));
    } catch (error) {
        console.error('Error searching Spotify:', error.response ? error.response.data : error.message);
        return [];
    }
};

module.exports = { searchSpotify };
