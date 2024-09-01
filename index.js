// index.js
const express = require('express');
const connectDB = require('./configs/database');
const User = require('./models/User');

const app = express();

// Connect to MongoDB
connectDB();

app.use(express.json());

app.post('/api/register', async (req, res) => {
    const { username, email, password, phoneNumber } = req.body;

    try {
        const user = new User({ username, email, password, phoneNumber });
        await user.save();
        res.status(201).json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

app.listen(3000, () => console.log('Server started on port 3000'));
