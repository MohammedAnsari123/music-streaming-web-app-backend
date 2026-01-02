const axios = require('axios');

const AUDIUS_APP_NAME = 'StreamLite';

const searchAudius = async (query) => {
    try {
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
            album: 'Audius Single',
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
