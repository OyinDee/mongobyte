const { getBreakdown } = require('./restaurantRevenueHelpers');
// Get total and breakdown revenue for a restaurant
exports.getRestaurantRevenue = async (req, res) => {
  const { id } = req.params;
  const { 
    page = 1, 
    limit = 10, 
    cursor, 
    sortBy = 'date', 
    sortOrder = 'desc', 
    startDate, 
    endDate, 
    type = 'day' // day, month, or year
  } = req.query;
  
  try {
    // Find restaurant by customId or ObjectId
    let restaurant = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      restaurant = await Restaurant.findById(id);
    }
    if (!restaurant) {
      restaurant = await Restaurant.findOne({ customId: id });
    }
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }

    // Build date filter if provided
    const dateFilter = { restaurant: restaurant._id };
    if (startDate || endDate) {
      dateFilter.orderDate = {};
      if (startDate) dateFilter.orderDate.$gte = new Date(startDate);
      if (endDate) dateFilter.orderDate.$lte = new Date(endDate);
    }

    // Get all orders for total count and revenue
    const orders = await Order.find(dateFilter).populate('restaurant', 'name');
    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    
    // Get the breakdown data
    const breakdown = await getBreakdown(orders, true);
    
    // Determine which breakdown to use based on type
    let dataSet;
    if (type === 'month') {
      dataSet = breakdown.byMonth;
    } else if (type === 'year') {
      dataSet = breakdown.byYear;
    } else {
      dataSet = breakdown.byDay;
    }
    
    // Sort the data
    const sortField = type === 'day' ? 'date' : (type === 'month' ? 'month' : 'year');
    dataSet.sort((a, b) => {
      if (sortOrder === 'asc') {
        return a[sortField] > b[sortField] ? 1 : -1;
      } else {
        return a[sortField] < b[sortField] ? 1 : -1;
      }
    });
    
    // Implement cursor-based pagination if cursor is provided
    let paginatedData;
    let nextCursor = null;
    
    if (cursor) {
      // Find the index of the item that matches the cursor
      const cursorIndex = dataSet.findIndex(item => {
        return item[sortField] === cursor;
      });
      
      if (cursorIndex !== -1) {
        // Get items after the cursor
        paginatedData = dataSet.slice(cursorIndex, cursorIndex + parseInt(limit));
      } else {
        paginatedData = [];
      }
    } else {
      // Use traditional pagination if no cursor
      const skip = (parseInt(page) - 1) * parseInt(limit);
      paginatedData = dataSet.slice(skip, skip + parseInt(limit));
    }
    
    // Set the next cursor if there are more items
    if (paginatedData.length === parseInt(limit) && paginatedData.length < dataSet.length) {
      nextCursor = paginatedData[paginatedData.length - 1][sortField];
    }

    res.json({
      totalRevenue,
      totalCount: dataSet.length,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(dataSet.length / parseInt(limit)),
        nextCursor
      },
      data: paginatedData,
      // Include full breakdown for backward compatibility
      breakdown
    });
  } catch (error) {
    console.error('getRestaurantRevenue error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
const Restaurant = require('../models/Restaurants');
const crypto = require('crypto')
const sendEmail = require('../configs/nodemailer');
const Meal = require('../models/Meals')
const Withdrawal = require('../models/Withdrawals');
const Notification = require('../models/Notifications');
const Order = require('../models/Orders');

function generatePassword() {
    return crypto.randomBytes(5).toString('hex');
}

exports.createRestaurant = async (request, response) => {
    const password = generatePassword();
    const newRestaurant = new Restaurant({
        ...request.body,
        password
    });

    try {

        const existingRestaurant = await Restaurant.findOne({ email: request.body.email });
        if (existingRestaurant) {
            return response.status(400).json({ message: 'A restaurant with this email already exists.' });
        }


        await newRestaurant.save();

        const passwordEmailHtml = `
        <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #000000;
              margin: 0;
              padding: 0;
              background-color: #f8f9fa;
            }
            .container {
              width: 90%;
              max-width: 600px;
              margin: 30px auto;
              padding: 0;
              border-radius: 12px;
              background-color: #ffffff;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
              overflow: hidden;
            }
            .header {
              text-align: center;
              padding: 40px 20px 30px;
              background: #cc0000;
              color: #ffffff;
            }
            .header h1 {
              margin: 0;
              font-size: 32px;
              font-weight: 700;
              text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
            }
            .brand-text {
              color: #FFCC00;
              font-weight: 800;
            }
            .content {
              font-size: 16px;
              line-height: 1.6;
              padding: 30px;
              color: #333333;
            }
            .password {
              background: #FFCC00;
              color: #000000;
              font-size: 28px;
              font-weight: 800;
              text-align: center;
              padding: 25px;
              margin: 25px 0;
              border-radius: 8px;
              letter-spacing: 2px;
              box-shadow: 0 3px 10px rgba(255, 204, 0, 0.3);
            }
            .welcome-box {
              background: #fff3cd;
              border-left: 4px solid #FFCC00;
              padding: 20px;
              margin: 20px 0;
              border-radius: 8px;
            }
            .footer {
              background-color: #000000;
              color: #ffffff;
              text-align: center;
              padding: 20px;
              font-size: 14px;
            }
            .footer .brand {
              color: #FFCC00;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🍽️ Welcome to <span class="brand-text">Byte!</span></h1>
            </div>
            <div class="content">
              <p>Hello and welcome! 🎉</p>
              <div class="welcome-box">
                <p><strong>🎊 Congratulations!</strong> Your restaurant has been successfully onboarded to the Byte platform!</p>
                <p>You're now part of our amazing community of food partners serving delicious meals to hungry students.</p>
              </div>
              <p>Here's your secure login password:</p>
              <div class="password">${password}</div>
              <p><strong>What's next?</strong></p>
              <ul>
                <li>🔐 Use this password to log into your restaurant dashboard</li>
                <li>📋 Start adding your delicious menu items</li>
                <li>📱 Manage orders and connect with customers</li>
                <li>💰 Track your earnings and grow your business</li>
              </ul>
              <p>If you have any questions or didn't expect this account, please contact our support team immediately.</p>
              <p>Ready to start serving? Let's make some students happy! 🎯</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} <span class="brand">Byte</span> - Your Campus Food Partner</p>
              <p>Let's cook up something amazing! 👨‍🍳</p>
            </div>
          </div>
        </body>
        </html>
        `;

        await sendEmail(
            newRestaurant.email, 
            'Your Restaurant Account Password', 
            `Welcome to Byte! Your login password is: ${password}`, 
            passwordEmailHtml
        );


        return response.status(201).json({
            message: 'Restaurant registered successfully. Check your email for the password.',
            restaurant: {
                id: newRestaurant._id,
                name: newRestaurant.name,
                email: newRestaurant.email,
                location: newRestaurant.location,
                contactNumber: newRestaurant.contactNumber,
            }
        });
    } catch (error) {
        console.error(error);

        if (!response.headersSent) {
            return response.status(500).json({ message: 'Server error. Please try again later.' });
        }
    }
};


exports.getAllRestaurants = async (request, response) => {
    try {
        const restaurants = await Restaurant.find().populate('meals');
        // For each restaurant, get total orders and order details
        const restaurantIds = restaurants.map(r => r._id);
        // Get all orders for these restaurants
        const orders = await Order.find({ restaurant: { $in: restaurantIds } })
            .select('_id restaurant totalPrice status createdAt user')
            .populate('user', 'username email');
        // Group orders by restaurant
        const ordersByRestaurant = {};
        orders.forEach(order => {
            const rid = order.restaurant.toString();
            if (!ordersByRestaurant[rid]) ordersByRestaurant[rid] = [];
            ordersByRestaurant[rid].push(order);
        });
        // Attach order info to each restaurant
        const result = restaurants.map(r => {
            const rid = r._id.toString();
            const restOrders = ordersByRestaurant[rid] || [];
            return {
                ...r.toObject(),
                totalOrders: restOrders.length,
                orders: restOrders
            };
        });
        response.json(result);
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};

exports.getRestaurantById = async (request, response) => {
    const { id } = request.params;
    
    try {
        console.log('Searching for restaurant with ID:', id);
        
        let restaurant = null;
        
        // Check if it's a valid MongoDB ObjectId format
        if (id.match(/^[0-9a-fA-F]{24}$/)) {
            console.log('Trying MongoDB ObjectId search first');
            restaurant = await Restaurant.findById(id).populate('meals');
        }
        
        // If not found by ObjectId or not ObjectId format, try customId
        if (!restaurant) {
            console.log('Trying customId search (case-insensitive)');
            restaurant = await Restaurant.findOne({ 
                customId: { $regex: new RegExp(`^${id}$`, 'i') } 
            }).populate('meals');
        }
        
        // If still not found, try exact case match for customId
        if (!restaurant) {
            console.log('Trying exact case customId match');
            restaurant = await Restaurant.findOne({ customId: id }).populate('meals');
        }
        
        if (!restaurant) {
            console.log('Restaurant not found with any method');
            return response.status(404).json({ 
                message: 'Restaurant not found',
                searchedId: id,
                suggestions: 'Please verify the restaurant ID is correct. You can use either the MongoDB ObjectId or the custom restaurant ID.'
            });
        }
        
        console.log('Restaurant found:', restaurant.customId || restaurant._id);
        response.json(restaurant);
    } catch (error) {
        console.error('Error in getRestaurantById:', error);
        response.status(500).json({ 
            message: 'Internal server error',
            error: error.message 
        });
    }
};


exports.updateRestaurant = async (request, response) => {
    const { id } = request.params;
    try {
        let restaurant = null;
        
        // Check if it's a valid MongoDB ObjectId format
        if (id.match(/^[0-9a-fA-F]{24}$/)) {
            restaurant = await Restaurant.findByIdAndUpdate(id, request.body, { new: true });
        }
        
        // If not found by ObjectId, try customId
        if (!restaurant) {
            restaurant = await Restaurant.findOneAndUpdate({ customId: id }, request.body, { new: true });
        }
        
        if (!restaurant) {
            return response.status(404).json({ message: 'Restaurant not found' });
        }
        response.json({ message: 'Restaurant updated successfully!', restaurant });
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};


exports.deleteRestaurant = async (request, response) => {
    const { id } = request.params;
    try {
        let restaurant = null;
        
        // Check if it's a valid MongoDB ObjectId format
        if (id.match(/^[0-9a-fA-F]{24}$/)) {
            restaurant = await Restaurant.findByIdAndDelete(id);
        }
        
        // If not found by ObjectId, try customId
        if (!restaurant) {
            restaurant = await Restaurant.findOneAndDelete({ customId: id });
        }
        
        if (!restaurant) {
            return response.status(404).json({ message: 'Restaurant not found' });
        }
        response.json({ message: 'Restaurant deleted successfully!' });
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};



exports.updateOrderStatus = async (request, response) => {
    const { orderId } = request.params;
    const { status } = request.body;

    try {
        const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true, runValidators: true });
        if (!order) {
            return response.status(404).json({ message: 'Order not found' });
        }
        response.json({
            message: 'Order status updated successfully',
            order,
        });
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};

exports.getMealsByRestaurant = async (request, response) => {
    const { customId } = request.params;

    try {
        const restaurant = await exports.findRestaurantById(customId);
        if (!restaurant) {
            return response.status(404).json({ message: 'Restaurant not found' });
        }

        const meals = await Meal.find({ restaurant: restaurant._id }); 
        if (!meals.length) {
            return response.status(404).json({ message: 'No meals found for this restaurant' });
        }

        response.json(meals);
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};

exports.createWithdrawal = async (req, res) => {
    const { restaurantName, amount } = req.body;

    try {
        const restaurant = await Restaurant.findOne({ name: restaurantName });
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        if (restaurant.walletBalance < amount) {
            return res.status(400).json({ message: 'Insufficient wallet balance for withdrawal' });
        }

        const withdrawal = new Withdrawal({ restaurantName, amount });
        await withdrawal.save();

        const restaurantNotification = new Notification({
            restaurantId: restaurant._id,
            message: `A withdrawal request of ₦${amount.toFixed(2)} has been created. Your wallet balance has been updated.`,
        });
        await restaurantNotification.save();
        restaurant.notifications.push(restaurantNotification._id);
        await restaurant.save();

        restaurant.walletBalance -= Number(amount);
        await restaurant.save();

        const restaurantEmailHtml = `
<html>
<head>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f8f9fa;
      color: #333333;
      margin: 0;
      padding: 0;
    }
    .email-container {
      width: 90%;
      max-width: 600px;
      margin: 30px auto;
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      text-align: center;
      padding: 40px 20px 30px;
      background: #cc0000;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    .brand-text {
      color: #FFCC00;
      font-weight: 800;
    }
    .content {
      padding: 30px;
    }
    .content p {
      color: #333333;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 15px;
    }
    .withdrawal-info {
      background: #fff3cd;
      border-left: 4px solid #FFCC00;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .withdrawal-info p {
      color: #000000;
      font-weight: 600;
      margin: 8px 0;
    }
    .amount {
      background: #FFCC00;
      color: #000000;
      font-size: 24px;
      font-weight: 800;
      text-align: center;
      padding: 15px;
      margin: 20px 0;
      border-radius: 8px;
      letter-spacing: 1px;
    }
    .footer {
      background-color: #000000;
      color: #ffffff;
      text-align: center;
      padding: 20px;
      font-size: 14px;
    }
    .footer .brand {
      color: #FFCC00;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>💰 <span class="brand-text">Byte</span> Withdrawal Request</h1>
    </div>
    <div class="content">
      <p>Great news! 🎉</p>
      <p>Your withdrawal request has been successfully received and is now being processed by our team.</p>
      
      <div class="withdrawal-info">
        <p>🏪 Restaurant: ${restaurantName}</p>
        <p>📅 Request Date: ${new Date().toLocaleDateString()}</p>
        <p>💳 Updated Balance: ₦${restaurant.walletBalance.toFixed(2)}</p>
      </div>

      <p>Withdrawal Amount:</p>
      <div class="amount">₦${amount.toFixed(2)}</div>

      <p><strong>What happens next?</strong></p>
      <ul>
        <li>🔍 Our team will review your request</li>
        <li>💸 Funds will be transferred to your registered account</li>
        <li>📧 You'll receive a confirmation email once processed</li>
      </ul>

      <p>If you have any questions, our support team is here to help! 🤝</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} <span class="brand">Byte</span> - Your Campus Food Partner</p>
      <p>Growing together, one bite at a time! 🚀</p>
    </div>
  </div>
</body>
</html>
        `;
        
        await sendEmail(restaurant.email, 'Withdrawal Request Received', 'Your withdrawal request has been processed.', restaurantEmailHtml);

        const adminEmailHtml = `
<html>
<head>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f8f9fa;
      color: #333333;
      margin: 0;
      padding: 0;
    }
    .email-container {
      width: 90%;
      max-width: 600px;
      margin: 30px auto;
      background-color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      text-align: center;
      padding: 40px 20px 30px;
      background: #cc0000;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }
    .brand-text {
      color: #FFCC00;
      font-weight: 800;
    }
    .content {
      padding: 30px;
    }
    .content p {
      color: #333333;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 15px;
    }
    .withdrawal-info {
      background: #fff3cd;
      border-left: 4px solid #FFCC00;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .withdrawal-info p {
      color: #000000;
      font-weight: 600;
      margin: 8px 0;
    }
    .amount {
      background: #FFCC00;
      color: #000000;
      font-size: 28px;
      font-weight: 800;
      text-align: center;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
      letter-spacing: 1px;
    }
    .urgent-tag {
      background-color: #dc3545;
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      display: inline-block;
      margin-bottom: 15px;
    }
    .footer {
      background-color: #000000;
      color: #ffffff;
      text-align: center;
      padding: 20px;
      font-size: 14px;
    }
    .footer .brand {
      color: #FFCC00;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>🚨 <span class="brand-text">Byte</span> Admin Alert</h1>
    </div>
    <div class="content">
      <span class="urgent-tag">ACTION REQUIRED</span>
      <p>A new withdrawal request requires your immediate attention! 📋</p>
      
      <div class="withdrawal-info">
        <p>🏪 Restaurant: ${restaurantName}</p>
        <p>📅 Request Date: ${new Date().toLocaleDateString()}</p>
        <p>📧 Restaurant Email: ${restaurant.email}</p>
        <p>🏦 Bank: ${restaurant.bankName}</p>
        <p>💳 Account: ${restaurant.accountNumber}</p>
        <p>👤 Account Holder: ${restaurant.accountHolder}</p>
      </div>

      <p>Withdrawal Amount:</p>
      <div class="amount">₦${amount.toFixed(2)}</div>

      <p><strong>Next Steps:</strong></p>
      <ul>
        <li>🔍 Verify restaurant account details</li>
        <li>💰 Process the withdrawal payment</li>
        <li>✅ Update withdrawal status</li>
        <li>📧 Send confirmation to restaurant</li>
      </ul>

      <p>Please review and process this request as soon as possible. 🚀</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} <span class="brand">Byte</span> - Admin Panel</p>
      <p>Keeping the food flowing! 🍽️</p>
    </div>
  </div>
</body>
</html>
        `;
        
        await sendEmail('ajalaoyinda@gmail.com', 'New Withdrawal Request', 'A new withdrawal request has been created.', adminEmailHtml);

        res.status(201).json({ message: 'Withdrawal created successfully!', withdrawal });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

exports.toggleRestaurantActiveStatus = async (request, response) => {
    const { id } = request.params;
    try {
        const restaurant = await exports.findRestaurantById(id);
        if (!restaurant) {
            return response.status(404).json({ message: 'Restaurant not found' });
        }
        restaurant.isActive = !restaurant.isActive;
        await restaurant.save();
        response.status(200).json({ message: 'Status updated', isActive: restaurant.isActive });
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};

// Debug function to help troubleshoot restaurant lookup issues
exports.debugRestaurants = async (request, response) => {
    try {
        const restaurants = await Restaurant.find({}, 'customId name email isActive');
        response.json({
            message: 'Debug: All restaurants in database',
            count: restaurants.length,
            restaurants: restaurants.map(r => ({
                customId: r.customId,
                name: r.name,
                email: r.email,
                isActive: r.isActive
            }))
        });
    } catch (error) {
        console.error('Error in debugRestaurants:', error);
        response.status(500).json({ message: 'Internal server error' });
    }
};

// Helper function to find restaurant by various ID formats
exports.findRestaurantById = async (id) => {
    try {
        let restaurant = null;
        
        // Check if it's a valid MongoDB ObjectId format
        if (id.match(/^[0-9a-fA-F]{24}$/)) {
            restaurant = await Restaurant.findById(id);
        }
        
        // If not found by ObjectId or not ObjectId format, try customId
        if (!restaurant) {
            restaurant = await Restaurant.findOne({ 
                customId: { $regex: new RegExp(`^${id}$`, 'i') } 
            });
        }
        
        // If still not found, try exact case match for customId
        if (!restaurant) {
            restaurant = await Restaurant.findOne({ customId: id });
        }
        
        return restaurant;
    } catch (error) {
        console.error('Error in findRestaurantById helper:', error);
        return null;
    }
};

// Test endpoint to check restaurant lookup by ID
exports.testRestaurantLookup = async (request, response) => {
    const { id } = request.params;
    
    try {
        console.log('Testing restaurant lookup for ID:', id);
        
        const restaurant = await exports.findRestaurantById(id);
        
        if (!restaurant) {
            return response.status(404).json({ 
                message: 'Restaurant not found',
                searchedId: id,
                idType: id.match(/^[0-9a-fA-F]{24}$/) ? 'MongoDB ObjectId' : 'Custom ID'
            });
        }
        
        response.json({
            message: 'Restaurant found successfully',
            restaurant: {
                _id: restaurant._id,
                customId: restaurant.customId,
                name: restaurant.name,
                email: restaurant.email,
                isActive: restaurant.isActive
            },
            searchedWith: id,
            foundBy: id === restaurant.customId ? 'Custom ID' : 'MongoDB ObjectId'
        });
    } catch (error) {
        console.error('Error in testRestaurantLookup:', error);
        response.status(500).json({ 
            message: 'Internal server error',
            error: error.message 
        });
    }
};

// Fetch notifications for the authenticated restaurant or by restaurant ID
exports.getRestaurantNotifications = async (req, res) => {
    try {
        // Use authenticated restaurant if available, otherwise use :id param
        const restaurantId = req.restaurant?._id || req.params.id;
        if (!restaurantId) {
            return res.status(400).json({ message: 'Restaurant ID required' });
        }
        const notifications = await Notification.find({ restaurantId }).sort({ createdAt: -1 });
        res.status(200).json(notifications);
    } catch (error) {
        console.error('Error fetching restaurant notifications:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

