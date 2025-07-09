# Restaurant Dashboard Implementation Guide

This document outlines all the API endpoints, data, and features that can be used to build a comprehensive restaurant dashboard for the Byte platform.

## Available API Endpoints for Restaurant Dashboard

### Authentication
```
POST /api/v1/restaurants/login
```
- Used to authenticate restaurant owners
- Returns JWT token for subsequent requests

**Request Body:**
```json
{
  "email": "restaurant@example.com",
  "password": "yourpassword"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "restaurant": {
    "_id": "6123456789abcdef12345678",
    "customId": "REST12345",
    "name": "Restaurant Name",
    "email": "restaurant@example.com",
    "location": "Campus Location",
    "isActive": true
  }
}
```

### Restaurant Profile
```
GET /api/v1/restaurants/{customId}
```
- Returns complete restaurant profile information

**Response:**
```json
{
  "_id": "6123456789abcdef12345678",
  "customId": "REST12345",
  "name": "Restaurant Name",
  "email": "restaurant@example.com",
  "university": {
    "_id": "6123456789abcdef12345679",
    "name": "University Name"
  },
  "description": "Restaurant description and specialty information",
  "location": "Building A, First Floor, Campus Location",
  "contactNumber": "+2348012345678",
  "imageUrl": "https://example.com/images/restaurant-logo.jpg",
  "walletBalance": 45000.75,
  "isActive": true,
  "averageRating": 4.7,
  "totalRatings": 128,
  "ratingsBreakdown": {
    "fiveStars": 85,
    "fourStars": 32,
    "threeStars": 8,
    "twoStars": 2,
    "oneStar": 1
  },
  "bankName": "First Bank",
  "accountNumber": "1234567890",
  "accountHolder": "Restaurant Owner Name",
  "meals": [
    {
      "_id": "6123456789abcdef12345680",
      "name": "Jollof Rice",
      "price": 1500
    },
    // more meals...
  ],
  "createdAt": "2023-01-15T10:30:45.123Z",
  "updatedAt": "2023-07-05T15:22:10.456Z"
}
```

```
PUT /api/v1/restaurants/{customId}
```
- Update restaurant details
- Toggle active/inactive status
- Update menu availability

**Request Body:**
```json
{
  "name": "Updated Restaurant Name",
  "description": "Updated description",
  "location": "New location on campus",
  "contactNumber": "+2348087654321",
  "imageUrl": "https://example.com/images/new-logo.jpg",
  "bankName": "New Bank",
  "accountNumber": "0987654321",
  "accountHolder": "Updated Owner Name"
}
```

**Response:**
```json
{
  "message": "Restaurant updated successfully!",
  "restaurant": {
    "_id": "6123456789abcdef12345678",
    "customId": "REST12345",
    "name": "Updated Restaurant Name",
    "email": "restaurant@example.com",
    "description": "Updated description",
    "location": "New location on campus",
    "contactNumber": "+2348087654321",
    "imageUrl": "https://example.com/images/new-logo.jpg",
    "walletBalance": 45000.75,
    "isActive": true,
    "bankName": "New Bank",
    "accountNumber": "0987654321",
    "accountHolder": "Updated Owner Name",
    "updatedAt": "2023-07-09T14:22:10.456Z"
  }
}
```

### Order Management

```
GET /api/v1/orders/restaurant/{customId}
```
- Returns all orders for the restaurant
- Can filter by status, date range
- Includes customer details, order items, and delivery information

**Query Parameters:**
```
status - Filter by order status (Pending, Confirmed, Delivered, Cancelled)
startDate - Filter orders created after this date (YYYY-MM-DD)
endDate - Filter orders created before this date (YYYY-MM-DD)
```

**Response:**
```json
[
  {
    "_id": "6123456789abcdef12345690",
    "customId": "ORD123456",
    "meals": [
      {
        "meal": {
          "_id": "6123456789abcdef12345680",
          "name": "Jollof Rice",
          "price": 1500,
          "imageUrl": "https://example.com/images/jollof.jpg"
        },
        "quantity": 2,
        "_id": "6123456789abcdef12345691"
      },
      {
        "meal": {
          "_id": "6123456789abcdef12345681",
          "name": "Chicken",
          "price": 1000,
          "imageUrl": "https://example.com/images/chicken.jpg"
        },
        "quantity": 1,
        "_id": "6123456789abcdef12345692"
      }
    ],
    "user": {
      "_id": "6123456789abcdef12345685",
      "username": "student123",
      "email": "student@university.edu",
      "phoneNumber": "+2348012345678"
    },
    "restaurant": "6123456789abcdef12345678",
    "status": "Pending",
    "totalPrice": 4000,
    "fee": 500,
    "location": "Hostel Block B, Room 123",
    "nearestLandmark": "Faculty of Engineering",
    "phoneNumber": "+2348012345678",
    "note": "Extra spicy please",
    "createdAt": "2023-07-08T13:45:30.123Z",
    "updatedAt": "2023-07-08T13:45:30.123Z"
  },
  // more orders...
]
```

