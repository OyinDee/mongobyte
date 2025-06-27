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
              font-family: Arial, sans-serif;
              color: #000000;
            }
            .container {
              width: 90%;
              max-width: 600px;
              margin: 20px auto;
              padding: 20px;
              border: 1px solid #dddddd;
              border-radius: 8px;
              background-color: #ffffff;
            }
            .header {
              text-align: center;
              border-bottom: 1px solid #dddddd;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .content {
              font-size: 16px;
              line-height: 1.5;
            }
            .password {
              font-weight: bold;
              font-size: 20px;
              color: #333;
              margin-top: 20px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Byte!</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>Thank you for joining Byte as a restaurant partner! Your account has been successfully created.</p>
              <p>Your login password is:</p>
              <p class="password">${password}</p>
              <p>Please use this password to log in and start managing your restaurant.</p>
              <p>If you did not request this account, please contact us immediately.</p>
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
        response.json(restaurants);
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
      font-family: Arial, sans-serif;
      background-color: #f5f5f5;
      color: #333333;
      margin: 0;
      padding: 0;
    }
    .email-container {
      width: 95%;
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      padding: 20px;
      box-sizing: border-box;
    }
    h1 {
      color: #333333;
      font-size: 24px;
      margin-bottom: 20px;
    }
    p {
      color: #666666;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 15px;
    }
    .order-info {
      background-color: #f8f8f8;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .order-info p {
      color: #333333;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #999999;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <h1>Withdrawal Request Received</h1>
    <p>Your withdrawal request has been successfully sent!</p>
    
    <div class="order-info">
      <p>Restaurant Name: ${restaurantName}</p>
      <p>Withdrawal Amount: ₦${amount.toFixed(2)}</p>
      <p>Updated Wallet Balance: ₦${restaurant.walletBalance.toFixed(2)}</p>
    </div>

    <p>If you have any questions or concerns, please contact our support team.</p>

    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Byte. All rights reserved.</p>
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
      font-family: Arial, sans-serif;
      background-color: #f5f5f5;
      color: #333333;
      margin: 0;
      padding: 0;
    }
    .email-container {
      width: 95%;
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      padding: 20px;
      box-sizing: border-box;
    }
    h1 {
      color: #333333;
      font-size: 24px;
      margin-bottom: 20px;
    }
    p {
      color: #666666;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 15px;
    }
    .withdrawal-info {
      background-color: #f8f8f8;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    .footer {
      text-align: center;
      font-size: 12px;
      color: #999999;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <h1>New Withdrawal Request</h1>
    <p>A new withdrawal request has been created.</p>
    
    <div class="withdrawal-info">
      <p>Restaurant Name: ${restaurantName}</p>
      <p>Withdrawal Amount: ₦${amount.toFixed(2)}</p>
      <p>Bank Name: ${restaurant.bankName}</p>
      <p>Account Number: ${restaurant.accountNumber}</p>
      <p>Holder's Name: ${restaurant.accountHolder}</p>
    </div>

    <p>Please review the request.</p>

    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} Byte. All rights reserved.</p>
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
