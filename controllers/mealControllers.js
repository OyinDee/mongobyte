const Meal = require('../models/Meals');
const Restaurant = require('../models/Restaurants');


exports.createMeal = async (request, response) => {
    const { customId } = request.params;

    try {
        const restaurant = await Restaurant.findOne({ customId:customId });
        if (!restaurant) {
            return response.status(404).json({ message: 'Restaurant not found' });
        }
        const meal = new Meal({ ...request.body, restaurant: restaurant._id });
        restaurant.meals.push(meal._id);
        await restaurant.save();
        await meal.save();
        response.status(201).json({ message: 'Meal created successfully!', meal });
    } catch (error) {
        console.log(error);
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


exports.updateMeal = async (request, response) => {
    const { id } = request.params; 
    const restaurantId  = request.restaurant.customId; 

    try {
        const meal = await Meal.findOne({ customId: id }).populate('restaurant');

        if (!meal) {
            return response.status(404).json({ message: 'Meal not found' });
        }

        const restaurant = await Restaurant.findOne({ customId: restaurantId });
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
        const restaurant = await Restaurant.findOne({ customId: restaurantId });
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
