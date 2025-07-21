const University = require('../models/University');
const Restaurant = require('../models/Restaurants');

// Add a new university
const addUniversity = async (req, res) => {
    try {
        const { name, state } = req.body;

        if (!name || !state) {
            return res.status(400).json({
                status: 'error',
                message: 'Name and state are required'
            });
        }

        const existingUniversity = await University.findOne({ name });
        if (existingUniversity) {
            return res.status(400).json({
                status: 'error',
                message: 'University already exists'
            });
        }

        const university = new University({ name, state });
        await university.save();

        res.status(201).json({
            status: 'success',
            message: 'University added successfully',
            data: university
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Get all universities
const getAllUniversities = async (req, res) => {
    try {
        const universities = await University.find().sort({ name: 1 });
        res.status(200).json({
            status: 'success',
            data: universities
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Update university status
const updateUniversityStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        if (typeof isActive !== 'boolean') {
            return res.status(400).json({
                status: 'error',
                message: 'isActive must be a boolean value'
            });
        }

        const university = await University.findByIdAndUpdate(
            id,
            { isActive },
            { new: true }
        );

        if (!university) {
            return res.status(404).json({
                status: 'error',
                message: 'University not found'
            });
        }

        res.status(200).json({
            status: 'success',
            message: 'University status updated successfully',
            data: university
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Get single university
const getUniversity = async (req, res) => {
    try {
        const { id } = req.params;
        const university = await University.findById(id);

        if (!university) {
            return res.status(404).json({
                status: 'error',
                message: 'University not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: university
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

// Get all nearest landmarks for a university
const getUniversityLandmarks = async (req, res) => {
    try {
        const { id } = req.params;
        const university = await University.findById(id);
        if (!university) {
            return res.status(404).json({ status: 'error', message: 'University not found' });
        }
        // Use university.nearestLandmarks directly
        const uniqueLandmarks = [...new Set((university.nearestLandmarks || []).filter(Boolean))];
        res.status(200).json({
            status: 'success',
            university: university.name,
            universityId: university._id,
            landmarks: uniqueLandmarks
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

module.exports = {
    addUniversity,
    getAllUniversities,
    updateUniversityStatus,
    getUniversity,
    getUniversityLandmarks
};
