const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const Category = require('../models/Category');

// Validation Middleware
const validateCategory = [
  body('name').notEmpty().withMessage('Name is required'),
  body('image').isURL().withMessage('Image must be a valid URL'),
  body('description').notEmpty().withMessage('Description is required'),
  body('taxApplicability').isBoolean().withMessage('Tax Applicability must be a boolean'),
  body('tax')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Tax must be a non-negative number'),
  body('taxType')
    .optional()
    .isIn(['percentage', 'fixed'])
    .withMessage('Tax Type must be either "percentage" or "fixed"'),
];


// POST /categories - Create a category
router.post('/', validateCategory, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { name, image, description, taxApplicability, tax, taxType } = req.body;

    const category = new Category({
      name,
      image,
      description,
      taxApplicability: taxApplicability === 'true', // Convert string to boolean
      tax: taxApplicability === 'true' ? tax : 0,
      taxType: taxApplicability === 'true' ? taxType : null,
    });

    await category.save();
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /categories - Retrieve all categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find();
    if (!categories.length) {
      return res.status(404).json({ message: 'No categories found' });
    }
    res.render('categories', { categories });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /categories/:id/edit - Render the edit form for a category
router.get('/:id/edit', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).send('Category not found');
    }
    res.render('edit', { category });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// PUT /categories/:id - Edit a category
router.put('/:id', validateCategory, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    const { name, image, description, taxApplicability, tax, taxType } = req.body;

    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      {
        name,
        image,
        description,
        taxApplicability: taxApplicability || false,
        tax: taxApplicability ? tax : 0,
        taxType: taxApplicability ? taxType : 'percentage'
      },
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(updatedCategory);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


module.exports = router;