```
POST /api/v1/orders/{orderId}/confirm
```
- Confirm an order
- Optionally add additional fee with request description

**Request Body:**
```json
{
  "additionalFee": 500,
  "requestDescription": "Extra distance delivery fee"
}
```

**Response:**
```json
{
  "message": "Order confirmed successfully",
  "order": {
    "_id": "6123456789abcdef12345690",
    "customId": "ORD123456",
    "status": "Confirmed",
    "totalPrice": 4500,
    "fee": 1000,
    "additionalFeeDescription": "Extra distance delivery fee",
    "updatedAt": "2023-07-08T14:15:30.123Z"
  }
}
```

```
PATCH /api/v1/orders/deliver/{orderId}
```
- Mark an order as delivered
- Updates order status and notifies customer

**Response:**
```json
{
  "message": "Order marked as delivered successfully",
  "order": {
    "_id": "6123456789abcdef12345690",
    "customId": "ORD123456",
    "status": "Delivered",
    "updatedAt": "2023-07-08T15:30:30.123Z"
  }
}
```

### Menu Management

```
GET /api/v1/restaurants/mymeals/{customId}
```
- Returns all menu items for the restaurant

**Response:**
```json
[
  {
    "_id": "6123456789abcdef12345680",
    "name": "Jollof Rice",
    "description": "Spicy Nigerian jollof rice with assorted vegetables",
    "price": 1500,
    "tag": "Rice",
    "per": "plate",
    "imageUrl": "https://example.com/images/jollof.jpg",
    "restaurant": "6123456789abcdef12345678",
    "isAvailable": true,
    "createdAt": "2023-01-15T11:30:45.123Z",
    "updatedAt": "2023-06-20T09:15:30.456Z"
  },
  {
    "_id": "6123456789abcdef12345681",
    "name": "Chicken",
    "description": "Grilled spicy chicken",
    "price": 1000,
    "tag": "Protein",
    "per": "piece",
    "imageUrl": "https://example.com/images/chicken.jpg",
    "restaurant": "6123456789abcdef12345678",
    "isAvailable": true,
    "createdAt": "2023-01-15T11:35:45.123Z",
    "updatedAt": "2023-06-20T09:15:30.456Z"
  },
  // more meals...
]
```

```
POST /api/v1/meals/{customId}/create
```
- Add a new menu item

**Request Body:**
```json
{
  "name": "Fried Rice",
  "description": "Delicious fried rice with mixed vegetables and proteins",
  "price": 1600,
  "tag": "Rice",
  "per": "plate",
  "imageUrl": "https://example.com/images/fried-rice.jpg"
}
```

**Response:**
```json
{
  "message": "Meal created successfully",
  "meal": {
    "_id": "6123456789abcdef12345682",
    "name": "Fried Rice",
    "description": "Delicious fried rice with mixed vegetables and proteins",
    "price": 1600,
    "tag": "Rice",
    "per": "plate",
    "imageUrl": "https://example.com/images/fried-rice.jpg",
    "restaurant": "6123456789abcdef12345678",
    "isAvailable": true,
    "createdAt": "2023-07-09T10:45:30.123Z",
    "updatedAt": "2023-07-09T10:45:30.123Z"
  }
}
```

```
PUT /api/v1/meals/{mealId}
```
- Update an existing menu item

**Request Body:**
```json
{
  "name": "Special Fried Rice",
  "description": "Premium fried rice with shrimp, chicken, and assorted vegetables",
  "price": 1800,
  "isAvailable": true
}
```

**Response:**
```json
{
  "message": "Meal updated successfully",
  "meal": {
    "_id": "6123456789abcdef12345682",
    "name": "Special Fried Rice",
    "description": "Premium fried rice with shrimp, chicken, and assorted vegetables",
    "price": 1800,
    "tag": "Rice",
    "per": "plate",
    "imageUrl": "https://example.com/images/fried-rice.jpg",
    "restaurant": "6123456789abcdef12345678",
    "isAvailable": true,
    "updatedAt": "2023-07-09T11:30:45.123Z"
  }
}
```

