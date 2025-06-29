const express = require('express');
const router = express.Router();
const {
    addUniversity,
    getAllUniversities,
    updateUniversityStatus,
    getUniversity
} = require('../controllers/universityControllers');
// const { authenticate } = require('../middlewares/authenticate');
const authenticate = require('../middlewares/authenticate');

/**
 * @swagger
 * /universities:
 *   get:
 *     tags: [Universities]
 *     summary: Get all universities
 *     description: Retrieve a list of all universities available on the platform
 *     responses:
 *       200:
 *         description: List of universities retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       state:
 *                         type: string
 *                       isActive:
 *                         type: boolean
 */
router.get('/', getAllUniversities);

/**
 * @swagger
 * /universities/add:
 *   post:
 *     tags: [Universities]
 *     summary: Add a new university
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - state
 *             properties:
 *               name:
 *                 type: string
 *               state:
 *                 type: string
 *     responses:
 *       201:
 *         description: University added successfully
 *       400:
 *         description: Invalid input or university already exists
 *       401:
 *         description: Not authorized
 */
router.post('/add', authenticate, addUniversity);

/**
 * @swagger
 * /universities/{id}:
 *   get:
 *     tags: [Universities]
 *     summary: Get university by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: University details retrieved successfully
 *       404:
 *         description: University not found
 */
router.get('/:id', getUniversity);

/**
 * @swagger
 * /universities/{id}/status:
 *   put:
 *     tags: [Universities]
 *     summary: Update university status
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: University status updated successfully
 *       404:
 *         description: University not found
 */
router.put('/:id/status', authenticate, updateUniversityStatus);

module.exports = router;
