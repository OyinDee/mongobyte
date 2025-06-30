const Testimonial = require('../models/Testimonials');
const User = require('../models/User');
const Restaurant = require('../models/Restaurants');
const Order = require('../models/Orders');

// Create a new testimonial
const createTestimonial = async (req, res) => {
    try {
        const { restaurant, order, rating, title, content, images, tags } = req.body;
        const userId = req.user.id;

        // Validate required fields
        if (!rating || !title || !content) {
            return res.status(400).json({
                success: false,
                message: 'Rating, title, and content are required'
            });
        }

        // Check if user has already reviewed this restaurant
        if (restaurant) {
            const existingReview = await Testimonial.findOne({
                user: userId,
                restaurant: restaurant
            });

            if (existingReview) {
                return res.status(400).json({
                    success: false,
                    message: 'You have already reviewed this restaurant'
                });
            }
        }

        const testimonial = new Testimonial({
            user: userId,
            restaurant,
            order,
            rating,
            title,
            content,
            images: images || [],
            tags: tags || []
        });

        await testimonial.save();

        const populatedTestimonial = await Testimonial.findById(testimonial._id)
            .populate('user', 'username email')
            .populate('restaurant', 'name')
            .populate('order', 'orderID');

        res.status(201).json({
            success: true,
            message: 'Testimonial created successfully',
            data: populatedTestimonial
        });

    } catch (error) {
        console.error('Create testimonial error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating testimonial',
            error: error.message
        });
    }
};

// Get all testimonials with filtering and pagination
const getAllTestimonials = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            restaurant,
            user,
            rating,
            isApproved,
            isFeatured,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const filter = {};
        
        if (restaurant) filter.restaurant = restaurant;
        if (user) filter.user = user;
        if (rating) filter.rating = rating;
        if (isApproved !== undefined) filter.isApproved = isApproved === 'true';
        if (isFeatured !== undefined) filter.isFeatured = isFeatured === 'true';

        // For public view, only show approved and public testimonials
        if (!req.user || !req.user.superAdmin) {
            filter.isApproved = true;
            filter.isPublic = true;
        }

        const skip = (page - 1) * limit;
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const testimonials = await Testimonial.find(filter)
            .populate('user', 'username email')
            .populate('restaurant', 'name logo')
            .populate('order', 'orderID')
            .sort(sort)
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Testimonial.countDocuments(filter);

        res.status(200).json({
            success: true,
            data: testimonials,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                totalItems: total,
                itemsPerPage: parseInt(limit)
            }
        });

    } catch (error) {
        console.error('Get testimonials error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching testimonials',
            error: error.message
        });
    }
};

// Get testimonial by ID
const getTestimonialById = async (req, res) => {
    try {
        const { id } = req.params;

        const testimonial = await Testimonial.findById(id)
            .populate('user', 'username email')
            .populate('restaurant', 'name logo location')
            .populate('order', 'orderID totalAmount')
            .populate('adminResponse.respondedBy', 'username');

        if (!testimonial) {
            return res.status(404).json({
                success: false,
                message: 'Testimonial not found'
            });
        }

        // Check if user can view this testimonial
        if (!testimonial.isPublic && (!req.user || (req.user.id !== testimonial.user._id.toString() && !req.user.superAdmin))) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.status(200).json({
            success: true,
            data: testimonial
        });

    } catch (error) {
        console.error('Get testimonial error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching testimonial',
            error: error.message
        });
    }
};

// Update testimonial
const updateTestimonial = async (req, res) => {
    try {
        const { id } = req.params;
        const { rating, title, content, images, tags, isPublic } = req.body;
        const userId = req.user.id;

        const testimonial = await Testimonial.findById(id);

        if (!testimonial) {
            return res.status(404).json({
                success: false,
                message: 'Testimonial not found'
            });
        }

        // Check if user owns this testimonial or is admin
        if (testimonial.user.toString() !== userId && !req.user.superAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const updateData = {};
        if (rating) updateData.rating = rating;
        if (title) updateData.title = title;
        if (content) updateData.content = content;
        if (images) updateData.images = images;
        if (tags) updateData.tags = tags;
        if (isPublic !== undefined) updateData.isPublic = isPublic;

        const updatedTestimonial = await Testimonial.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('user', 'username email')
         .populate('restaurant', 'name logo');

        res.status(200).json({
            success: true,
            message: 'Testimonial updated successfully',
            data: updatedTestimonial
        });

    } catch (error) {
        console.error('Update testimonial error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating testimonial',
            error: error.message
        });
    }
};