```
DELETE /api/v1/meals/{mealId}
```
- Remove a menu item from the menu

**Response:**
```json
{
  "message": "Meal deleted successfully"
}
```

### Financials

```
GET /api/v1/restaurants/{customId}/revenue
```
- Get revenue statistics for the restaurant

**Response:**
```json
{
  "totalRevenue": 275000.50,
  "breakdown": {
    "daily": [
      { "date": "2023-07-08", "amount": 15000.00 },
      { "date": "2023-07-07", "amount": 22500.75 },
      { "date": "2023-07-06", "amount": 18750.25 },
      // more daily entries...
    ],
    "weekly": [
      { "week": "2023-W27", "amount": 95000.50 },
      { "week": "2023-W26", "amount": 85750.00 },
      { "week": "2023-W25", "amount": 78500.25 },
      // more weekly entries...
    ],
    "monthly": [
      { "month": "2023-07", "amount": 125000.75 },
      { "month": "2023-06", "amount": 150000.00 },
      // more monthly entries...
    ],
    "fees": 55000.10,
    "foodAmount": 220000.40
  }
}
```

```
POST /api/v1/restaurants/withdraw
```
- Request a withdrawal from wallet balance

**Request Body:**
```json
{
  "restaurantName": "Restaurant Name",
  "amount": 20000
}
```

**Response:**
```json
{
  "message": "Withdrawal created successfully!",
  "withdrawal": {
    "_id": "6123456789abcdef12345695",
    "restaurantName": "Restaurant Name",
    "amount": 20000,
    "status": "pending",
    "createdAt": "2023-07-09T12:30:45.123Z",
    "updatedAt": "2023-07-09T12:30:45.123Z"
  }
}
```

```
GET /api/v1/withdrawals/restaurant/{customId}
```
- Get history of withdrawal requests

**Response:**
```json
[
  {
    "_id": "6123456789abcdef12345695",
    "restaurantName": "Restaurant Name",
    "amount": 20000,
    "status": "pending",
    "createdAt": "2023-07-09T12:30:45.123Z",
    "updatedAt": "2023-07-09T12:30:45.123Z"
  },
  {
    "_id": "6123456789abcdef12345694",
    "restaurantName": "Restaurant Name",
    "amount": 15000,
    "status": "approved",
    "createdAt": "2023-06-25T10:15:30.456Z",
    "processedAt": "2023-06-26T09:20:15.789Z",
    "updatedAt": "2023-06-26T09:20:15.789Z"
  },
  // more withdrawal history...
]
```

### Notifications

```
GET /api/v1/restaurants/notifications
```
- Get all notifications for the authenticated restaurant

**Response:**
```json
[
  {
    "_id": "6123456789abcdef12345699",
    "restaurantId": "6123456789abcdef12345678",
    "message": "New order received! Order #ORD123456 has been placed.",
    "read": false,
    "type": "order",
    "relatedId": "6123456789abcdef12345690",
    "createdAt": "2023-07-08T13:45:30.123Z",
    "updatedAt": "2023-07-08T13:45:30.123Z"
  },
  {
    "_id": "6123456789abcdef12345698",
    "restaurantId": "6123456789abcdef12345678",
    "message": "A withdrawal request of ₦15000 has been created. Your wallet balance has been updated.",
    "read": true,
    "type": "system",
    "relatedId": "6123456789abcdef12345694",
    "createdAt": "2023-06-25T10:15:30.456Z",
    "updatedAt": "2023-06-25T10:15:30.456Z"
  },
  // more notifications...
]
```

## Dashboard Components & Features

### 1. Dashboard Overview

**Key Metrics for Display:**
- Total Orders (Today/This Week/This Month)
- Total Revenue
- Average Order Value
- Active Menu Items
- Pending Orders
- Orders Requiring Action (Fee Approval, etc.)

**API Endpoints Used:**
- `GET /api/v1/orders/restaurant/{customId}` - To fetch all orders
- `GET /api/v1/restaurants/{customId}` - To get restaurant details including wallet balance
- `GET /api/v1/restaurants/mymeals/{customId}` - To get active menu items

