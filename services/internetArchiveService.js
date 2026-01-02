const axios = require('axios');

const IA_SEARCH_URL = "https://archive.org/advancedsearch.php";
const IA_METADATA_URL = "https://archive.org/metadata";

const searchInternetArchive = async (query) => {
    try {
        const q = `mediatype:audio AND (title:(${query}) OR creator:(${query}))`;
        
        const params = {
            q: q,
            fl: ['identifier', 'title', 'creator', 'mediatype'],
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
            artist: doc.creator || "Unknown Artist",
            source: "internet_archive",
            image_url: "https://archive.org/services/img/" + doc.identifier, 
            type: "music"
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

        let audioFile = files.find(f => f.format === 'VBR MP3');
        if (!audioFile) audioFile = files.find(f => f.format === 'MP3');
        if (!audioFile) audioFile = files.find(f => f.format === '128Kbps MP3');
        
        if (!audioFile) audioFile = files.find(f => f.name.toLowerCase().endsWith('.mp3'));

        if (!audioFile) {
             throw new Error("No suitable MP3 audio file found for this item");
        }

        const audioUrl = `https://${server}${dir}/${audioFile.name}`;
        
        return {
            audio_url: audioUrl,
            duration: parseFloat(audioFile.length) || 0,
            source: "internet_archive",
            id: id
        };

    } catch (error) {
        console.error("IA Resolve Error:", error.message);
        throw error;
    }
}

module.exports = { searchInternetArchive, resolveInternetArchive };
