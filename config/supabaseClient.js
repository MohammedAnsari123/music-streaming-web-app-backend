const dotenv = require('dotenv')
dotenv.config();

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn("⚠️  WARNING: Supabase URL or Key is missing in backend .env file!");
    console.warn("Check if your .env variables match: VITE_SUPABASE_URL and VITE_SUPABASE_KEY");
}

const supabase = createClient(supabaseUrl, supabaseKey)

module.exports = supabase;
