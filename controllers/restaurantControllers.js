const Restaurant = require('../models/Restaurants');
const crypto = require('crypto')
const sendEmail = require('../configs/nodemailer');
const Meal = require('../models/Meals')
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
        const existingRestaurant = await Restaurant.findOne({ email:request.body.email });
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
              width: 100%;
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
        return response.status(500).json({ message: 'Server error. Please try again later.' });
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
    const  id  = request.params.id;
    try {
        const restaurant = await Restaurant.findOne({ customId: id }).populate('meals');
        if (!restaurant) {
            return response.status(404).json({ message: 'Restaurant not found' });
        }
        response.json(restaurant);
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};


exports.updateRestaurant = async (request, response) => {
    const { id } = request.params;
    try {
        const restaurant = await Restaurant.findOneAndUpdate({ customId: id }, request.body, { new: true });
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
        const restaurant = await Restaurant.findOneAndDelete({ customId: id });
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
        const restaurant = await Restaurant.findOne({ customId }).populate('meals');
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