**Sample API Response Data:**
```json
// Orders data (filtered for today, this week, this month)
{
  "todayOrders": [
    {
      "_id": "6123456789abcdef12345690",
      "customId": "ORD123456",
      "status": "Pending",
      "totalPrice": 4000,
      "createdAt": "2023-07-09T13:45:30.123Z"
    },
    {
      "_id": "6123456789abcdef12345691",
      "customId": "ORD123457",
      "status": "Confirmed",
      "totalPrice": 3500,
      "createdAt": "2023-07-09T10:15:22.456Z"
    }
    // more orders...
  ],
  "pendingOrders": [
    {
      "_id": "6123456789abcdef12345690",
      "customId": "ORD123456",
      "status": "Pending",
      "totalPrice": 4000,
      "createdAt": "2023-07-09T13:45:30.123Z"
    }
    // more pending orders...
  ],
  "weeklyOrders": [
    // orders from this week...
  ],
  "monthlyOrders": [
    // orders from this month...
  ],
  "restaurant": {
    "walletBalance": 45000.75,
    "meals": [
      // active meals...
    ]
  }
}
```

**Example Implementation:**
```jsx
<DashboardOverview>
  <MetricCard 
    title="Today's Orders" 
    value={todayOrders.length} 
    trend={calculateTrend(todayOrders, yesterdayOrders)} 
  />
  <MetricCard 
    title="Today's Revenue" 
    value={`₦${calculateRevenue(todayOrders).toFixed(2)}`} 
    trend={calculateTrend(calculateRevenue(todayOrders), calculateRevenue(yesterdayOrders))} 
  />
  <MetricCard 
    title="Pending Orders" 
    value={pendingOrders.length} 
    highlight={pendingOrders.length > 0} 
  />
  <MetricCard 
    title="Wallet Balance" 
    value={`₦${restaurant.walletBalance.toFixed(2)}`} 
  />
</DashboardOverview>
```

### 2. Active Orders Management

**Features:**
- List of pending orders requiring action
- Ability to confirm orders
- Request additional fees with explanation
- Mark orders as delivered
- View order details (items, customer info, delivery location)

**API Endpoints Used:**
- `GET /api/v1/orders/restaurant/{customId}` - To fetch active orders
- `POST /api/v1/orders/{orderId}/confirm` - To confirm an order
- `PATCH /api/v1/orders/deliver/{orderId}` - To mark an order as delivered

**Sample API Response Data:**
```json
// Active orders data
{
  "activeOrders": [
    {
      "_id": "6123456789abcdef12345690",
      "customId": "ORD123456",
      "meals": [
        {
          "meal": {
            "_id": "6123456789abcdef12345680",
            "name": "Jollof Rice",
            "price": 1500,
            "imageUrl": "https://example.com/images/jollof.jpg"
          },
          "quantity": 2,
          "_id": "6123456789abcdef12345691"
        },
        {
          "meal": {
            "_id": "6123456789abcdef12345681",
            "name": "Chicken",
            "price": 1000,
            "imageUrl": "https://example.com/images/chicken.jpg"
          },
          "quantity": 1,
          "_id": "6123456789abcdef12345692"
        }
      ],
      "user": {
        "_id": "6123456789abcdef12345685",
        "username": "student123",
        "email": "student@university.edu",
        "phoneNumber": "+2348012345678"
      },
      "status": "Pending",
      "totalPrice": 4000,
      "fee": 500,
      "location": "Hostel Block B, Room 123",
      "nearestLandmark": "Faculty of Engineering",
      "phoneNumber": "+2348012345678",
      "note": "Extra spicy please",
      "createdAt": "2023-07-09T13:45:30.123Z"
    },
    {
      "_id": "6123456789abcdef12345693",
      "customId": "ORD123457",
      "meals": [
        {
          "meal": {
            "_id": "6123456789abcdef12345682",
            "name": "Fried Rice",
            "price": 1600,
            "imageUrl": "https://example.com/images/fried-rice.jpg"
          },
          "quantity": 1,
          "_id": "6123456789abcdef12345694"
        }
      ],
      "user": {
        "_id": "6123456789abcdef12345686",
        "username": "student456",
        "email": "student456@university.edu",
        "phoneNumber": "+2348023456789"
      },
      "status": "Confirmed",
      "totalPrice": 1600,
      "fee": 400,
      "location": "Hostel Block C, Room 210",
      "nearestLandmark": "Faculty of Science",
      "phoneNumber": "+2348023456789",
      "createdAt": "2023-07-09T11:30:15.789Z"
    }
  ]
}
```

