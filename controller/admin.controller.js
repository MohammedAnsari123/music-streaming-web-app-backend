const supabase = require("../config/supabaseClient");

const loginAdmin = async (req, res) => {
    const { email, password } = req.body;
    const ADMIN_EMAILS = ["admin@example.com", "myadmin@gmail.com", "admin123@gmail.com"];

    if (!ADMIN_EMAILS.includes(email)) {
        return res.status(403).json({ error: "Access Denied: You are not an Admin!" })
    }

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    })

    if (error) {
        console.error("supabase admin login error:", error.message);
        return res.status(401).json({ error: error.message });
    }

    res.json({ message: "Admin Login Success", token: data.session.access_token, user: data.user })
}

module.exports = { loginAdmin }
