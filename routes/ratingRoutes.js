/**
 * @swagger
 * components:
 *   schemas:
 *     Rating:
 *       type: object
 *       required:
 *         - restaurant
 *         - overallRating
 *         - foodQuality
 *         - deliverySpeed
 *         - customerService
 *         - valueForMoney
 *         - packaging
 *       properties:
 *         _id:
 *           type: string
 *           description: Rating unique identifier
 *         user:
 *           type: string
 *           description: User ID who created the rating
 *         restaurant:
 *           type: string
 *           description: Restaurant ID being rated
 *         order:
 *           type: string
 *           description: Order ID related to the rating
 *         overallRating:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *           description: Overall rating from 1 to 5 stars
 *         foodQuality:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *           description: Food quality rating
 *         deliverySpeed:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *           description: Delivery speed rating
 *         customerService:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *           description: Customer service rating
 *         valueForMoney:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *           description: Value for money rating
 *         packaging:
 *           type: number
 *           minimum: 1
 *           maximum: 5
 *           description: Packaging quality rating
 *         review:
 *           type: string
 *           maxLength: 500
 *           description: Optional review text
 *         isAnonymous:
 *           type: boolean
 *           description: Whether the rating is anonymous
 *         isVerifiedPurchase:
 *           type: boolean
 *           description: Whether the rating is from a verified purchase
 *         helpfulVotes:
 *           type: number
 *           description: Number of helpful votes
 *         isVisible:
 *           type: boolean
 *           description: Whether the rating is visible
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
    createOrUpdateRating,
    getRestaurantRatings,
    getUserRating,
    deleteRating,
    getTopRatedRestaurants,
    markHelpful,
    reportRating,
    getReportedRatings,
    moderateRating
} = require('../controllers/ratingControllers');

const authenticateUser = require('../middlewares/authenticateUser');
const authenticateAdmin = require('../middlewares/authenticate');

/**
 * @swagger
 * /api/v1/ratings:
 *   post:
 *     summary: Create or update a restaurant rating
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - restaurantId
 *               - overallRating
 *               - foodQuality
 *               - deliverySpeed
 *               - customerService
 *               - valueForMoney
 *               - packaging
 *             properties:
 *               restaurantId:
 *                 type: string
 *                 description: Restaurant ID
 *               orderId:
 *                 type: string
 *                 description: Order ID (optional)
 *               overallRating:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               foodQuality:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               deliverySpeed:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               customerService:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               valueForMoney:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               packaging:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *               review:
 *                 type: string
 *                 maxLength: 500
 *               isAnonymous:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Rating created successfully
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
 *                   $ref: '#/components/schemas/Rating'
 *       200:
 *         description: Rating updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Restaurant not found
 *       500:
 *         description: Server error
 */
router.post('/', authenticateUser, createOrUpdateRating);

/**
 * @swagger
 * /api/v1/ratings/top-restaurants:
 *   get:
 *     summary: Get top rated restaurants
 *     tags: [Ratings]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of restaurants to return
 *       - in: query
 *         name: minRatings
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Minimum number of ratings required
 *       - in: query
 *         name: university
 *         schema:
 *           type: string
 *         description: Filter by university ID
 *     responses:
 *       200:
 *         description: Top rated restaurants retrieved successfully
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
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       averageRating:
 *                         type: number
 *                       totalRatings:
 *                         type: number
 *                       ratingsBreakdown:
 *                         type: object
 *                       location:
 *                         type: string
 *                       imageUrl:
 *                         type: string
 *       500:
 *         description: Server error
 */
router.get('/top-restaurants', getTopRatedRestaurants);

/**
 * @swagger
 * /api/v1/ratings/reported:
 *   get:
 *     summary: Get reported ratings (Admin only)
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
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
 *     responses:
 *       200:
 *         description: Reported ratings retrieved successfully
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
 *                     $ref: '#/components/schemas/Rating'
 *                 pagination:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.get('/reported', authenticateAdmin, getReportedRatings);

/**
 * @swagger
 * /api/v1/ratings/restaurant/{restaurantId}:
 *   get:
 *     summary: Get ratings for a specific restaurant
 *     tags: [Ratings]
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
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
 *       - in: query
 *         name: minRating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Minimum rating filter
 *       - in: query
 *         name: maxRating
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         description: Maximum rating filter
 *       - in: query
 *         name: verifiedOnly
 *         schema:
 *           type: boolean
 *         description: Show only verified purchase ratings
 *     responses:
 *       200:
 *         description: Restaurant ratings retrieved successfully
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
 *                     ratings:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Rating'
 *                     summary:
 *                       type: object
 *                       properties:
 *                         averageRating:
 *                           type: number
 *                         totalRatings:
 *                           type: number
 *                         breakdown:
 *                           type: object
 *                         detailedAverages:
 *                           type: object
 *                     pagination:
 *                       type: object
 *       500:
 *         description: Server error
 */
router.get('/restaurant/:restaurantId', getRestaurantRatings);

/**
 * @swagger
 * /api/v1/ratings/user/restaurant/{restaurantId}:
 *   get:
 *     summary: Get user's rating for a specific restaurant
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: restaurantId
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant ID
 *     responses:
 *       200:
 *         description: User rating retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Rating'
 *       404:
 *         description: No rating found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/user/restaurant/:restaurantId', authenticateUser, getUserRating);

/**
 * @swagger
 * /api/v1/ratings/{ratingId}:
 *   delete:
 *     summary: Delete a rating
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ratingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Rating ID
 *     responses:
 *       200:
 *         description: Rating deleted successfully
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
 *         description: Rating not found
 *       403:
 *         description: Access denied
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.delete('/:ratingId', authenticateUser, deleteRating);

/**
 * @swagger
 * /api/v1/ratings/{ratingId}/helpful:
 *   post:
 *     summary: Mark a rating as helpful
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ratingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Rating ID
 *     responses:
 *       200:
 *         description: Rating marked as helpful successfully
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
 *                     helpfulVotes:
 *                       type: number
 *       404:
 *         description: Rating not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/:ratingId/helpful', authenticateUser, markHelpful);

/**
 * @swagger
 * /api/v1/ratings/{ratingId}/report:
 *   post:
 *     summary: Report a rating
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ratingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Rating ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for reporting
 *     responses:
 *       200:
 *         description: Rating reported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request or already reported
 *       404:
 *         description: Rating not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/:ratingId/report', authenticateUser, reportRating);

/**
 * @swagger
 * /api/v1/ratings/{ratingId}/moderate:
 *   put:
 *     summary: Moderate a rating (Admin only)
 *     tags: [Ratings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ratingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Rating ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [hide, show, dismiss_reports]
 *                 description: Moderation action
 *               adminNotes:
 *                 type: string
 *                 description: Admin notes
 *     responses:
 *       200:
 *         description: Rating moderated successfully
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
 *                   $ref: '#/components/schemas/Rating'
 *       400:
 *         description: Invalid action
 *       404:
 *         description: Rating not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.put('/:ratingId/moderate', authenticateAdmin, moderateRating);

module.exports = router;
