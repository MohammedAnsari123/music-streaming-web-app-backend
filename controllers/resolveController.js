const { searchAudius } = require('../services/audiusService');

const normalize = (text) => {
    if (!text) return "";
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, "")
        .trim();
}

const resolveAudio = async (req, res) => {
    try {
        const { title, artist } = req.body;

        if (!title || !artist) {
            return res.status(400).json({ message: "Title and Artist required" });
        }

        console.log(`Resolving Audio for: ${title} - ${artist}`);

        // 1. Normalize
        const query = `${normalize(title)} ${normalize(artist)}`;
        console.log(`Normalized Query: ${query}`);

        // 2. Search Audius
        const results = await searchAudius(query);

        // 3. Match
        // Simple fuzzy match: Check if Audius title/artist contains normalized search terms
        // or just take the first one if strict matching fails? 
        // User Logic: "Compare normalized titles... Accept partial match"

        const bestMatch = results.find(track => {
            const audiusTitle = normalize(track.title);
            const audiusArtist = normalize(track.artist); // user.name from service
            const targetTitle = normalize(title);
            const targetArtist = normalize(artist);

            // Basic inclusion check
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

        // Fallback: If no strict match, maybe return first result if query was specific? 
        // For now, adhere to "If found -> stream... Else -> Not available"
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