// Delete testimonial
const deleteTestimonial = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const testimonial = await Testimonial.findById(id);

        if (!testimonial) {
            return res.status(404).json({
                success: false,
                message: 'Testimonial not found'
            });
        }

        // Check if user owns this testimonial or is admin
        if (testimonial.user.toString() !== userId && !req.user.superAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        await Testimonial.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Testimonial deleted successfully'
        });

    } catch (error) {
        console.error('Delete testimonial error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting testimonial',
            error: error.message
        });
    }
};

// Like/Unlike testimonial
const toggleLike = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const testimonial = await Testimonial.findById(id);

        if (!testimonial) {
            return res.status(404).json({
                success: false,
                message: 'Testimonial not found'
            });
        }

        const isLiked = testimonial.likes.includes(userId);

        if (isLiked) {
            // Unlike
            testimonial.likes.pull(userId);
            testimonial.likesCount = Math.max(0, testimonial.likesCount - 1);
        } else {
            // Like
            testimonial.likes.push(userId);
            testimonial.likesCount += 1;
        }

        await testimonial.save();

        res.status(200).json({
            success: true,
            message: isLiked ? 'Testimonial unliked' : 'Testimonial liked',
            data: {
                liked: !isLiked,
                likesCount: testimonial.likesCount
            }
        });

    } catch (error) {
        console.error('Toggle like error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating like status',
            error: error.message
        });
    }
};

// Get featured testimonials
const getFeaturedTestimonials = async (req, res) => {
    try {
        const { limit = 6 } = req.query;

        const testimonials = await Testimonial.find({
            isFeatured: true,
            isApproved: true,
            isPublic: true
        })
        .populate('user', 'username')
        .populate('restaurant', 'name logo')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));

        res.status(200).json({
            success: true,
            data: testimonials
        });

    } catch (error) {
        console.error('Get featured testimonials error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching featured testimonials',
            error: error.message
        });
    }
};

// Admin: Approve testimonial
const approveTestimonial = async (req, res) => {
    try {
        const { id } = req.params;
        const { isApproved, adminResponse } = req.body;

        const testimonial = await Testimonial.findById(id);

        if (!testimonial) {
            return res.status(404).json({
                success: false,
                message: 'Testimonial not found'
            });
        }

        testimonial.isApproved = isApproved;

        if (adminResponse) {
            testimonial.adminResponse = {
                content: adminResponse,
                respondedBy: req.user.id,
                respondedAt: new Date()
            };
        }

        await testimonial.save();

        res.status(200).json({
            success: true,
            message: `Testimonial ${isApproved ? 'approved' : 'rejected'} successfully`,
            data: testimonial
        });

    } catch (error) {
        console.error('Approve testimonial error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating testimonial approval status',
            error: error.message
        });
    }
};

// Admin: Set featured status
const setFeaturedStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isFeatured } = req.body;

        const testimonial = await Testimonial.findByIdAndUpdate(
            id,
            { isFeatured },
            { new: true }
        );

        if (!testimonial) {
            return res.status(404).json({
                success: false,
                message: 'Testimonial not found'
            });
        }

        res.status(200).json({
            success: true,
            message: `Testimonial ${isFeatured ? 'featured' : 'unfeatured'} successfully`,
            data: testimonial
        });

    } catch (error) {
        console.error('Set featured status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating featured status',
            error: error.message
        });
    }
};

// Get restaurant's average rating
const getRestaurantRating = async (req, res) => {
    try {
        const { restaurantId } = req.params;

        const rating = await Testimonial.getAverageRating(restaurantId);

        res.status(200).json({
            success: true,
            data: rating
        });

    } catch (error) {
        console.error('Get restaurant rating error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching restaurant rating',
            error: error.message
        });
    }
};

module.exports = {
    createTestimonial,
    getAllTestimonials,
    getTestimonialById,
    updateTestimonial,
    deleteTestimonial,
    toggleLike,
    getFeaturedTestimonials,
    approveTestimonial,
    setFeaturedStatus,
    getRestaurantRating
};
