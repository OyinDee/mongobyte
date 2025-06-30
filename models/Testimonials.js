const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: false
    },
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: false
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 500
    },
    images: [{
        type: String,
        required: false
    }],
    isApproved: {
        type: Boolean,
        default: false
    },
    isPublic: {
        type: Boolean,
        default: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    tags: [{
        type: String,
        trim: true
    }],
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    likesCount: {
        type: Number,
        default: 0
    },
    adminResponse: {
        content: {
            type: String,
            trim: true
        },
        respondedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        respondedAt: {
            type: Date
        }
    }
}, {
    timestamps: true
});

// Index for better performance
testimonialSchema.index({ user: 1, restaurant: 1 });
testimonialSchema.index({ rating: -1 });
testimonialSchema.index({ isApproved: 1, isPublic: 1 });
testimonialSchema.index({ isFeatured: -1, createdAt: -1 });

// Virtual for calculating average rating per restaurant
testimonialSchema.statics.getAverageRating = async function(restaurantId) {
    const result = await this.aggregate([
        {
            $match: {
                restaurant: mongoose.Types.ObjectId(restaurantId),
                isApproved: true,
                isPublic: true
            }
        },
        {
            $group: {
                _id: '$restaurant',
                averageRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 }
            }
        }
    ]);
    
    return result[0] || { averageRating: 0, totalReviews: 0 };
};

module.exports = mongoose.model('Testimonial', testimonialSchema);
