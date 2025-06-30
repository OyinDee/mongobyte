# Advanced Orders API Documentation

## Overview
The Advanced Orders API provides sophisticated ordering features including scheduled orders, group orders, referral system, and quick reorders. All endpoints require authentication via Bearer token.

**Base URL:** `https://mongobyte.onrender.com/api/v1/advanced-orders`

**Authentication:** All endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 🕐 Scheduled Orders

### Create Scheduled Order
**POST** `/scheduled`

Create a pre-order for specific times with optional recurring patterns.

**Request Body:**
```json
{
  "meals": [
    {
      "meal": "meal_id_here",
      "quantity": 2
    }
  ],
  "restaurant": "restaurant_id_here",
  "scheduledFor": "2024-01-15T12:00:00Z",
  "repeatType": "weekly", // none, daily, weekly, monthly
  "repeatDays": ["monday", "wednesday", "friday"], // for weekly repeats
  "endDate": "2024-06-15T12:00:00Z", // optional
  "note": "Lunch order for cafeteria",
  "recipient": {
    "name": "John Doe",
    "phone": "+1234567890",
    "instructions": "Deliver to room 204"
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Scheduled order created successfully",
  "data": {
    "_id": "scheduled_order_id",
    "user": "user_id",
    "meals": [...],
    "restaurant": {...},
    "scheduledFor": "2024-01-15T12:00:00Z",
    "status": "pending",
    "totalAmount": 25.50,
    "repeatType": "weekly",
    "createdAt": "2024-01-10T10:00:00Z"
  }
}
```

### Get User Scheduled Orders
**GET** `/scheduled?page=1&limit=10&status=pending`

Retrieve user's scheduled orders with pagination and filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Filter by status (pending, active, completed, cancelled)

**Response (200):**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalOrders": 25,
    "ordersPerPage": 10
  }
}
```

### Cancel Scheduled Order
**PUT** `/scheduled/{orderId}/cancel`

Cancel a pending scheduled order.

**Response (200):**
```json
{
  "success": true,
  "message": "Scheduled order cancelled successfully"
}
```

---

## 👥 Group Orders

### Create Group Order
**POST** `/group`

Create a collaborative order where multiple users can join and split bills.

**Request Body:**
```json
{
  "title": "Lunch Group Order - Engineering Block",
  "description": "Let's order together for better deals!",
  "restaurant": "restaurant_id_here",
  "orderDeadline": "2024-01-15T11:30:00Z",
  "deliveryTime": "2024-01-15T12:30:00Z",
  "deliveryInfo": {
    "address": "Engineering Block, Room 301",
    "landmark": "Near the elevator",
    "instructions": "Call when you arrive"
  },
  "maxParticipants": 10,
  "minOrderAmount": 50.00,
  "splitMethod": "individual", // individual, equal, custom
  "isPublic": true
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Group order created successfully",
  "data": {
    "_id": "group_order_id",
    "title": "Lunch Group Order - Engineering Block",
    "creator": {...},
    "restaurant": {...},
    "status": "open",
    "participants": [
      {
        "user": {...},
        "joinedAt": "2024-01-15T10:00:00Z",
        "meals": [],
        "subtotal": 0
      }
    ],
    "inviteCode": "GRP123456",
    "totalAmount": 0,
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

### Get Public Group Orders
**GET** `/group/public?page=1&limit=10&restaurant=restaurant_id&university=true`

Browse available public group orders.

**Query Parameters:**
- `page` (optional): Page number
- `limit` (optional): Items per page
- `restaurant` (optional): Filter by restaurant ID
- `university` (optional): Filter by user's university

**Response (200):**
```json
{
  "success": true,
  "data": [...],
  "pagination": {...}
}
```

### Join Group Order
**POST** `/group/{orderId}/join`

Join an existing group order.

**Response (200):**
```json
{
  "success": true,
  "message": "Successfully joined group order",
  "data": {
    "groupOrder": {...},
    "participantInfo": {...}
  }
}
```

### Add Meals to Group Order
**POST** `/group/{orderId}/meals`

Add meals to your order within a group order. Subtotal is automatically calculated.

**Request Body:**
```json
{
  "meals": [
    {
      "meal": "meal_id_here",
      "quantity": 2
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Meals added to group order successfully",
  "data": {
    "subtotal": 25.50,
    "meals": [...],
    "groupTotal": 75.00
  }
}
```

### Process Group Order Payment
**POST** `/group/{orderId}/pay`

Pay for your portion of the group order. Money is deducted from your byte balance immediately.

**Response (200):**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "amountPaid": 25.50,
    "newBalance": 74.50,
    "allPaid": false,
    "orderStatus": "open"
  }
}
```

**Note:** When all participants have paid, the order status automatically changes to "ready" and is sent to the restaurant for review.

### Get Payment Status
**GET** `/group/{orderId}/payment-status`

Check who has paid and who hasn't in the group order.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "yourPayment": {
      "amount": 25.50,
      "hasPaid": true
    },
    "groupSummary": {
      "totalParticipants": 3,
      "paidParticipants": 2,
      "unpaidParticipants": [
        {
          "username": "pending_user",
          "amount": 18.00
        }
      ],
      "orderStatus": "open",
      "allPaid": false
    }
  }
}
```

