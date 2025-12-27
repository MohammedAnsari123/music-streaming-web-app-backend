const axios = require('axios');

const AUDIUS_APP_NAME = 'StreamLite'; // Required by Audius

const searchAudius = async (query) => {
    try {
        // Audius requires finding a host first, but we are using a provided discovery provider link from env or default
        // If provided base URL fails, we might need logic to select a host, but let's try the env one first.
        // Audius API Configuration (User Provided)
        // Discovery Provider: https://discoveryprovider.audius.co/v1
        const baseUrl = process.env.AUDIUS_BASE_URL || 'https://discoveryprovider.audius.co/v1';

        const response = await axios.get(`${baseUrl}/tracks/search`, {
            params: {
                query: query,
                app_name: AUDIUS_APP_NAME,
                limit: 10
            }
        });

        if (!response.data || !response.data.data) return [];

        return response.data.data.map(track => ({
            id: track.id,
            title: track.title,
            artist: track.user.name,
            album: 'Audius Single', // Data often missing album
            image_url: track.artwork ? track.artwork['480x480'] || track.artwork['150x150'] : null,
            audio_url: `${baseUrl}/tracks/${track.id}/stream`,
            source: 'audius',
            duration: track.duration
        }));
    } catch (error) {
        console.error('Error searching Audius:', error.response ? error.response.data : error.message);
        return [];
    }
};

module.exports = { searchAudius };
