const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Separate secrets for access and refresh tokens
const ACCESS_TOKEN_SECRET = 'your-access-token-secret';
const REFRESH_TOKEN_SECRET = 'your-refresh-token-secret';

// In-memory storage for refresh tokens and posts
let refreshTokens = new Set();
const posts = [
    "Early bird catches the worm",
    "Actions speak louder than words",
    "Practice makes perfect"
];

// Mock user database with roles
const users = [
    { username: 'admin', password: 'admin123', role: 'admin' },
    { username: 'user', password: 'user123', role: 'user' }
];

// Middleware to verify access token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.sendStatus(401);
    }

    jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user) => {
        if (err) {
            return res.sendStatus(403);
        }
        req.user = user;
        next();
    });
};

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

// Sign in endpoint - provides both access and refresh tokens
app.post('/signin', (req, res) => {
    const { username, password } = req.body;
    
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate access token (short-lived - 15 minutes)
    const accessToken = jwt.sign(
        { username: user.username, role: user.role }, 
        ACCESS_TOKEN_SECRET,
        { expiresIn: '15m' }
    );

    // Generate refresh token (long-lived - 7 days)
    const refreshToken = jwt.sign(
        { username: user.username, role: user.role },
        REFRESH_TOKEN_SECRET,
        { expiresIn: '7d' }
    );

    // Store refresh token
    refreshTokens.add(refreshToken);

    res.json({
        accessToken,
        refreshToken,
        role: user.role
    });
});

// Refresh token endpoint - get new access token
app.post('/refresh-token', (req, res) => {
    const { refreshToken } = req.body;

    // Check if refresh token exists and is valid
    if (!refreshToken || !refreshTokens.has(refreshToken)) {
        return res.status(403).json({ message: 'Invalid refresh token' });
    }

    jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (err, user) => {
        if (err) {
            // Remove invalid refresh token
            refreshTokens.delete(refreshToken);
            return res.status(403).json({ message: 'Invalid refresh token' });
        }

        // Generate new access token
        const accessToken = jwt.sign(
            { username: user.username, role: user.role },
            ACCESS_TOKEN_SECRET,
            { expiresIn: '15m' }
        );

        res.json({ accessToken });
    });
});

// Logout endpoint - invalidate refresh token
app.post('/logout', (req, res) => {
    const { refreshToken } = req.body;
    
    // Remove refresh token from storage
    refreshTokens.delete(refreshToken);
    
    res.json({ message: 'Logged out successfully' });
});

// Protected GET /posts endpoint - accessible by both user and admin
app.get('/posts', authenticateToken, (req, res) => {
    res.json({
        posts,
        user: req.user
    });
});

// Protected POST /posts endpoint - admin only
app.post('/posts', authenticateToken, requireAdmin, (req, res) => {
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: 'Valid message is required' });
    }

    posts.push(message);
    res.status(201).json({ 
        message: 'Post added successfully',
        posts 
    });
});

// Start the server
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});