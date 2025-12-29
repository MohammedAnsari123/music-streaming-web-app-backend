const supabase = require('../config/supabaseClient');

// 1. Verify Token (Authentication)
// Checks if the user is logged in (Identity)
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

        req.user = user; // Attach raw auth user
        next();

    } catch (error) {
        console.error("Auth Middleware Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// 2. Verify Admin (Authorization)
// Checks if the authenticated user has the 'admin' role in the PROFILES table
const verifyAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: "Access Denied" });

        // A. Validate Identity
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) return res.status(401).json({ error: "Invalid Token" });

        // B. Validate Role (Database Lookup)
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
        req.userRole = 'admin'; // Convenience flag
        next();

    } catch (error) {
        console.error("Admin Verify Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports = { verifyToken, verifyAdmin };
