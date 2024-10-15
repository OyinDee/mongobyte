const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const mealRoutes = require('./routes/mealRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const orderRoutes = require('./routes/orderRoutes');
const cookieParser = require('cookie-parser');
const cron = require('node-cron');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(cookieParser());
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3000/', 'https://yumbyte.netlify.app', 'https://yumbyte.netlify.app/', 'https://bytego.vercel.app', 'https://bytego.vercel.app/', 'http://192.168.186.74:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/restaurants', restaurantRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/meals', mealRoutes);
app.use('/api/v1/pay', paymentRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/superadmin', superAdminRoutes);

app.get('/api/ping', (req, res) => {
    res.send('Server is alive');
});

cron.schedule('*/10 * * * *', () => {
    axios.get(`http://localhost:${process.env.PORT || 8080}/api/ping`)
        .then(response => {
            console.log('Server pinged successfully');
        })
        .catch(error => {
            console.error('Error pinging server:', error);
        });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

mongoose.connect(`${process.env.MONGODB_URI}`, {})
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));