**Example Implementation:**
```jsx
<ActiveOrdersSection>
  <SectionHeader>
    <h2>Active Orders</h2>
    <OrderFilter onChange={handleFilterChange} />
  </SectionHeader>
  
  <OrderList>
    {activeOrders.map(order => (
      <OrderCard key={order.customId}>
        <OrderHeader>
          <OrderID>#{order.customId}</OrderID>
          <OrderStatus status={order.status}>{order.status}</OrderStatus>
          <OrderTime>{formatTime(order.createdAt)}</OrderTime>
        </OrderHeader>
        
        <OrderDetails>
          <OrderItems>
            {order.meals.map(meal => (
              <OrderItem key={meal._id}>
                {meal.quantity}x {meal.meal.name} - ₦{meal.meal.price}
              </OrderItem>
            ))}
          </OrderItems>
          
          <CustomerInfo>
            <p><strong>Customer:</strong> {order.user.username}</p>
            <p><strong>Location:</strong> {order.location}</p>
            <p><strong>Phone:</strong> {order.phoneNumber}</p>
            {order.nearestLandmark && (
              <p><strong>Landmark:</strong> {order.nearestLandmark}</p>
            )}
          </CustomerInfo>
        </OrderDetails>
        
        <OrderActions>
          {order.status === 'Pending' && (
            <>
              <Button onClick={() => confirmOrder(order.customId)}>
                Confirm Order
              </Button>
              <Button onClick={() => openFeeRequestModal(order)}>
                Request Additional Fee
              </Button>
            </>
          )}
          
          {order.status === 'Confirmed' && (
            <Button primary onClick={() => markAsDelivered(order.customId)}>
              Mark as Delivered
            </Button>
          )}
        </OrderActions>
      </OrderCard>
    ))}
  </OrderList>
</ActiveOrdersSection>
```

### 3. Order History & Analytics

**Features:**
- Historical order data
- Filter by date range, status
- Search functionality
- Export to CSV
- Visualizations (order volume, revenue trends)

**API Endpoints Used:**
- `GET /api/v1/orders/restaurant/{customId}` - To fetch all orders with filters
- `GET /api/v1/restaurants/{customId}/revenue` - To get revenue statistics

**Sample API Response Data:**
```json
// Order history with filters
{
  "filteredOrders": [
    {
      "_id": "6123456789abcdef12345690",
      "customId": "ORD123456",
      "meals": [
        {
          "meal": {
            "name": "Jollof Rice",
            "price": 1500
          },
          "quantity": 2
        },
        {
          "meal": {
            "name": "Chicken",
            "price": 1000
          },
          "quantity": 1
        }
      ],
      "user": {
        "username": "student123"
      },
      "status": "Delivered",
      "totalPrice": 4000,
      "fee": 500,
      "createdAt": "2023-07-02T13:45:30.123Z"
    },
    // more orders...
  ],
  
  // Data for visualizations
  "orderVolumeData": [
    { "date": "2023-07-01", "count": 10 },
    { "date": "2023-07-02", "count": 15 },
    { "date": "2023-07-03", "count": 8 },
    { "date": "2023-07-04", "count": 12 },
    { "date": "2023-07-05", "count": 17 },
    { "date": "2023-07-06", "count": 14 },
    { "date": "2023-07-07", "count": 22 }
  ],
  "revenueData": [
    { "date": "2023-07-01", "amount": 25000 },
    { "date": "2023-07-02", "amount": 35000 },
    { "date": "2023-07-03", "amount": 18000 },
    { "date": "2023-07-04", "amount": 28000 },
    { "date": "2023-07-05", "amount": 40000 },
    { "date": "2023-07-06", "amount": 32000 },
    { "date": "2023-07-07", "amount": 50000 }
  ],
  
  // Column definitions for the table
  "orderTableColumns": [
    { "field": "customId", "header": "Order ID" },
    { "field": "user.username", "header": "Customer" },
    { "field": "totalPrice", "header": "Amount" },
    { "field": "status", "header": "Status" },
    { "field": "createdAt", "header": "Date" }
  ]
}
```

**Example Implementation:**
```jsx
<OrderHistorySection>
  <SectionHeader>
    <h2>Order History</h2>
    <div className="filters">
      <DateRangePicker onChange={handleDateChange} />
      <StatusFilter onChange={handleStatusChange} />
      <SearchInput placeholder="Search orders..." onChange={handleSearch} />
      <ExportButton onClick={exportToCSV}>Export to CSV</ExportButton>
    </div>
  </SectionHeader>
  
  <OrderAnalytics>
    <AnalyticsCard>
      <LineChart 
        data={orderVolumeData} 
        xKey="date" 
        yKey="count" 
        title="Order Volume" 
      />
    </AnalyticsCard>
    <AnalyticsCard>
      <LineChart 
        data={revenueData} 
        xKey="date" 
        yKey="amount" 
        title="Revenue Trends" 
      />
    </AnalyticsCard>
  </OrderAnalytics>
  
  <OrderTable 
    data={filteredOrders} 
    columns={orderTableColumns} 
    pagination={true} 
    onRowClick={handleOrderClick} 
  />
</OrderHistorySection>
```