### Process Refund
**POST** `/group/{orderId}/refund`

Process refunds for a cancelled group order (creator only).

**Response (200):**
```json
{
  "success": true,
  "message": "Refunds processed successfully",
  "data": {
    "refundsProcessed": 2,
    "totalRefunded": 43.50,
    "refunds": [...]
  }
}
```

### Group Order Chat
**POST** `/group/{orderId}/chat`

Add a message to group order chat.

**Request Body:**
```json
{
  "message": "What time should we set for delivery?"
}
```

**GET** `/group/{orderId}/chat?page=1&limit=50`

Get chat messages for a group order.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "message_id",
      "user": {
        "username": "john_doe"
      },
      "message": "What time should we set for delivery?",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {...}
}
```

### Leave Group Order
**POST** `/group/{orderId}/leave`

Leave a group order (creators cannot leave, they must cancel instead).

### Cancel Group Order
**PUT** `/group/{orderId}/cancel`

Cancel a group order (creator only).

---

## 🎁 Referral System

### Generate Referral Code
**POST** `/referral/generate`

Generate a personal referral code for inviting friends.

**Response (201):**
```json
{
  "success": true,
  "message": "Referral code generated successfully",
  "data": {
    "_id": "referral_id",
    "referralCode": "JOHN123ABC",
    "rewardAmount": 5.00,
    "bonusAmount": 2.00,
    "totalUses": 0,
    "maxUses": 10,
    "expiresAt": "2024-06-15T23:59:59Z",
    "isActive": true
  }
}
```

### Use Referral Code
**POST** `/referral/use`

Apply a referral code to receive rewards.

**Request Body:**
```json
{
  "referralCode": "JANE456XYZ"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Referral code applied successfully! You earned $5.00 credit.",
  "data": {
    "rewardEarned": 5.00,
    "newBalance": 15.00,
    "referrerBonus": 2.00
  }
}
```

---

## ⚡ Quick Reorder

### Save Quick Reorder
**POST** `/quick-reorder`

Save a completed order as a quick reorder template.

**Request Body:**
```json
{
  "orderId": "completed_order_id",
  "name": "My Usual Breakfast" // optional custom name
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Order saved for quick reorder",
  "data": {
    "_id": "quick_reorder_id",
    "name": "My Usual Breakfast",
    "originalOrder": {...},
    "meals": [...],
    "restaurant": {...},
    "totalAmount": 12.50,
    "createdAt": "2024-01-15T10:00:00Z"
  }
}
```

### Get Quick Reorders
**GET** `/quick-reorder`

Get all saved quick reorder templates.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "quick_reorder_id",
      "name": "My Usual Breakfast",
      "meals": [...],
      "restaurant": {...},
      "totalAmount": 12.50,
      "lastUsed": "2024-01-14T08:00:00Z",
      "timesUsed": 5
    }
  ]
}
```

### Execute Quick Reorder
**POST** `/quick-reorder/{reorderId}/execute`

Place a new order using a quick reorder template.

