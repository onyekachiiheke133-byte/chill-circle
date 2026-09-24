// server.js placeholder 
const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public'))); // Serve public folder

// Routes to HTML pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/landing/index.html')));
app.get('/auth/login', (req, res) => res.sendFile(path.join(__dirname, '../public/auth/login.html')));
app.get('/auth/signup', (req, res) => res.sendFile(path.join(__dirname, '../public/auth/signup.html')));
app.get('/chat', (req, res) => res.sendFile(path.join(__dirname, '../public/chat.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, '../public/profile/profile.html')));
app.get('/profile/edit', (req, res) => res.sendFile(path.join(__dirname, '../public/profile/edit-profile.html')));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));