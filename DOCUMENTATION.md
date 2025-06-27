# Byte! Food Delivery System - Complete API & Model Documentation

## 📋 Table of Contents
1. [Overview](#overview)
2. [Database Models](#database-models)
3. [Authentication System](#authentication-system)
4. [API Endpoints](#api-endpoints)
5. [Request/Response Examples](#requestresponse-examples)
6. [Error Codes](#error-codes)
7. [Utility Functions](#utility-functions)

---

## 🎯 Overview

**Byte!** is a comprehensive food delivery system designed for university campuses. It connects students with campus restaurants, allowing for easy food ordering, payment processing, and delivery management.

### Key Features:
- **Multi-role authentication** (Users, Restaurants, Super Admin)
- **Dual ID system** (MongoDB ObjectIds + Custom 6-char IDs)
- **Real-time notifications** for users and restaurants
- **Wallet-based payment system** (Byte Balance)
- **University-specific restaurant filtering**
- **Order status tracking** with multiple states
- **Withdrawal system** for restaurants

---

## 🗄️ Database Models

### 1. **User Model** (`models/User.js`)
**Purpose**: Represents students/end users of the platform

```javascript
{
  // Identity Fields
  username: String (required, unique),
  email: String (required, unique),
  password: String (required, hashed),
  phoneNumber: String (required, unique),
  
  // Profile Information
  university: String (required),
  address: String (required),
  bio: String (default: "I'm just here to byte, nothing much"),
  imageUrl: String,
  location: String (default: ''),
  nearestLandmark: String (default: ''),
  
  // Account Status
  isVerified: Boolean (default: false),
  superAdmin: Boolean (default: false),
  
  // Financial
  byteBalance: Number (default: 0.0),
  
  // Verification & Security
  verificationCode: String,
  phoneVerificationCode: String,
  resetCode: String,
  resetCodeExpires: Date,
  
  // Relationships
  orderHistory: [ObjectId] (ref: 'Order'),
  notifications: [ObjectId] (ref: 'Notification'),
  
  // Timestamps
  timestamps: true
}
```

### 2. **Restaurant Model** (`models/Restaurants.js`)
**Purpose**: Represents campus restaurants and food vendors

```javascript
{
  // Identity Fields
  customId: String (required, unique, auto-generated 6-char hex),
  name: String (required, unique),
  email: String (required, unique),
  password: String (hashed),
  
  // Business Information
  university: String (required),
  location: String (required),
  description: String,
  contactNumber: String,
  imageUrl: String,
  
  // Banking Information
  bankName: String,
  accountNumber: String,
  accountHolder: String,
  
  // Financial
  walletBalance: Number (required, default: 0),
  
  // Account Status
  isVerified: Boolean (default: false),
  isActive: Boolean (default: true),
  verificationCode: String (default: null),
  
  // Relationships
  meals: [ObjectId] (ref: 'Meal'),
  notifications: [ObjectId] (ref: 'Notification'),
  orders: [ObjectId] (ref: 'Order'),
  
  // Timestamps
  timestamps: true
}
```

### 3. **Meal Model** (`models/Meals.js`)
**Purpose**: Represents food items offered by restaurants

```javascript
{
  // Identity
  customId: String (required, unique, auto-generated 6-char hex),
  name: String (required),
  
  // Product Details
  description: String,
  tag: String (category/type),
  per: String (serving size: "plate", "portion", etc.),
  price: Number (required),
  availability: Boolean (default: true),
  imageUrl: String,
  
  // Relationships
  restaurant: ObjectId (ref: 'Restaurant', required),
  
  // Timestamps
  timestamps: true
}
```

### 4. **Order Model** (`models/Orders.js`)
**Purpose**: Represents food orders placed by users

```javascript
{
  // Identity
  customId: String (required, unique, auto-generated 6-char hex),
  
  // Order Details
  meals: [{
    meal: ObjectId (ref: 'Meal', required),
    quantity: Number (required, default: 1)
  }],
  note: String,
  totalPrice: Number (required),
  
  // Delivery Information
  location: String (required),
  phoneNumber: String (required),
  nearestLandmark: String,
  
  // Fee Management
  fee: Number (default: 600),
  requestedFee: Number,
  requestDescription: String,
  
  // Status Tracking
  status: String (enum: ['Pending', 'Confirmed', 'Canceled', 'Fee Requested', 'Delivered'], default: 'Pending'),
  orderDate: Date (default: Date.now),
  
  // Relationships
  user: ObjectId (ref: 'User', required),
  restaurant: ObjectId (ref: 'Restaurant', required),
  
  // Timestamps
  timestamps: true
}
```

### 5. **Notification Model** (`models/Notifications.js`)
**Purpose**: Real-time messaging system for users and restaurants

```javascript
{
  // Recipients (one of these will be set)
  userId: ObjectId (ref: 'User'),
  restaurantId: ObjectId (ref: 'Restaurant'),
  
  // Content
  message: String (required),
  isRead: Boolean (default: false),
  
  // Timestamps
  timestamps: true
}
```

### 6. **Payment Model** (`models/payments.js`)
**Purpose**: Payment transaction records for wallet top-ups

```javascript
{
  // Payment Details
  reference: String (required, unique),
  amount: Number (required),
  email: String (required),
  user_id: String (required),
  
  // Status
  status: String (enum: ['credited', 'not_credited'], default: 'not_credited'),
  
  // Timestamps
  createdAt: Date (default: Date.now)
}
```

### 7. **Withdrawal Model** (`models/Withdrawals.js`)
**Purpose**: Restaurant withdrawal requests from wallet balance

```javascript
{
  // Withdrawal Details
  restaurantName: String (required),
  amount: Number (required),
  
  // Status
  status: String (enum: ['pending', 'completed', 'failed'], default: 'pending'),
  
  // Timestamps
  createdAt: Date (default: Date.now),
  updatedAt: Date (default: Date.now)
}
```

---

## 🔐 Authentication System

### **Token Structure**
The system uses JWT tokens with different payloads for different user types:

**User Token:**
```javascript
{
  user: {
    _id: "user_mongodb_id",
    username: "johndoe",
    email: "john@example.com",
    university: "University of Lagos",
    superAdmin: false
  }
}
```

**Restaurant Token:**
```javascript
{
  restaurant: {
    _id: "restaurant_mongodb_id",
    customId: "ABC123",
    name: "Campus Bites",
    email: "restaurant@example.com",
    university: "University of Lagos"
  }
}
```

### **Middleware Types**
1. **`authenticateUser.js`** - For user-specific endpoints
2. **`authenticateRestaurant.js`** - For restaurant-specific endpoints
3. **`authenticate.js`** - For super admin endpoints

---

## 🔌 API Endpoints

### **Authentication APIs** (`/api/v1/auth`)

| Method | Endpoint | Description | Auth Required | Request Body |
|--------|----------|-------------|---------------|--------------|
| POST | `/register` | Register new user | No | `{username, email, password, phoneNumber, university, address}` |
| POST | `/login` | User login | No | `{email, password}` |
| GET | `/verify-email?token=` | Verify email address | No | Query param: `token` |
| POST | `/resend-verification` | Resend verification email | No | `{email}` |
| POST | `/forgot-password` | Request password reset | No | `{email}` |
| POST | `/reset-password` | Reset password with code | No | `{resetCode, newPassword}` |

### **User APIs** (`/api/v1/users`)

| Method | Endpoint | Description | Auth Required | Request Body |
|--------|----------|-------------|---------------|--------------|
| POST | `/upload` | Upload profile image | Yes (User) | `multipart/form-data: {image}` |
| GET | `/getProfile` | Get user profile | Yes (User) | None |
| PUT | `/updateProfile` | Update user profile | Yes (User) | `{bio?, imageUrl?, university?, address?, location?, nearestLandmark?}` |
| PUT | `/updateByteBalance` | Update byte balance (internal) | Yes (User) | `{user_id, byteFund}` |
| GET | `/restaurants` | List restaurants (filtered by user's university) | Yes (User) | None |
| GET | `/restaurants/public` | List all active restaurants | No | None |
| POST | `/transfer` | Transfer bytes to another user | Yes (User) | `{recipientUsername, amount}` |
| GET | `/restdetails/:id` | Get restaurant details by ID | No | None |
| GET | `/notifications` | Get user notifications | Yes (User) | None |
| GET | `/orders/:username` | Get user order history by username | No | None |

### **Restaurant APIs** (`/api/v1/restaurants`)

| Method | Endpoint | Description | Auth Required | Request Body |
|--------|----------|-------------|---------------|--------------|
| GET | `/mymeals/:customId` | Get restaurant meals | No | None |
| POST | `/create` | Create restaurant (Admin only) | Yes (Admin) | `{name, email, university, location, description?, contactNumber?, bankName?, accountNumber?, accountHolder?}` |
| POST | `/withdraw` | Create withdrawal request | Yes (Restaurant) | `{restaurantName, amount}` |
| POST | `/login` | Restaurant login | No | `{email, password}` |
| GET | `/` | List all restaurants | No | None |
| GET | `/debug/list` | Debug: List all restaurants with IDs | No | None |
| GET | `/test/:id` | Test restaurant lookup functionality | No | None |
| GET | `/:id` | Get restaurant by ID (supports both custom ID & MongoDB ObjectId) | No | None |
| PUT | `/:id` | Update restaurant details | Yes (Restaurant) | `{name?, email?, location?, description?, contactNumber?, etc.}` |
| DELETE | `/:id` | Delete restaurant | Yes (Restaurant) | None |
| PATCH | `/:id/toggle-active` | Toggle restaurant active status | Yes | None |

### **Meal APIs** (`/api/v1/meals`)

| Method | Endpoint | Description | Auth Required | Request Body |
|--------|----------|-------------|---------------|--------------|
| POST | `/:customId/create` | Create meal for restaurant | Yes (Restaurant) | `{name, description?, price, tag?, per?, imageUrl?}` |
| GET | `/` | List all meals | No | None |
| GET | `/:id` | Get meal by custom ID | No | None |
| PUT | `/:id` | Update meal | Yes (Restaurant) | `{name?, description?, price?, tag?, per?, imageUrl?}` |
| DELETE | `/:id` | Delete meal | Yes (Restaurant) | None |
| POST | `/batch` | Add multiple meals | Yes (Restaurant) | `{restaurantId, meals: [{name, description?, price, tag?, per?, imageUrl?}]}` |

### **Order APIs** (`/api/v1/orders`)

| Method | Endpoint | Description | Auth Required | Request Body |
|--------|----------|-------------|---------------|--------------|
| POST | `/create` | Create new order | No | `{user, meals: [{mealId, quantity}], note?, totalPrice, location, phoneNumber, restaurantCustomId, nearestLandmark?, fee?}` |
| GET | `/restaurant/:customId` | Get restaurant orders | Yes (Restaurant) | None |
| GET | `/:orderId` | Get order by ID | No | None |
| GET | `/:userId/order-history` | Get user order history | No | None |
| PATCH | `/:orderId` | Confirm order (restaurant action) | No | `{additionalFee?, requestDescription?}` |
| PATCH | `/deliver/:orderId` | Mark order as delivered | No | None |
| POST | `/:orderId/status` | Update order status (user action) | No | `{action: 'accept'|'reject'}` |

### **Payment APIs** (`/api/v1/pay`)

| Method | Endpoint | Description | Auth Required | Request Body |
|--------|----------|-------------|---------------|--------------|
| POST | `/pay` | Initiate payment via Paystack | No | `{email, amount, user_id}` |
| GET | `/callback` | Payment verification callback | No | Query params from Paystack |

### **Super Admin APIs** (`/api/v1/superadmin`)

| Method | Endpoint | Description | Auth Required | Request Body |
|--------|----------|-------------|---------------|--------------|
| POST | `/restaurants` | Create restaurant | Yes (Admin) | `{name, email, university, location, etc.}` |
| DELETE | `/restaurants/:id` | Delete restaurant by ID | Yes (Admin) | None |
| GET | `/restaurants/:id` | Get restaurant by ID | Yes (Admin) | None |
| GET | `/orders` | Get all orders | Yes (Admin) | None |
| GET | `/orders/:orderId` | Get order by ID | Yes (Admin) | None |

---

## 📋 Request/Response Examples

### **1. User Registration**
```javascript
POST /api/v1/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@student.unilag.edu.ng",
  "password": "securePassword123",
  "phoneNumber": "+2348012345678",
  "university": "University of Lagos",
  "address": "Block A, Room 101, Student Hostel"
}

// Response
{
  "message": "Registration successful! Please check your email to verify your account."
}
```

### **2. Restaurant Creation (Admin)**
```javascript
POST /api/v1/restaurants/create
Authorization: Bearer admin_jwt_token
Content-Type: application/json

{
  "name": "Campus Bites",
  "email": "campusbites@unilag.edu.ng",
  "university": "University of Lagos",
  "location": "Faculty of Engineering Building",
  "description": "Best campus restaurant serving Nigerian and continental dishes",
  "contactNumber": "+2348087654321",
  "bankName": "First Bank Nigeria",
  "accountNumber": "1234567890",
  "accountHolder": "Campus Bites Limited"
}

// Response
{
  "message": "Restaurant registered successfully. Check your email for the password.",
  "restaurant": {
    "id": "675e1234567890abcdef1234",
    "customId": "ABC123",
    "name": "Campus Bites",
    "email": "campusbites@unilag.edu.ng",
    "location": "Faculty of Engineering Building"
  }
}
```

### **3. Create Meal**
```javascript
POST /api/v1/meals/ABC123/create
Authorization: Bearer restaurant_jwt_token
Content-Type: application/json

{
  "name": "Jollof Rice Special",
  "description": "Spicy Nigerian jollof rice with grilled chicken and plantain",
  "price": 1500,
  "tag": "Rice",
  "per": "plate",
  "imageUrl": "https://example.com/jollof-special.jpg"
}

// Response
{
  "message": "Meal created successfully!",
  "meal": {
    "customId": "DEF456",
    "name": "Jollof Rice Special",
    "price": 1500,
    "restaurant": "675e1234567890abcdef1234"
  }
}
```

### **4. Place Order**
```javascript
POST /api/v1/orders/create
Content-Type: application/json

{
  "user": "675e9876543210fedcba9876",
  "meals": [
    {
      "mealId": "DEF456",
      "quantity": 2
    },
    {
      "mealId": "GHI789",
      "quantity": 1
    }
  ],
  "totalPrice": 3500,
  "location": "Student Hostel Block B",
  "phoneNumber": "+2348012345678",
  "restaurantCustomId": "ABC123",
  "nearestLandmark": "Main Gate",
  "note": "Extra spicy please, no pepper for the second order",
  "fee": 600
}

// Response
{
  "message": "Order created successfully, and notification sent to the restaurant!",
  "order": {
    "customId": "ORD123",
    "status": "Pending",
    "totalPrice": 3500,
    "meals": [
      {
        "meal": "675e5555555555555555555",
        "quantity": 2
      }
    ]
  }
}
```

### **5. Get Restaurant by ID (Dual ID Support)**
```javascript
// Using MongoDB ObjectId
GET /api/v1/restaurants/675e1234567890abcdef1234

// Using Custom ID
GET /api/v1/restaurants/ABC123

// Both return the same response
{
  "customId": "ABC123",
  "name": "Campus Bites",
  "email": "campusbites@unilag.edu.ng",
  "university": "University of Lagos",
  "location": "Faculty of Engineering Building",
  "isActive": true,
  "meals": [
    {
      "customId": "DEF456",
      "name": "Jollof Rice Special",
      "price": 1500
    }
  ]
}
```

---

## ⚡ Order Status Flow

```
Pending → Fee Requested → Confirmed → Delivered
    ↓           ↓              ↓
 Canceled   Canceled      [Final State]
```

### **Status Descriptions:**
- **Pending**: Order placed, waiting for restaurant confirmation
- **Fee Requested**: Restaurant requests additional fee beyond standard delivery fee
- **Confirmed**: Order confirmed, payment deducted, preparation started
- **Delivered**: Order successfully delivered to customer
- **Canceled**: Order canceled (various reasons: insufficient balance, rejection, etc.)

---

## 🎯 Key Features & Business Logic

### **1. Dual ID System**
The system supports looking up restaurants by:
- **MongoDB ObjectId**: `675e1234567890abcdef1234` (24-character hex)
- **Custom ID**: `ABC123` (6-character generated ID)

This provides flexibility and user-friendly IDs while maintaining database integrity.

### **2. University-Based Filtering**
- Users see restaurants from their university by default
- Public endpoints show all active restaurants
- Ensures relevant content for campus-specific delivery

### **3. Fee Management System**
- Standard delivery fee: ₦600
- Restaurants can request additional fees
- Users must approve fees above the standard amount
- Automatic order cancellation for insufficient balance

### **4. Wallet System**
- Users maintain "Byte Balance" for payments
- Restaurants have wallet balance for earnings
- Automatic balance updates on order confirmation
- Withdrawal system for restaurants

### **5. Notification System**
- Real-time notifications for users and restaurants
- Email notifications for important events
- SMS notifications for new orders (restaurants)

---

## 🔧 Utility Functions

### **ID Generation** (`utils/generateID.js`)
```javascript
// Generates 6-character uppercase hex string
generateId(length = 6) // Returns: "A1B2C3"
```

### **Enhanced Restaurant Lookup**
```javascript
// Helper function used across controllers
const findRestaurantByIdHelper = async (id) => {
    // Try customId first (case-insensitive)
    let restaurant = await Restaurant.findOne({ 
        customId: { $regex: new RegExp(`^${id}$`, 'i') } 
    });
    
    // If not found and looks like ObjectId, try that
    if (!restaurant && id.match(/^[0-9a-fA-F]{24}$/)) {
        restaurant = await Restaurant.findById(id);
    }
    
    return restaurant;
};
```

---

## ❌ Error Codes & Responses

### **Common HTTP Status Codes:**
- **200**: Success
- **201**: Created successfully
- **400**: Bad request / Validation error
- **401**: Unauthorized / No token provided
- **403**: Forbidden / Access denied
- **404**: Resource not found
- **500**: Internal server error

### **Common Error Response Format:**
```javascript
{
  "message": "Descriptive error message",
  "error": "Detailed error information (in development)",
  "suggestions": "Helpful suggestions for fixing the issue"
}
```

---

## 🔒 Environment Variables Required

```env
# Database
DATABASE_URL=mongodb://localhost:27017/mongobyte

# JWT
JWT_SECRET=your_jwt_secret_key

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Payment (Paystack)
PAYSTACK_SECRET_KEY=sk_test_your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=pk_test_your_paystack_public_key

# SMS (Termii)
TERMII_BASE_URL=https://api.ng.termii.com
TERMII_API_KEY=your_termii_api_key
TERMII_SENDER_ID=your_sender_id

# Cloudinary (Image Upload)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 🚀 Getting Started

1. **Clone the repository**
2. **Install dependencies**: `npm install`
3. **Set up environment variables**
4. **Start MongoDB**
5. **Run the application**: `npm start`
6. **API Base URL**: `http://localhost:3000/api/v1`

---

This documentation covers all models, APIs, authentication methods, and business logic for the Byte! food delivery system. The system is designed to be scalable, secure, and user-friendly for campus food delivery operations.