**Request Body (optional):**
```json
{
  "location": "Updated delivery address",
  "phoneNumber": "+1234567890",
  "nearestLandmark": "New landmark",
  "note": "Special delivery instructions"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Order placed successfully using quick reorder",
  "data": {
    "order": {...}, // New order details
    "estimatedDelivery": "2024-01-15T13:00:00Z"
  }
}
```

---

## Error Responses

All endpoints return consistent error responses:

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Validation error message",
  "errors": ["Specific field errors"]
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Authentication required"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "Access denied"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Detailed error message"
}
```

---

## Usage Examples

### JavaScript/React Frontend Example
```javascript
// Configure headers for all requests
const API_BASE = 'https://mongobyte.onrender.com/api/v1';
const token = localStorage.getItem('authToken');

const apiHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
  'x-request-hash': 'your-request-hash' // If needed
};

// Create a scheduled order
const createScheduledOrder = async (orderData) => {
  try {
    const response = await fetch(`${API_BASE}/advanced-orders/scheduled`, {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify(orderData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Scheduled order created:', result.data);
      return result.data;
    } else {
      console.error('Error:', result.message);
    }
  } catch (error) {
    console.error('Network error:', error);
  }
};

// Join a group order
const joinGroupOrder = async (orderId) => {
  try {
    const response = await fetch(`${API_BASE}/advanced-orders/group/${orderId}/join`, {
      method: 'POST',
      headers: apiHeaders
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error joining group order:', error);
  }
};

// Use referral code
const useReferralCode = async (code) => {
  try {
    const response = await fetch(`${API_BASE}/advanced-orders/referral/use`, {
      method: 'POST',
      headers: apiHeaders,
      body: JSON.stringify({ referralCode: code })
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error using referral code:', error);
  }
};
```

---

## Integration Notes

1. **Authentication**: All endpoints require a valid JWT token
2. **CORS**: The API supports cross-origin requests from approved domains
3. **Rate Limiting**: Standard rate limiting applies to prevent abuse
4. **Pagination**: Most list endpoints support pagination via `page` and `limit` parameters
5. **Real-time Updates**: Group order chat and status updates can be integrated with WebSocket for real-time features
6. **Background Processing**: Scheduled orders are processed automatically by the system scheduler

---

## Support Features

- **Swagger Documentation**: Full API documentation available at `/api-docs`
- **Error Logging**: Comprehensive error logging for debugging
- **Data Validation**: Input validation on all endpoints
- **Optimistic Concurrency**: Prevents conflicts in group orders
- **Transaction Safety**: Database operations use transactions where appropriate

---

For more detailed examples and integration guides, refer to the Swagger documentation at: `https://mongobyte.onrender.com/api-docs`

---

## 🏫 University Management

### Update User University
**PUT** `/api/v1/users/updateUniversity`

Allow users to change their university affiliation.

**Request Body:**
```json
{
  "universityId": "university_id_here"
}
```

**Response (200):**
```json
{
  "status": "success",
  "message": "University updated successfully",
  "data": {
    "user": {
      "id": "user_id",
      "username": "john_doe",
      "email": "john@example.com",
      "university": {
        "_id": "university_id",
        "name": "University of Technology"
      },
      "byteBalance": 100.00
    }
  }
}
```

**Error Responses:**
```json
{
  "status": "error",
  "message": "University not found"
}
```

---

## 📊 Data Migration Notice

**Important:** Users created before the university field was introduced have been automatically migrated to a "Default University". Users should update their university using the `PUT /api/v1/users/updateUniversity` endpoint.

### Migration Status Check
If you encounter users without university data, the system will automatically:
1. Assign them to "Default University" 
2. Prompt them to update their university via the frontend
3. Handle the population gracefully in all API responses

---

## 🔧 CORS Configuration Fixed

The CORS issue with `x-request-hash` header has been resolved. The API now accepts the following headers:
- `Content-Type`
- `Authorization` 
- `x-request-hash`
- `X-Requested-With`
- `Accept`

**Frontend Configuration:**
```javascript
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
  'x-request-hash': 'your-hash-value'
};
```
