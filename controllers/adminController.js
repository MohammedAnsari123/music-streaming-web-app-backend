const supabase = require('../config/supabaseClient');

const loginAdmin = async (req, res) => {
    const { email, password } = req.body;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) return res.status(401).json({ error: error.message });

        const user = data.user;

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) return res.status(403).json({ error: "Access Denied: Profile not found" });
        if (profile.role !== 'admin') return res.status(403).json({ error: "Access Denied: Admins Only" });

        res.json({
            message: 'Admin Login successful',
            token: data.session.access_token,
            user: { id: user.id, email: user.email, role: profile.role }
        });

    } catch (err) {
        console.error("Admin Login Error:", err);
        res.status(500).json({ error: "Internal System Error" });
    }
};

const registerAdmin = async (req, res) => {
    const { email, password, full_name, secretKey } = req.body;

    const VALID_SECRET_KEY = "streamlite_admin_2025";

    if (secretKey !== VALID_SECRET_KEY) {
        return res.status(403).json({ error: "Invalid Admin Secret Key. Registration Forbidden." });
    }

    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: full_name }
            }
        });

        if (error) return res.status(400).json({ error: error.message });

        const user = data.user;
        if (!user) return res.status(400).json({ error: "User creation failed" });

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', user.id);

        if (updateError) {
            console.error("Role Promotion Error:", updateError);
            return res.status(201).json({ message: "Account created, but Role Update Failed. Contact Super Admin.", warning: true });
        }

        res.status(201).json({ message: "Admin Account Created and Verified Successfully", user });

    } catch (err) {
        console.error("Registration Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

const getDashboardStats = async (req, res) => {
    try {
        const { count: songsCount } = await supabase.from('songs').select('*', { count: 'exact', head: true });
        const { count: podcastsCount } = await supabase.from('podcasts').select('*', { count: 'exact', head: true });
        const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

        const { data: artistsData } = await supabase.from('songs').select('artist');
        const uniqueArtists = artistsData ? [...new Set(artistsData.map(item => item.artist))].length : 0;

        res.json({
            songs: songsCount || 0,
            podcasts: podcastsCount || 0,
            users: usersCount || 0,
            artists: uniqueArtists || 0
        });

    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ error: "Failed to fetch statistics" });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error("Get Users Error:", error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
}

module.exports = { loginAdmin, registerAdmin, getDashboardStats, getAllUsers };
