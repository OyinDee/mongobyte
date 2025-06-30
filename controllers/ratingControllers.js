const Rating = require('../models/Ratings');
const Restaurant = require('../models/Restaurants');
const Order = require('../models/Orders');
const User = require('../models/User');

// Create or update a rating
const createOrUpdateRating = async (req, res) => {
    try {
        const {
            restaurantId,
            orderId,
            overallRating,
            foodQuality,
            deliverySpeed,
            customerService,
            valueForMoney,
            packaging,
            review,
            isAnonymous
        } = req.body;
        const userId = req.user.id;

        // Validate required fields
        if (!restaurantId || !overallRating || !foodQuality || !deliverySpeed || 
            !customerService || !valueForMoney || !packaging) {
            return res.status(400).json({
                success: false,
                message: 'All rating criteria are required'
            });
        }

        // Verify restaurant exists
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({
                success: false,
                message: 'Restaurant not found'
            });
        }

        // Verify order exists and belongs to user (if orderId provided)
        let isVerifiedPurchase = false;
        if (orderId) {
            const order = await Order.findOne({ 
                _id: orderId, 
                user: userId,
                restaurant: restaurantId 
            });
            if (order) {
                isVerifiedPurchase = true;
            }
        }

        // Check if user has already rated this restaurant
        let existingRating = await Rating.findOne({ 
            user: userId, 
            restaurant: restaurantId 
        });

        if (existingRating) {
            // Check if rating can be updated (within 1 week)
            if (!existingRating.canBeUpdated()) {
                return res.status(400).json({
                    success: false,
                    message: 'Rating can only be updated within one week of creation'
                });
            }

            // Update existing rating
            existingRating.overallRating = overallRating;
            existingRating.foodQuality = foodQuality;
            existingRating.deliverySpeed = deliverySpeed;
            existingRating.customerService = customerService;
            existingRating.valueForMoney = valueForMoney;
            existingRating.packaging = packaging;
            existingRating.review = review || existingRating.review;
            existingRating.isAnonymous = isAnonymous !== undefined ? isAnonymous : existingRating.isAnonymous;
            existingRating.isVerifiedPurchase = isVerifiedPurchase;
            existingRating.order = orderId || existingRating.order;

            await existingRating.save();
            var savedRating = existingRating;
        } else {
            // Create new rating
            const newRating = new Rating({
                user: userId,
                restaurant: restaurantId,
                order: orderId,
                overallRating,
                foodQuality,
                deliverySpeed,
                customerService,
                valueForMoney,
                packaging,
                review,
                isAnonymous: isAnonymous || false,
                isVerifiedPurchase
            });

            var savedRating = await newRating.save();
        }

        // Recalculate restaurant rating
        await Rating.calculateRestaurantRating(restaurantId);

        // Populate the response
        const populatedRating = await Rating.findById(savedRating._id)
            .populate('user', 'username')
            .populate('restaurant', 'name')
            .populate('order', 'orderID');

        res.status(existingRating ? 200 : 201).json({
            success: true,
            message: existingRating ? 'Rating updated successfully' : 'Rating created successfully',
            data: populatedRating
        });

    } catch (error) {
        console.error('Create/Update rating error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing rating',
            error: error.message
        });
    }
};

// Get restaurant ratings with pagination
const getRestaurantRatings = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const {
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'desc',
            minRating,
            maxRating,
            verifiedOnly
        } = req.query;

        const filter = { 
            restaurant: restaurantId, 
            isVisible: true 
        };

        if (minRating) filter.overallRating = { ...filter.overallRating, $gte: parseInt(minRating) };
        if (maxRating) filter.overallRating = { ...filter.overallRating, $lte: parseInt(maxRating) };
        if (verifiedOnly === 'true') filter.isVerifiedPurchase = true;

        const skip = (page - 1) * limit;
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const ratings = await Rating.find(filter)
            .populate('user', 'username')
            .populate('order', 'orderID')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Rating.countDocuments(filter);

        // Get restaurant rating summary
        const ratingSummary = await Rating.calculateRestaurantRating(restaurantId);

        res.status(200).json({
            success: true,
            data: {
                ratings,
                summary: ratingSummary,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalItems: total,
                    itemsPerPage: parseInt(limit)
                }
            }
        });

    } catch (error) {
        console.error('Get restaurant ratings error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching restaurant ratings',
            error: error.message
        });
    }
};

// Get user's rating for a specific restaurant
const getUserRating = async (req, res) => {
    try {
        const { restaurantId } = req.params;
        const userId = req.user.id;

        const rating = await Rating.findOne({ 
            user: userId, 
            restaurant: restaurantId 
        })
        .populate('restaurant', 'name')
        .populate('order', 'orderID');

        if (!rating) {
            return res.status(404).json({
                success: false,
                message: 'No rating found for this restaurant'
            });
        }

        res.status(200).json({
            success: true,
            data: rating
        });

    } catch (error) {
        console.error('Get user rating error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user rating',
            error: error.message
        });
    }
};

