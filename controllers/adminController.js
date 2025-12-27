const supabase = require('../config/supabaseClient');

// GET /api/admin/stats
const getAdminStats = async (req, res) => {
    try {
        const { count: songsCount } = await supabase.from('songs').select('*', { count: 'exact', head: true });
        const { count: podcastsCount } = await supabase.from('podcasts').select('*', { count: 'exact', head: true });
        const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true });

        res.json({
            songs: songsCount || 0,
            podcasts: podcastsCount || 0,
            users: usersCount || 0
        });
    } catch (error) {
        console.error("Admin Stats Error:", error);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
};

// GET /api/admin/users
const getAllUsers = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Get Users Error:", error);
        res.status(500).json({ error: error.message });
    }
}

// POST /api/admin/login
const adminLogin = async (req, res) => {
    const { email, password } = req.body;

    // 1. Sign In
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        return res.status(401).json({ error: error.message });
    }

    // 2. Admin Check
    const ADMIN_EMAILS = ["admin@example.com", "myadmin@gmail.com", "admin123@gmail.com", "ansarimohammed159357@gmail.com"];
    if (!ADMIN_EMAILS.includes(email)) {
        return res.status(403).json({ error: "Access Denied: Not an Admin" });
    }

    res.json({ token: data.session.access_token, user: data.user });
}

module.exports = { getAdminStats, adminLogin, getAllUsers };