### 4. Menu Management

**Features:**
- List all menu items
- Add new items
- Update existing items (price, description, availability)
- Upload item images
- Categorize menu items

**API Endpoints Used:**
- `GET /api/v1/restaurants/mymeals/{customId}` - To fetch all menu items
- `POST /api/v1/meals/{customId}/create` - To add a new menu item
- `PUT /api/v1/meals/{mealId}` - To update an existing menu item
- `DELETE /api/v1/meals/{mealId}` - To delete a menu item

**Sample API Response Data:**
```json
// Menu items data
{
  "menuItems": [
    {
      "_id": "6123456789abcdef12345680",
      "name": "Jollof Rice",
      "description": "Spicy Nigerian jollof rice with assorted vegetables",
      "price": 1500,
      "tag": "Rice",
      "per": "plate",
      "imageUrl": "https://example.com/images/jollof.jpg",
      "restaurant": "6123456789abcdef12345678",
      "isAvailable": true,
      "createdAt": "2023-01-15T11:30:45.123Z",
      "updatedAt": "2023-06-20T09:15:30.456Z"
    },
    {
      "_id": "6123456789abcdef12345681",
      "name": "Chicken",
      "description": "Grilled spicy chicken",
      "price": 1000,
      "tag": "Protein",
      "per": "piece",
      "imageUrl": "https://example.com/images/chicken.jpg",
      "restaurant": "6123456789abcdef12345678",
      "isAvailable": true,
      "createdAt": "2023-01-15T11:35:45.123Z",
      "updatedAt": "2023-06-20T09:15:30.456Z"
    },
    {
      "_id": "6123456789abcdef12345682",
      "name": "Fried Rice",
      "description": "Delicious fried rice with mixed vegetables and proteins",
      "price": 1600,
      "tag": "Rice",
      "per": "plate",
      "imageUrl": "https://example.com/images/fried-rice.jpg",
      "restaurant": "6123456789abcdef12345678",
      "isAvailable": true,
      "createdAt": "2023-02-05T14:22:33.789Z",
      "updatedAt": "2023-06-20T09:15:30.456Z"
    }
  ],
  
  // Menu categories extracted from tags
  "categories": ["Rice", "Protein", "Sides", "Drinks", "Desserts"]
}
```

**Example Implementation:**
```jsx
<MenuManagementSection>
  <SectionHeader>
    <h2>Menu Management</h2>
    <Button primary onClick={openAddItemModal}>Add New Item</Button>
  </SectionHeader>
  
  <MenuCategories>
    <CategoryTabs categories={categories} activeCategory={activeCategory} onChange={setActiveCategory} />
  </MenuCategories>
  
  <MenuItemsGrid>
    {filteredMenuItems.map(item => (
      <MenuItem key={item._id}>
        <MenuItemImage src={item.imageUrl} alt={item.name} />
        <MenuItemDetails>
          <MenuItemName>{item.name}</MenuItemName>
          <MenuItemPrice>₦{item.price.toFixed(2)}</MenuItemPrice>
          <MenuItemDescription>{item.description}</MenuItemDescription>
        </MenuItemDetails>
        <MenuItemActions>
          <ToggleSwitch 
            label="Available" 
            checked={item.isAvailable} 
            onChange={() => toggleItemAvailability(item._id)} 
          />
          <IconButton icon={<EditIcon />} onClick={() => openEditItemModal(item)} />
          <IconButton icon={<DeleteIcon />} onClick={() => confirmDeleteItem(item._id)} />
        </MenuItemActions>
      </MenuItem>
    ))}
  </MenuItemsGrid>
</MenuManagementSection>
```

### 5. Financial Management

**Features:**
- Wallet balance display
- Revenue statistics
- Request withdrawals
- Withdrawal history
- Fee breakdown

**API Endpoints Used:**
- `GET /api/v1/restaurants/{customId}` - To get wallet balance
- `GET /api/v1/restaurants/{customId}/revenue` - To get revenue statistics
- `POST /api/v1/restaurants/withdraw` - To request a withdrawal
- `GET /api/v1/withdrawals/restaurant/{customId}` - To get withdrawal history

