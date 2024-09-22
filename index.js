const express = require('express');
const app = express();
const mongoose = require('mongoose');
const cors = require('cors');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const mealRoutes = require('./routes/mealRoutes');
const paymentRoutes = require('./routes/paymentRoutes')
const orderRoutes = require('./routes/orderRoutes')
const connectDB = require('./configs/database');
const router = express.Router();
const cookieParser = require('cookie-parser');
app.use(cookieParser());


app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:3000/',  'https://yumbyte.netlify.app', 'https://yumbyte.netlify.app/', 'https://bytego.vercel.app', 'https://bytego.vercel.app/'],
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


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


mongoose.connect(`${process.env.MONGODB_URI}`, {})
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));
