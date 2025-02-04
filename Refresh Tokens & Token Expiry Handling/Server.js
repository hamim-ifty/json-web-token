const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const ACCESS_TOKEN_SECRET = 'your-access-token-secret';
const REFRESH_TOKEN_SECRET = 'your-refresh-token-secret';

let refreshTokens = new Set();
const posts = [
   "Early bird catches the worm",
];

const users = [
   { username: 'admin', password: 'admin123', role: 'admin' },
   { username: 'user', password: 'user123', role: 'user' }
];

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

const requireAdmin = (req, res, next) => {
   if (req.user.role !== 'admin') {
       return res.status(403).json({ message: 'Admin access required' });
   }
   next();
};

app.post('/signin', (req, res) => {
   const { username, password } = req.body;
   
   const user = users.find(u => u.username === username && u.password === password);
   
   if (!user) {
       return res.status(401).json({ message: 'Invalid credentials' });
   }

   const accessToken = jwt.sign(
       { username: user.username, role: user.role }, 
       ACCESS_TOKEN_SECRET,
       { expiresIn: '15m' }
   );

   const refreshToken = jwt.sign(
       { username: user.username, role: user.role },
       REFRESH_TOKEN_SECRET,
       { expiresIn: '7d' }
   );

   refreshTokens.add(refreshToken);

   res.json({
       accessToken,
       refreshToken,
       role: user.role
   });
});

app.post('/refresh-token', (req, res) => {
   const { refreshToken } = req.body;

   if (!refreshToken || !refreshTokens.has(refreshToken)) {
       return res.status(403).json({ message: 'Invalid refresh token' });
   }

   jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, (err, user) => {
       if (err) {
           refreshTokens.delete(refreshToken);
           return res.status(403).json({ message: 'Invalid refresh token' });
       }

       const accessToken = jwt.sign(
           { username: user.username, role: user.role },
           ACCESS_TOKEN_SECRET,
           { expiresIn: '15m' }
       );

       res.json({ accessToken });
   });
});

app.post('/logout', (req, res) => {
   const { refreshToken } = req.body;
   
   refreshTokens.delete(refreshToken);
   
   res.json({ message: 'Logged out successfully' });
});

app.get('/posts', authenticateToken, (req, res) => {
   res.json({
       posts,
       user: req.user
   });
});

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

const PORT = 3000;
app.listen(PORT, () => {
   console.log(`Server running on port ${PORT}`);
});