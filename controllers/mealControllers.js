const Meal = require('../models/Meals');
const Restaurant = require('../models/Restaurants');
const { findRestaurantById } = require('./restaurantControllers');

// Helper function to find restaurant by ID with fallback methods
const findRestaurantByIdHelper = async (id) => {
    try {
        // First try customId (case-insensitive)
        let restaurant = await Restaurant.findOne({ 
            customId: { $regex: new RegExp(`^${id}$`, 'i') } 
        });
        
        // If not found and looks like MongoDB ObjectId, try that
        if (!restaurant && id.match(/^[0-9a-fA-F]{24}$/)) {
            restaurant = await Restaurant.findById(id);
        }
        
        // If still not found, try exact case match
        if (!restaurant) {
            restaurant = await Restaurant.findOne({ customId: id });
        }
        
        return restaurant;
    } catch (error) {
        console.error('Error in findRestaurantByIdHelper:', error);
        return null;
    }
};

exports.createMeal = async (request, response) => {
    const { customId } = request.params;

    try {
        console.log(`[createMeal] Attempting to create meal for restaurant ID: ${customId}`);
        const restaurant = await findRestaurantByIdHelper(customId);
        if (!restaurant) {
            console.log(`[createMeal] Restaurant not found for ID: ${customId}`);
            return response.status(404).json({ 
                message: 'Restaurant not found',
                restaurantId: customId 
            });
        }
        console.log(`[createMeal] Restaurant found: ${restaurant.name} (${restaurant._id})`);
        const meal = new Meal({ ...request.body, restaurant: restaurant._id });
        restaurant.meals.push(meal._id);
        await restaurant.save();
        await meal.save();
        console.log(`[createMeal] Meal created: ${meal.name} (ID: ${meal._id}) for restaurant: ${restaurant.name}`);
        response.status(201).json({ message: 'Meal created successfully!', meal });
    } catch (error) {
        console.error(`[createMeal] Error:`, error);
        response.status(500).json({ message: 'Internal server error' });
    }
};


exports.getAllMeals = async (request, response) => {
    try {
        const meals = await Meal.find().populate('restaurant');
        response.json(meals);
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};


exports.getMealById = async (request, response) => {
    const { id } = request.params;
    try {
        let meal = null;
        // Try by customId first
        meal = await Meal.findOne({ customId: id }).populate('restaurant');
        // If not found and id looks like ObjectId, try by _id
        if (!meal && id.match(/^[0-9a-fA-F]{24}$/)) {
            meal = await Meal.findById(id).populate('restaurant');
        }
        if (!meal) {
            return response.status(404).json({ message: 'Meal not found' });
        }
        response.json(meal);
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};


exports.updateMeal = async (request, response) => {
    const { id } = request.params; 
    const restaurantId  = request.restaurant.customId; 

    try {
        const meal = await Meal.findOne({ customId: id }).populate('restaurant');

        if (!meal) {
            return response.status(404).json({ message: 'Meal not found' });
        }

        const restaurant = await findRestaurantByIdHelper(restaurantId);
        if (!restaurant || !meal.restaurant.equals(restaurant._id)) {
            return response.status(403).json({ message: 'Unauthorized: You do not own this meal' });
        }

        const updatedMeal = await Meal.findOneAndUpdate(
            { customId: id },
            request.body,
            { new: true, runValidators: true }
        );

        response.json({ message: 'Meal updated successfully!', meal: updatedMeal });
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};


exports.deleteMeal = async (request, response) => {
    const { id } = request.params;
    const restaurantId = request.restaurant._id;

    try {
        const restaurant = await Restaurant.findById(restaurantId);
        const meal = await Meal.findOne({ customId: id });

        if (!restaurant) {
            return response.status(404).json({ message: 'Restaurant not found' });
        }

        if (!meal) {
            return response.status(404).json({ message: 'Meal not found' });
        }

        if (!meal.restaurant.equals(restaurantId)) {
            return response.status(403).json({ message: 'Unauthorized: You do not own this meal' });
        }

        await Meal.deleteOne({ customId: id });
        response.json({ message: 'Meal deleted successfully!' });
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};

// Batch add meals to a restaurant
exports.addBatchMeals = async (req, res) => {
    const { restaurantId, meals } = req.body;
    if (!restaurantId || !Array.isArray(meals) || meals.length === 0) {
        return res.status(400).json({ message: 'restaurantId and meals array are required.' });
    }
    try {
        const restaurant = await findRestaurantByIdHelper(restaurantId);
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }
        const createdMeals = [];
        for (const mealData of meals) {
            const meal = new Meal({ ...mealData, restaurant: restaurant._id });
            await meal.save();
            restaurant.meals.push(meal._id);
            createdMeals.push(meal);
        }
        await restaurant.save();
        res.status(201).json({ message: 'Batch meals added successfully!', meals: createdMeals });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get meals for the authenticated restaurant
exports.getRestaurantMeals = async (req, res) => {
    try {
        const restaurantId = req.restaurant?._id;
        if (!restaurantId) {
            return res.status(401).json({ message: 'Unauthorized: Not a restaurant account' });
        }
        const meals = await Meal.find({ restaurant: restaurantId });
        res.status(200).json(meals);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
