const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// JWT secret key
const JWT_SECRET = 'your-secret-key';

// In-memory storage for posts
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

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.sendStatus(401);
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
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

// Sign in endpoint
app.post('/signin', (req, res) => {
    const { username, password } = req.body;
    
    // Verify user credentials
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token with role included
    const token = jwt.sign(
        { 
            username: user.username,
            role: user.role 
        }, 
        JWT_SECRET,
        { expiresIn: '1h' }
    );

    res.json({ 
        token,
        role: user.role 
    });
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