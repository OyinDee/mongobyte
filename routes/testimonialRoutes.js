/**
 * @swagger
 * components:
 *   schemas:
 *     Testimonial:
 *       type: object
 *       required:
 *         - rating
 *         - title
 *         - content
 *       properties:
 *         _id:
 *           type: string
 *           description: Testimonial unique identifier
 *         user:
 *           type: string
 *           description: User ID who created the testimonial
 *         restaurant:
 *           type: string
 *           description: Restaurant ID being reviewed
 *         order:
 *           type: string
 *           description: Order ID related to the testimonial
 *         rating:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *           description: Rating from 1 to 5 stars
 *         title:
 *           type: string
 *           maxLength: 100
 *           description: Testimonial title
 *         content:
 *           type: string
 *           maxLength: 500
 *           description: Testimonial content
 *         images:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of image URLs
 *         isApproved:
 *           type: boolean
 *           description: Whether the testimonial is approved by admin
 *         isPublic:
 *           type: boolean
 *           description: Whether the testimonial is publicly visible
 *         isFeatured:
 *           type: boolean
 *           description: Whether the testimonial is featured
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Tags associated with the testimonial
 *         likesCount:
 *           type: number
 *           description: Number of likes
 *         adminResponse:
 *           type: object
 *           properties:
 *             content:
 *               type: string
 *             respondedBy:
 *               type: string
 *             respondedAt:
 *               type: string
 *               format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/testimonialControllers');

const authenticateUser  = require('../middlewares/authenticateUser');
const authenticateAdmin = require('../middlewares/authenticate');

/**
 * @swagger
 * /api/v1/testimonials:
 *   post:
 *     summary: Create a new testimonial
 *     tags: [Testimonials]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *               - title
 *               - content
 *             properties:
 *               restaurant:
 *                 type: string
 *                 description: Restaurant ID
 *               order:
 *                 type: string
 *                 description: Order ID
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               title:
 *                 type: string
 *                 maxLength: 100
 *               content:
 *                 type: string
 *                 maxLength: 500
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Testimonial created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Testimonial'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/', authenticateUser, createTestimonial);

/**
 * @swagger
 * /api/v1/testimonials:
 *   get:
 *     summary: Get all testimonials with filtering and pagination
 *     tags: [Testimonials]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: restaurant
 *         schema:
 *           type: string
 *         description: Filter by restaurant ID
 *       - in: query
 *         name: user
 *         schema:
 *           type: string
 *         description: Filter by user ID
 *       - in: query
 *         name: rating
 *         schema:
 *           type: number
 *         description: Filter by rating
 *       - in: query
 *         name: isApproved
 *         schema:
 *           type: boolean
 *         description: Filter by approval status
 *       - in: query
 *         name: isFeatured
 *         schema:
 *           type: boolean
 *         description: Filter by featured status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Testimonials retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Testimonial'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     itemsPerPage:
 *                       type: integer
 *       500:
 *         description: Server error
 */
router.get('/', getAllTestimonials);

/**
 * @swagger
 * /api/v1/testimonials/featured:
 *   get:
 *     summary: Get featured testimonials
 *     tags: [Testimonials]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 6
 *         description: Number of featured testimonials to retrieve
 *     responses:
 *       200:
 *         description: Featured testimonials retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Testimonial'
 *       500:
 *         description: Server error
 */
router.get('/featured', getFeaturedTestimonials);

/**
 * @swagger
 * /api/v1/testimonials/restaurant/{restaurantId}/rating:
 *   get:
 *     summary: Get restaurant's average rating
 *     tags: [Testimonials]
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     responses:
 *       200:
 *         description: Restaurant rating retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     averageRating:
 *                       type: number
 *                     totalReviews:
 *                       type: number
 *       500:
 *         description: Server error
 */
router.get('/restaurant/:restaurantId/rating', getRestaurantRating);

/**
 * @swagger
 * /api/v1/testimonials/{id}:
 *   get:
 *     summary: Get testimonial by ID
 *     tags: [Testimonials]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Testimonial ID
 *     responses:
 *       200:
 *         description: Testimonial retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Testimonial'
 *       404:
 *         description: Testimonial not found
 *       403:
 *         description: Access denied
 *       500:
 *         description: Server error
 */
router.get('/:id', getTestimonialById);

/**
 * @swagger
 * /api/v1/testimonials/{id}:
 *   put:
 *     summary: Update testimonial
 *     tags: [Testimonials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Testimonial ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               title:
 *                 type: string
 *                 maxLength: 100
 *               content:
 *                 type: string
 *                 maxLength: 500
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Testimonial updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Testimonial'
 *       404:
 *         description: Testimonial not found
 *       403:
 *         description: Access denied
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.put('/:id', authenticateUser, updateTestimonial);

/**
 * @swagger
 * /api/v1/testimonials/{id}:
 *   delete:
 *     summary: Delete testimonial
 *     tags: [Testimonials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Testimonial ID
 *     responses:
 *       200:
 *         description: Testimonial deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Testimonial not found
 *       403:
 *         description: Access denied
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete('/:id', authenticateUser, deleteTestimonial);

/**
 * @swagger
 * /api/v1/testimonials/{id}/like:
 *   post:
 *     summary: Like or unlike a testimonial
 *     tags: [Testimonials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Testimonial ID
 *     responses:
 *       200:
 *         description: Like status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     liked:
 *                       type: boolean
 *                     likesCount:
 *                       type: number
 *       404:
 *         description: Testimonial not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/:id/like', authenticateUser, toggleLike);

/**
 * @swagger
 * /api/v1/testimonials/{id}/approve:
 *   put:
 *     summary: Approve or reject testimonial (Admin only)
 *     tags: [Testimonials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Testimonial ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isApproved
 *             properties:
 *               isApproved:
 *                 type: boolean
 *               adminResponse:
 *                 type: string
 *     responses:
 *       200:
 *         description: Testimonial approval status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Testimonial'
 *       404:
 *         description: Testimonial not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.put('/:id/approve', authenticateAdmin, approveTestimonial);

/**
 * @swagger
 * /api/v1/testimonials/{id}/featured:
 *   put:
 *     summary: Set testimonial featured status (Admin only)
 *     tags: [Testimonials]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Testimonial ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isFeatured
 *             properties:
 *               isFeatured:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Testimonial featured status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Testimonial'
 *       404:
 *         description: Testimonial not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.put('/:id/featured', authenticateAdmin, setFeaturedStatus);

module.exports = router;
