const supabase = require('../config/supabaseClient');

const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: "Access Denied: No Token Provided" });
        }

        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: "Invalid or Expired Token" });
        }

        req.user = user;
        next();

    } catch (error) {
        console.error("Auth Middleware Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

const verifyAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: "Access Denied" });

        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) return res.status(401).json({ error: "Invalid Token" });

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            return res.status(403).json({ error: "Access Forbidden: Profile Check Failed" });
        }

        if (profile.role !== 'admin') {
            return res.status(403).json({ error: "Access Forbidden: Admins Only" });
        }

        req.user = user;
        req.userRole = 'admin';
        next();

    } catch (error) {
        console.error("Admin Verify Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports = { verifyToken, verifyAdmin };
