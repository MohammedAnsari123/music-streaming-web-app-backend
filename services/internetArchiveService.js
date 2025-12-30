const axios = require('axios');

const IA_SEARCH_URL = "https://archive.org/advancedsearch.php";
const IA_METADATA_URL = "https://archive.org/metadata";

const searchInternetArchive = async (query) => {
    try {
        // Query for audio, title/creator matches
        // output=json, fl[]=identifier,title,creator,mediatype
        // We use 'mediatype:audio' to filter for audio content
        const q = `mediatype:audio AND (title:(${query}) OR creator:(${query}))`;
        
        const params = {
            q: q,
            fl: ['identifier', 'title', 'creator', 'mediatype'], // Fields to return
            output: 'json',
            rows: 10,
            page: 1
        };

        const response = await axios.get(IA_SEARCH_URL, { params });
        
        if (!response.data || !response.data.response || !response.data.response.docs) {
            return [];
        }

        const docs = response.data.response.docs;

        return docs.map(doc => ({
            id: doc.identifier,
            title: doc.title,
            artist: doc.creator || "Unknown Artist", // Standardize 'creator' to 'artist'
            source: "internet_archive",
            // IA automatically generates thumbnails at this URL pattern
            image_url: "https://archive.org/services/img/" + doc.identifier, 
            type: "music" // Treat as music generally
        }));
    } catch (error) {
        console.error("IA Search Error:", error.message);
        return [];
    }
};

const resolveInternetArchive = async (id) => {
    try {
        const response = await axios.get(`${IA_METADATA_URL}/${id}`);
        const data = response.data;
        
        if (!data || !data.files || !data.server || !data.dir) {
             throw new Error("Invalid Metadata from Internet Archive");
        }

        const server = data.server;
        const dir = data.dir;
        const files = data.files;

        // Priority for standard MP3 formats
        let audioFile = files.find(f => f.format === 'VBR MP3');
        if (!audioFile) audioFile = files.find(f => f.format === 'MP3');
        if (!audioFile) audioFile = files.find(f => f.format === '128Kbps MP3');
        
        // Fallback to any MP3 file if specific formats not found
        if (!audioFile) audioFile = files.find(f => f.name.toLowerCase().endsWith('.mp3'));

        if (!audioFile) {
             throw new Error("No suitable MP3 audio file found for this item");
        }

        // Construct Direct Streaming URL
        // Pattern: https://{server}{dir}/{filename}
        const audioUrl = `https://${server}${dir}/${audioFile.name}`;
        
        return {
            audio_url: audioUrl,
            duration: parseFloat(audioFile.length) || 0, // Duration in seconds
            source: "internet_archive",
            id: id
        };

    } catch (error) {
        console.error("IA Resolve Error:", error.message);
        throw error;
    }
}

module.exports = { searchInternetArchive, resolveInternetArchive };
