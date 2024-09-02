const Meal = require('../models/Meals');
const Restaurant = require('../models/Restaurants');

// Create a new meal
exports.createMeal = async (request, response) => {
    const { restaurantId } = request.params;
    try {
        const restaurant = await Restaurant.findOne({ customId: restaurantId });
        if (!restaurant) {
            return response.status(404).json({ message: 'Restaurant not found' });
        }

        const meal = new Meal({ ...request.body, restaurant: restaurant._id });
        await meal.save();
        response.status(201).json({ message: 'Meal created successfully!', meal });
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};

// Get all meals
exports.getAllMeals = async (request, response) => {
    try {
        const meals = await Meal.find().populate('restaurant');
        response.json(meals);
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};

// Get a single meal by customId
exports.getMealById = async (request, response) => {
    const { id } = request.params;
    try {
        const meal = await Meal.findOne({ customId: id }).populate('restaurant');
        if (!meal) {
            return response.status(404).json({ message: 'Meal not found' });
        }
        response.json(meal);
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};

// Update a meal
exports.updateMeal = async (request, response) => {
    const { id } = request.params; // This is the meal's customId
    const { restaurantId } = request.body; // This should be the restaurant's customId from the request body

    try {
        // Find the meal by its customId
        const meal = await Meal.findOne({ customId: id }).populate('restaurant');

        if (!meal) {
            return response.status(404).json({ message: 'Meal not found' });
        }

        // Check if the meal belongs to the restaurant trying to update it
        const restaurant = await Restaurant.findOne({ customId: restaurantId });
        if (!restaurant || !meal.restaurant.equals(restaurant._id)) {
            return response.status(403).json({ message: 'Unauthorized: You do not own this meal' });
        }

        // Proceed to update the meal
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


// Delete a meal
exports.deleteMeal = async (request, response) => {
    const { id } = request.params;
    try {
        const meal = await Meal.findOneAndDelete({ customId: id });
        if (!meal) {
            return response.status(404).json({ message: 'Meal not found' });
        }
        response.json({ message: 'Meal deleted successfully!' });
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};

// Add batch meals
exports.addBatchMeals = async (request, response) => {
    const { restaurantId } = request.params;
    const meals = request.body;

    try {
        const restaurant = await Restaurant.findOne({ customId: restaurantId });
        if (!restaurant) {
            return response.status(404).json({ message: 'Restaurant not found' });
        }

        const mealDocuments = meals.map(meal => ({ ...meal, restaurant: restaurant._id }));
        await Meal.insertMany(mealDocuments);

        response.status(201).json({ message: 'Batch meals added successfully!' });
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};