**Sample API Response Data:**
```json
// Financial data
{
  "restaurant": {
    "walletBalance": 45000.75
  },
  
  // Revenue statistics
  "revenueStats": {
    "totalRevenue": 275000.50,
    "foodAmount": 220000.40,
    "feeAmount": 55000.10
  },
  
  // Monthly revenue for charts
  "monthlyRevenueData": [
    { "month": "Jan", "amount": 35000.25 },
    { "month": "Feb", "amount": 40000.50 },
    { "month": "Mar", "amount": 37500.75 },
    { "month": "Apr", "amount": 42000.00 },
    { "month": "May", "amount": 45000.25 },
    { "month": "Jun", "amount": 50000.00 },
    { "month": "Jul", "amount": 25000.75 }
  ],
  
  // Withdrawal history
  "withdrawalHistory": [
    {
      "_id": "6123456789abcdef12345695",
      "restaurantName": "Restaurant Name",
      "amount": 20000,
      "status": "pending",
      "createdAt": "2023-07-09T12:30:45.123Z"
    },
    {
      "_id": "6123456789abcdef12345694",
      "restaurantName": "Restaurant Name",
      "amount": 15000,
      "status": "approved",
      "createdAt": "2023-06-25T10:15:30.456Z",
      "processedAt": "2023-06-26T09:20:15.789Z"
    },
    {
      "_id": "6123456789abcdef12345693",
      "restaurantName": "Restaurant Name",
      "amount": 30000,
      "status": "approved",
      "createdAt": "2023-05-15T11:45:22.789Z",
      "processedAt": "2023-05-16T14:30:45.123Z"
    }
  ]
}
```

**Example Implementation:**
```jsx
<FinancialsSection>
  <WalletCard>
    <WalletBalance>₦{restaurant.walletBalance.toFixed(2)}</WalletBalance>
    <WalletActions>
      <Button primary onClick={openWithdrawalModal}>Request Withdrawal</Button>
    </WalletActions>
  </WalletCard>
  
  <RevenueAnalytics>
    <AnalyticsCard>
      <h3>Revenue Breakdown</h3>
      <PieChart 
        data={[
          { name: 'Food Amount', value: revenueStats.foodAmount },
          { name: 'Delivery Fees', value: revenueStats.feeAmount }
        ]} 
      />
    </AnalyticsCard>
    <AnalyticsCard>
      <h3>Monthly Revenue</h3>
      <BarChart 
        data={monthlyRevenueData} 
        xKey="month" 
        yKey="amount" 
      />
    </AnalyticsCard>
  </RevenueAnalytics>
  
  <WithdrawalHistory>
    <h3>Withdrawal History</h3>
    <DataTable 
      data={withdrawalHistory} 
      columns={[
        { field: 'amount', header: 'Amount' },
        { field: 'status', header: 'Status' },
        { field: 'createdAt', header: 'Date Requested' },
        { field: 'processedAt', header: 'Date Processed' }
      ]} 
    />
  </WithdrawalHistory>
</FinancialsSection>
```

### 6. Settings & Profile

**Features:**
- Update restaurant information
- Operating hours management
- Toggle restaurant active/inactive status
- Update contact information
- Upload/update logo and banner images

**API Endpoints Used:**
- `GET /api/v1/restaurants/{customId}` - To get restaurant profile data
- `PUT /api/v1/restaurants/{customId}` - To update restaurant details
- `PATCH /api/v1/restaurants/{customId}/toggle-active` - To toggle active/inactive status

**Sample API Response Data:**
```json
// Restaurant profile data
{
  "restaurant": {
    "_id": "6123456789abcdef12345678",
    "customId": "REST12345",
    "name": "Restaurant Name",
    "email": "restaurant@example.com",
    "description": "Restaurant description and specialty information",
    "location": "Building A, First Floor, Campus Location",
    "contactNumber": "+2348012345678",
    "logoUrl": "https://example.com/images/restaurant-logo.jpg",
    "bannerUrl": "https://example.com/images/restaurant-banner.jpg",
    "isActive": true,
    "bankName": "First Bank",
    "accountNumber": "1234567890",
    "accountHolder": "Restaurant Owner Name",
    "operatingHours": [
      { "day": "Monday", "open": "08:00", "close": "20:00", "isOpen": true },
      { "day": "Tuesday", "open": "08:00", "close": "20:00", "isOpen": true },
      { "day": "Wednesday", "open": "08:00", "close": "20:00", "isOpen": true },
      { "day": "Thursday", "open": "08:00", "close": "20:00", "isOpen": true },
      { "day": "Friday", "open": "08:00", "close": "22:00", "isOpen": true },
      { "day": "Saturday", "open": "10:00", "close": "22:00", "isOpen": true },
      { "day": "Sunday", "open": "12:00", "close": "18:00", "isOpen": true }
    ]
  }
}
```

