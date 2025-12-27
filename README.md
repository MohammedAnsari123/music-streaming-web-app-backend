# StreamLite - Backend API

The **StreamLite Backend** is a robust RESTful API built with Node.js and Express. It serves as the central orchestration layer for the platform, managing data persistence, user authentication, and the complex logic of bridging external music APIs.

---

## 📚 Table of Contents
- [Overview](#overview)
- [✨ Key Features](#-key-features)
- [🛠️ Technology Stack](#️-technology-stack)
- [🔌 External Integrations](#-external-integrations)
- [📂 Project Structure](#-project-structure)
- [📋 Database & Storage](#-database--storage)
- [🔐 API Documentation](#-api-documentation)
- [⚙️ Setup & Configuration](#️-setup--configuration)

---

## Overview
The backend acts as the source of truth for the application. It connects to a **Supabase (PostgreSQL)** database for structured data and **Cloudinary** for media asset storage. Crucially, it provides the "Resolution Engine" (`/api/resolve`) that allows the frontend to play Spotify-discovered metadata by finding playable streams on the Audius network.

---

## ✨ Key Features

*   **Secure Authentication:** User registration and login flows using `bcrypt` for password hashing and `jsonwebtoken` (JWT) for session management.
*   **Media Management (CRUD):** Admin APIs to Create, Read, Update, and Delete Songs, Albums, and Podcasts.
*   **Search Aggregation:** A unified search endpoint that queries:
    1.  Local Database (Admin uploads)
    2.  Spotify Web API (External discovery)
*   **Playback Resolution:** Logic to normalize track titles/artists and find matches on third-party streaming networks.
*   **CORS Enabled:** Configured to allow secure cross-origin requests from Frontend and Admin apps.

---

## 🛠️ Technology Stack

*   **Runtime:** [Node.js](https://nodejs.org/)
*   **Framework:** [Express.js](https://expressjs.com/) - Minimalist web framework.
*   **ORM/Database Client:** `supabase-js` - For interacting with PostgreSQL.
*   **Utilities:**
    *   `axios`: For making external API requests (to Spotify/Audius).
    *   `dotenv`: Environment variable management.
    *   `cors`: Cross-Origin Resource Sharing middleware.
    *   `multer`: Middleware for handling `multipart/form-data` (file uploads).
    *   `nodemon`: Development utility for hot-reloading.

---

## 🔌 External Integrations

### 1. Spotify Web API
*   **Purpose:** Used for music discovery, popularity metrics, and rich metadata (Album art, Artist info).
*   **Library:** `spotify-web-api-node`
*   **Flow:** Backend authenticates with Client Credentials Flow -> Searches tracks -> Returns metadata to frontend.

### 2. Audius Discovery Network
*   **Purpose:** Provides the actual audio streams (`mp3`) for playback.
*   **Flow:** The `/api/resolve` endpoint takes a track title/artist, searches the Audius API network, finds the best match, and returns the stream URL.

### 3. Cloudinary
*   **Purpose:** Cloud storage for Admin-uploaded assets.
*   **Assets:** Song files (`.mp3`), Cover Images (`.jpg`, `.png`).

---

## 📂 Project Structure

```text
backend/
├── controllers/        # Business Logic
│   ├── adminController.js    # Stats & Management
│   ├── authController.js     # Login/Signup logic
│   ├── resolveController.js  # Spotify->Audius bridging logic
│   ├── songController.js     # Song CRUD
│   ├── trackController.js    # Public Track retrieval
│   └── ...
│
├── routes/             # API Route Definitions
│   ├── adminRoutes.js
│   ├── authRoutes.js
│   ├── resolveRoutes.js      # The Resolver Endpoint
│   ├── searchRoutes.js
│   └── ...
│
├── services/           # External Service Wrappers
│   ├── spotifyService.js     # Spotify API interactions
│   └── audiusService.js      # (Where applicable)
│
├── middleware/         # Request Interceptors
│   ├── authMiddleware.js     # JWT Verification
│   └── uploadMiddleware.js   # Multer Config
│
├── index.js            # Entry Point & Server Config
├── package.json        # Dependencies
└── .env                # Secrets (Not committed)
```

---

## 📋 Database & Storage

The project uses **Supabase**, offering a PostgreSQL database.

**Key Tables (Conceptual):**
*   `users`: Stores user profile and credentials.
*   `songs`: Metadata for locally hosted/admin tracks.
*   `podcasts`: Podcast series metadata.
*   `episodes`: Individual podcast episodes linked to podcasts.
*   `playlists`: User-created collections.
*   `liked_songs`: Many-to-many relationship between users and songs.

---

## 🔐 API Documentation (Primary Endpoints)

### Public
*   `POST /api/user/register` - Create new account.
*   `POST /api/user/login` - Authenticate user.
*   `POST /api/admin/login` - Authenticate admin.
*   `GET /api/tracks` - Get all available tracks.
*   `GET /api/search?q={query}` - Search all sources.

### Protected (User)
*   `POST /api/user/playlist` - Create playlist.
*   `POST /api/user/like-song` - Like a track.

### Protected (Admin)
*   `POST /api/admin/tracks` - Upload new track.
*   `DELETE /api/admin/songs/:id` - Delete track.
*   `GET /api/admin/stats` - Network statistics.

### Utility
*   `POST /api/resolve`
    *   **Body:** `{ "title": "Song Name", "artist": "Artist Name" }`
    *   **Response:** `{ "audio_url": "...", "duration": 120 }` or `{ "error": "NOT_FOUND" }`

---

## ⚙️ Setup & Configuration

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Environment Variables:**
    Create a `.env` file with the following keys:
    ```env
    PORT=3000
    
    # Database
    SUPABASE_URL=<your_supabase_url>
    SUPABASE_KEY=<your_supabase_anon_key>
    
    # Auth
    JWT_SECRET=<strong_secret_string>
    
    # External APIs
    SPOTIFY_CLIENT_ID=<your_spotify_id>
    SPOTIFY_CLIENT_SECRET=<your_spotify_secret>
    
    # Storage
    CLOUDINARY_CLOUD_NAME=...
    CLOUDINARY_API_KEY=...
    CLOUDINARY_API_SECRET=...
    ```

3.  **Run Server:**
    ```bash
    npm run dev
    ```
