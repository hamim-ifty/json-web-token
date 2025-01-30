const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// JWT secret key (in production, use environment variable)
const JWT_SECRET = 'your-secret-key';

// In-memory storage for posts
const posts = [
    "Early bird catches the worm",
    "Actions speak louder than words",
    "Practice makes perfect"
];

// Mock user database
const users = [
    { username: 'user1', password: 'password1' }
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

// Sign in endpoint
app.post('/signin', (req, res) => {
    const { username, password } = req.body;
    
    // Verify user credentials
    const user = users.find(u => u.username === username && u.password === password);
    
    if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign({ username: user.username }, JWT_SECRET, {
        expiresIn: '1h'
    });

    res.json({ token });
});

// Protected posts endpoint
app.get('/posts', authenticateToken, (req, res) => {
    res.json(posts);
});

// Start the server
const PORT = 3001; // Changed from 3000 to 3001
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is busy. Try another port.`);
    } else {
        console.log('Server error:', err);
    }
});