**Example Implementation:**
```jsx
<SettingsSection>
  <ProfileCard>
    <ProfileImageUpload 
      currentImage={restaurant.logoUrl} 
      onUpload={handleLogoUpload} 
      label="Restaurant Logo" 
    />
    <BannerImageUpload 
      currentImage={restaurant.bannerUrl} 
      onUpload={handleBannerUpload} 
      label="Restaurant Banner" 
    />
    <ProfileForm onSubmit={handleProfileUpdate} initialValues={restaurant} />
  </ProfileCard>
  
  <OperatingHoursCard>
    <h3>Operating Hours</h3>
    <OperatingHoursEditor 
      hours={restaurant.operatingHours} 
      onChange={handleHoursChange} 
    />
  </OperatingHoursCard>
  
  <StatusToggleCard>
    <h3>Restaurant Status</h3>
    <StatusToggle 
      isActive={restaurant.isActive} 
      onChange={toggleRestaurantStatus} 
    />
    <StatusDescription>
      {restaurant.isActive 
        ? "Your restaurant is currently visible to customers and accepting orders." 
        : "Your restaurant is currently hidden from customers and not accepting orders."}
    </StatusDescription>
  </StatusToggleCard>
</SettingsSection>
```

### 7. Notifications Center

**Features:**
- Real-time notifications for new orders
- System messages
- Mark notifications as read
- Filter by type

**API Endpoints Used:**
- `GET /api/v1/restaurants/notifications` - To get all notifications for the restaurant
- `PATCH /api/v1/notifications/{notificationId}/read` - To mark a notification as read
- `PATCH /api/v1/notifications/read-all` - To mark all notifications as read

**Sample API Response Data:**
```json
// Notifications data
{
  "notifications": [
    {
      "_id": "6123456789abcdef12345699",
      "restaurantId": "6123456789abcdef12345678",
      "message": "New order received! Order #ORD123456 has been placed.",
      "read": false,
      "type": "order",
      "relatedId": "6123456789abcdef12345690",
      "createdAt": "2023-07-09T13:45:30.123Z",
      "updatedAt": "2023-07-09T13:45:30.123Z"
    },
    {
      "_id": "6123456789abcdef12345698",
      "restaurantId": "6123456789abcdef12345678",
      "message": "A withdrawal request of ₦15000 has been created. Your wallet balance has been updated.",
      "read": true,
      "type": "system",
      "relatedId": "6123456789abcdef12345694",
      "createdAt": "2023-06-25T10:15:30.456Z",
      "updatedAt": "2023-06-25T10:15:30.456Z"
    },
    {
      "_id": "6123456789abcdef12345697",
      "restaurantId": "6123456789abcdef12345678",
      "message": "Order #ORD123455 has been delivered successfully.",
      "read": true,
      "type": "order",
      "relatedId": "6123456789abcdef12345680",
      "createdAt": "2023-06-20T15:30:45.789Z",
      "updatedAt": "2023-06-20T15:30:45.789Z"
    }
  ]
}
```

**Example Implementation:**
```jsx
<NotificationsCenter>
  <NotificationHeader>
    <h2>Notifications</h2>
    <Button text onClick={markAllAsRead}>Mark all as read</Button>
  </NotificationHeader>
  
  <NotificationFilters>
    <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>All</FilterButton>
    <FilterButton active={filter === 'orders'} onClick={() => setFilter('orders')}>Orders</FilterButton>
    <FilterButton active={filter === 'system'} onClick={() => setFilter('system')}>System</FilterButton>
  </NotificationFilters>
  
  <NotificationList>
    {filteredNotifications.map(notification => (
      <NotificationItem 
        key={notification._id} 
        read={notification.read} 
        onClick={() => markAsRead(notification._id)}
      >
        <NotificationContent>{notification.message}</NotificationContent>
        <NotificationTime>{formatTime(notification.createdAt)}</NotificationTime>
      </NotificationItem>
    ))}
  </NotificationList>
</NotificationsCenter>
```
