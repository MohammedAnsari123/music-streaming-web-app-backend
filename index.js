const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
dotenv.config();

const userRoutes = require('./routes/user.routes');
const adminRoutes = require('./routes/admin.routes');
const songRouter = require('./routes/songs.routes');

const app = express()

app.use(cors());
app.use(express.json());

app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/songs', songRouter);

app.listen(process.env.PORT, () => {
    console.log(`server Running on port ${process.env.PORT}`)
})
