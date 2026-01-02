const { searchAudius } = require('../services/audiusService');
const { resolveInternetArchive } = require('../services/internetArchiveService');

const normalize = (text) => {
    if (!text) return "";
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .trim();
}

const resolveAudio = async (req, res) => {
    try {
        const { title, artist, id, source } = req.body;

        if (source === 'internet_archive' && id) {
            console.log(`Resolving Internet Archive track: ${id}`);
            const track = await resolveInternetArchive(id);
            return res.json(track);
        }

        if (!title || !artist) {
            return res.status(400).json({ message: "Title and Artist required" });
        }

        console.log(`Resolving Audio for: ${title} - ${artist}`);

        const query = `${normalize(title)} ${normalize(artist)}`;
        console.log(`Normalized Query: ${query}`);

        const results = await searchAudius(query);

        const bestMatch = results.find(track => {
            const audiusTitle = normalize(track.title);
            const audiusArtist = normalize(track.artist);
            const targetTitle = normalize(title);
            const targetArtist = normalize(artist);

            return audiusTitle.includes(targetTitle) || targetTitle.includes(audiusTitle);
        });

        if (bestMatch) {
            console.log(`Match Found: ${bestMatch.title} by ${bestMatch.artist}`);
            return res.json({
                audio_url: bestMatch.audio_url,
                audius_id: bestMatch.id,
                duration: bestMatch.duration
            });
        }

        if (results.length > 0) {
            console.log("No strict match, returning best guess (First Result)");
            return res.json({
                audio_url: results[0].audio_url,
                audius_id: results[0].id,
                duration: results[0].duration
            });
        }

        console.log("No match found on Audius.");
        return res.json({ error: "NOT_FOUND" });

    } catch (error) {
        console.error("Resolution Error:", error);
        res.status(500).json({ message: "Resolution failed", error: error.message });
    }
}

module.exports = { resolveAudio };
