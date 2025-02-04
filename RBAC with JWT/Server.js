const express = require('express');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const JWT_SECRET = 'your-secret-key';

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

   jwt.verify(token, JWT_SECRET, (err, user) => {
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