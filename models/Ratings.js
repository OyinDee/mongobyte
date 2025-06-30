const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: false
    },
    overallRating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    // Detailed rating criteria
    foodQuality: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    deliverySpeed: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    customerService: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    valueForMoney: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    packaging: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    },
    // Optional review text
    review: {
        type: String,
        maxlength: 500,
        trim: true
    },
    // Additional metadata
    isAnonymous: {
        type: Boolean,
        default: false
    },
    isVerifiedPurchase: {
        type: Boolean,
        default: false
    },
    helpfulVotes: {
        type: Number,
        default: 0
    },
    reportedBy: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reason: String,
        reportedAt: {
            type: Date,
            default: Date.now
        }
    }],
    isVisible: {
        type: Boolean,
        default: true
    },
    adminNotes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Compound index to prevent duplicate ratings per user per restaurant
ratingSchema.index({ user: 1, restaurant: 1 }, { unique: true });

// Index for efficient queries
ratingSchema.index({ restaurant: 1, isVisible: 1 });
ratingSchema.index({ overallRating: -1 });
ratingSchema.index({ createdAt: -1 });

// Static method to calculate restaurant ratings
ratingSchema.statics.calculateRestaurantRating = async function(restaurantId) {
    const Restaurant = mongoose.model('Restaurant');
    
    const ratings = await this.find({ 
        restaurant: restaurantId, 
        isVisible: true 
    });

    if (ratings.length === 0) {
        await Restaurant.findByIdAndUpdate(restaurantId, {
            averageRating: 0,
            totalRatings: 0,
            ratingsBreakdown: {
                fiveStars: 0,
                fourStars: 0,
                threeStars: 0,
                twoStars: 0,
                oneStar: 0
            },
            lastRatingUpdate: new Date()
        });
        return {
            averageRating: 0,
            totalRatings: 0,
            breakdown: { fiveStars: 0, fourStars: 0, threeStars: 0, twoStars: 0, oneStar: 0 }
        };
    }

    // Calculate overall average
    const totalRating = ratings.reduce((sum, rating) => sum + rating.overallRating, 0);
    const averageRating = totalRating / ratings.length;

    // Calculate breakdown
    const breakdown = {
        fiveStars: ratings.filter(r => r.overallRating === 5).length,
        fourStars: ratings.filter(r => r.overallRating === 4).length,
        threeStars: ratings.filter(r => r.overallRating === 3).length,
        twoStars: ratings.filter(r => r.overallRating === 2).length,
        oneStar: ratings.filter(r => r.overallRating === 1).length
    };

    // Calculate detailed averages
    const detailedAverages = {
        foodQuality: ratings.reduce((sum, r) => sum + r.foodQuality, 0) / ratings.length,
        deliverySpeed: ratings.reduce((sum, r) => sum + r.deliverySpeed, 0) / ratings.length,
        customerService: ratings.reduce((sum, r) => sum + r.customerService, 0) / ratings.length,
        valueForMoney: ratings.reduce((sum, r) => sum + r.valueForMoney, 0) / ratings.length,
        packaging: ratings.reduce((sum, r) => sum + r.packaging, 0) / ratings.length
    };

    // Update restaurant with new ratings
    await Restaurant.findByIdAndUpdate(restaurantId, {
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        totalRatings: ratings.length,
        ratingsBreakdown: breakdown,
        lastRatingUpdate: new Date()
    });

    return {
        averageRating: Math.round(averageRating * 10) / 10,
        totalRatings: ratings.length,
        breakdown,
        detailedAverages
    };
};

// Instance method to check if rating can be updated
ratingSchema.methods.canBeUpdated = function() {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return this.createdAt >= oneWeekAgo;
};

module.exports = mongoose.model('Rating', ratingSchema);
