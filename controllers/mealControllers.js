const Meal = require('../models/Meals');
const Restaurant = require('../models/Restaurants');


exports.createMeal = async (request, response) => {
    const { customId } = request.params;
    console.log(customId)
    try {
        const restaurant = await Restaurant.findOne({ customId:customId });
        if (!restaurant) {
            return response.status(404).json({ message: 'Restaurant not found' });
        }

        const meal = new Meal({ ...request.body, restaurant: restaurant._id });
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
    const restaurantId  = request.restaurant._id; 
    console.log(restaurantId )

    try {
        const restaurant = await Restaurant.findOne({ _id: restaurantId });
        console.log(restaurant)
        const meal = await Meal.findOneAndDelete({ customId: id });
        if (!restaurant || !meal.restaurant.equals(restaurant._id)) {
            return response.status(403).json({ message: 'Unauthorized: You do not own this meal' });
        }
        if (!meal) {
            return response.status(404).json({ message: 'Meal not found' });
        }
        response.json({ message: 'Meal deleted successfully!' });
    } catch (error) {
        console.error(error);
        response.status(500).json({ message: 'Internal server error' });
    }
};


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
