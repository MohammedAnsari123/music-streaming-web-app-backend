const supabase = require('../config/supabaseClient');

const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: "Access Denied: No Token Provided" });
        }

        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: "Invalid Token" });
        }

        req.user = user;
        next();

    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
}


const verifyAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ error: "Access Denied: No Token" });

        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) return res.status(401).json({ error: "Invalid Token" });

        const ADMIN_EMAILS = ["admin@example.com", "myadmin@gmail.com", "admin123@gmail.com", "ansarimohammed159357@gmail.com"]; // Added user email for testing

        if (!ADMIN_EMAILS.includes(user.email)) {
            return res.status(403).json({ error: "Access Denied: Admins Only" });
        }

        req.user = user;
        next();

    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports = { verifyToken, verifyAdmin };
