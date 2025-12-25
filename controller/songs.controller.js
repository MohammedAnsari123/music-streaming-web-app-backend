const supabase = require('../config/supabaseClient');

const addSong = async (req, res) => {
    try {
        console.log("Receiving upload request..."); // Debug log

        if (!req.files || !req.files['song'] || !req.files['image']) {
            throw new Error("Missing files! Make sure 'song' and 'image' are uploaded.");
        }

        const { title, artist, album, category } = req.body;
        const songFile = req.files['song'][0];
        const imageFile = req.files['image'][0];

        console.log(`Uploading song: ${songFile.originalname}`);

        const songPath = `songs/${Date.now()}_${songFile.originalname}`;
        const { data: songData, error: songError } = await supabase.storage.from('songs').upload(songPath, songFile.buffer, {
            contentType: songFile.mimetype
        });

        if (songError) {
            console.error("Song Upload Error:", songError); // Debug log
            throw songError;
        }

        const imagePath = `images/${Date.now()}_${imageFile.originalname}`;
        const { data: imageData, error: imageError } = await supabase.storage.from('images').upload(imagePath, imageFile.buffer, {
            contentType: imageFile.mimetype
        });

        if (imageError) {
            throw imageError;
        }

        const songUrl = supabase.storage.from('songs').getPublicUrl(songPath).data.publicUrl;
        const imageUrl = supabase.storage.from('images').getPublicUrl(imagePath).data.publicUrl;

        const { data, error } = await supabase.from('songs').insert([{
            title,
            artist,
            album,
            category,
            song_url: songUrl,
            image_url: imageUrl
        }]).select();

        if (error) {
            throw error
        }

        res.status(201).json({ message: 'Song added successfully', song: data[0] });

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to add song' });
    }
}

const getAllSongs = async (req, res) => {
    try {
        const { data, error } = await supabase.from('songs').select('*').order('created_at', { ascending: false });

        if (error) {
            throw error
        }

        res.json(data);

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

const deleteSong = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase.from('songs').delete().eq('id', id);

        if (error) {
            throw error
        }

        res.json({ message: "Song deleted successfully" })
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}


module.exports = { addSong, getAllSongs, deleteSong }
