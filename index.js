const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
dotenv.config();

const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const songRouter = require('./routes/songRoutes');
const tracksRouter = require('./routes/trackRoutes');

const podcastRouter = require('./routes/podcastRoutes');
const playlistRouter = require('./routes/playlistRoutes');
const genreRouter = require('./routes/genreRoutes');

const app = express()

app.use(cors());
app.use(express.json());

app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/songs', songRouter);
app.use('/api/tracks', tracksRouter);
app.use('/api/podcasts', podcastRouter);
app.use('/api/playlists', playlistRouter);
app.use('/api/genres', genreRouter);
const recentlyPlayedRouter = require('./routes/recentlyPlayedRoutes');
app.use('/api/recently-played', recentlyPlayedRouter);

app.listen(process.env.PORT, () => {
    console.log(`server Running on port ${process.env.PORT}`)
})
