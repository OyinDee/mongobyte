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
const universityRoutes = require('./routes/universityRoutes');
const testimonialRoutes = require('./routes/testimonialRoutes');
const ratingRoutes = require('./routes/ratingRoutes');
const cookieParser = require('cookie-parser');
const axios = require('axios');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(cookieParser());
app.use(cors({
    origin: ['https://www.yumbyte.ng',  'https://yumbyte.ng', 'yumbyte.ng', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve Swagger UI static files
app.use('/swagger-ui', express.static(path.join(__dirname, 'node_modules/swagger-ui-dist')));

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Byte! API',
      version: '1.0.0',
      description: 'API documentation for Byte! - A campus food delivery service',
    },
    servers: [
      { 
        url: process.env.NODE_ENV === 'production' 
          ? 'https://mongobyte.vercel.app/api/v1' 
          : 'http://localhost:8080/api/v1',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      },
    ],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and account management endpoints'
      },
      {
        name: 'Users',
        description: 'User profile and account management operations'
      },
      {
        name: 'Meals',
        description: 'Meal creation, listing, and management endpoints'
      },
      {
        name: 'Orders',
        description: 'Order creation, tracking, and management'
      },
      {
        name: 'Restaurants',
        description: 'Restaurant registration, management, and operations'
      },
      {
        name: 'Payments',
        description: 'Payment processing and transaction management'
      },
      {
        name: 'Admin',
        description: 'Super admin operations and management'
      },
      {
        name: 'Universities',
        description: 'University management and operations'
      },
      {
        name: 'Testimonials',
        description: 'User testimonials and reviews management'
      },
      {
        name: 'Ratings',
        description: 'Restaurant rating and review system'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Serve Swagger documentation
app.use('/api-docs', swaggerUi.serve);
app.get('/api-docs', swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Byte! API Documentation"
}));

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/restaurants', restaurantRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/meals', mealRoutes);
app.use('/api/v1/pay', paymentRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/superadmin', superAdminRoutes);
app.use('/api/v1/universities', universityRoutes);
app.use('/api/v1/testimonials', testimonialRoutes);
app.use('/api/v1/ratings', ratingRoutes);

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

mongoose.connect(`${process.env.MONGODB_URI}`, {})
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));
