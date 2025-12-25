const supabase = require('../config/supabaseClient');

const registerUser = async (req, res) => {
    const { email, password, username } = req.body;
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                username: username
            }
        }
    })
    if (error) {
        console.error("Supabase Sign Up Error:", error.message);
        return res.status(400).json({ error: error.message });
    }
    res.status(201).json({ message: "User Created", user: data.user })
}

const loginUser = async (req, res) => {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    if (error) {
        console.error("Supabase Login Error:", error.message);
        return res.status(401).json({ error: error.message });
    }
    res.json({ token: data.session.access_token, user: data.user })
}

module.exports = { registerUser, loginUser }
