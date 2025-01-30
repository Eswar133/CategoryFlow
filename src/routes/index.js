const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

/**
 * @desc Render homepage with paginated categories
 * @route GET /
 */
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Fetch categories with pagination
        const categories = await Category.find()
            .skip(skip)
            .limit(limit);

        const totalCategories = await Category.countDocuments();

        res.render('index', {
            categories,
            errors: [],
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalCategories / limit),
                hasNext: page * limit < totalCategories,
                hasPrev: page > 1
            }
        });
    } catch (error) {
        res.status(500).render('index', { categories: [], errors: [{ msg: "Server Error. Please try again later." }] });
    }
});

module.exports = router;