// Delete a rating
const deleteRating = async (req, res) => {
    try {
        const { ratingId } = req.params;
        const userId = req.user.id;

        const rating = await Rating.findById(ratingId);

        if (!rating) {
            return res.status(404).json({
                success: false,
                message: 'Rating not found'
            });
        }

        // Check if user owns this rating or is admin
        if (rating.user.toString() !== userId && !req.user.superAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const restaurantId = rating.restaurant;
        await Rating.findByIdAndDelete(ratingId);

        // Recalculate restaurant rating
        await Rating.calculateRestaurantRating(restaurantId);

        res.status(200).json({
            success: true,
            message: 'Rating deleted successfully'
        });

    } catch (error) {
        console.error('Delete rating error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting rating',
            error: error.message
        });
    }
};

// Get top rated restaurants
const getTopRatedRestaurants = async (req, res) => {
    try {
        const { 
            limit = 10, 
            minRatings = 5,
            university 
        } = req.query;

        const filter = {
            totalRatings: { $gte: parseInt(minRatings) },
            averageRating: { $gt: 0 },
            isActive: true
        };

        if (university) {
            filter.university = university;
        }

        const restaurants = await Restaurant.find(filter)
            .populate('university', 'name')
            .sort({ averageRating: -1, totalRatings: -1 })
            .limit(parseInt(limit))
            .select('name averageRating totalRatings ratingsBreakdown location imageUrl description');

        res.status(200).json({
            success: true,
            data: restaurants
        });

    } catch (error) {
        console.error('Get top rated restaurants error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching top rated restaurants',
            error: error.message
        });
    }
};

// Mark rating as helpful
const markHelpful = async (req, res) => {
    try {
        const { ratingId } = req.params;

        const rating = await Rating.findByIdAndUpdate(
            ratingId,
            { $inc: { helpfulVotes: 1 } },
            { new: true }
        );

        if (!rating) {
            return res.status(404).json({
                success: false,
                message: 'Rating not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Rating marked as helpful',
            data: {
                helpfulVotes: rating.helpfulVotes
            }
        });

    } catch (error) {
        console.error('Mark helpful error:', error);
        res.status(500).json({
            success: false,
            message: 'Error marking rating as helpful',
            error: error.message
        });
    }
};

// Report a rating
const reportRating = async (req, res) => {
    try {
        const { ratingId } = req.params;
        const { reason } = req.body;
        const userId = req.user.id;

        if (!reason) {
            return res.status(400).json({
                success: false,
                message: 'Report reason is required'
            });
        }

        const rating = await Rating.findById(ratingId);

        if (!rating) {
            return res.status(404).json({
                success: false,
                message: 'Rating not found'
            });
        }

        // Check if user already reported this rating
        const alreadyReported = rating.reportedBy.some(
            report => report.user.toString() === userId
        );

        if (alreadyReported) {
            return res.status(400).json({
                success: false,
                message: 'You have already reported this rating'
            });
        }

        rating.reportedBy.push({
            user: userId,
            reason,
            reportedAt: new Date()
        });

        await rating.save();

        res.status(200).json({
            success: true,
            message: 'Rating reported successfully'
        });

    } catch (error) {
        console.error('Report rating error:', error);
        res.status(500).json({
            success: false,
            message: 'Error reporting rating',
            error: error.message
        });
    }
};

// Admin: Get reported ratings
const getReportedRatings = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const ratings = await Rating.find({
            'reportedBy.0': { $exists: true } // Has at least one report
        })
        .populate('user', 'username email')
        .populate('restaurant', 'name')
        .populate('reportedBy.user', 'username')
        .sort({ 'reportedBy.reportedAt': -1 })
        .skip(skip)
        .limit(parseInt(limit));

        const total = await Rating.countDocuments({
            'reportedBy.0': { $exists: true }
        });

        res.status(200).json({
            success: true,
            data: ratings,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Get reported ratings error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching reported ratings',
            error: error.message
        });
    }
};

// Admin: Moderate rating
const moderateRating = async (req, res) => {
    try {
        const { ratingId } = req.params;
        const { action, adminNotes } = req.body; // action: 'hide', 'show', 'dismiss_reports'

        const rating = await Rating.findById(ratingId);

        if (!rating) {
            return res.status(404).json({
                success: false,
                message: 'Rating not found'
            });
        }

        switch (action) {
            case 'hide':
                rating.isVisible = false;
                break;
            case 'show':
                rating.isVisible = true;
                break;
            case 'dismiss_reports':
                rating.reportedBy = [];
                break;
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid action'
                });
        }

        if (adminNotes) {
            rating.adminNotes = adminNotes;
        }

        await rating.save();

        // Recalculate restaurant rating if visibility changed
        if (action === 'hide' || action === 'show') {
            await Rating.calculateRestaurantRating(rating.restaurant);
        }

        res.status(200).json({
            success: true,
            message: `Rating ${action.replace('_', ' ')} successfully`,
            data: rating
        });

    } catch (error) {
        console.error('Moderate rating error:', error);
        res.status(500).json({
            success: false,
            message: 'Error moderating rating',
            error: error.message
        });
    }
};

module.exports = {
    createOrUpdateRating,
    getRestaurantRatings,
    getUserRating,
    deleteRating,
    getTopRatedRestaurants,
    markHelpful,
    reportRating,
    getReportedRatings,
    moderateRating
};
