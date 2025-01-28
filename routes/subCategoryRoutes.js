const express = require('express');
const router = express.Router();
const SubCategory = require('../models/SubCategory');
const Category = require('../models/Category');

// POST /categories/:id/subcategories - Create a subcategory under a category
router.post('/categories/:id/subcategories', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const taxApplicability = req.body.taxApplicability ?? category.taxApplicability;
    const tax = taxApplicability ? (req.body.tax ?? category.tax) : 0;
    const taxType = req.body.taxType ?? category.taxType;

    const subCategory = new SubCategory({
      ...req.body,
      category: req.params.id,
      taxApplicability,
      tax,
      taxType,
    });

    await subCategory.save();
    res.status(201).json(subCategory);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /categories/:id/subcategories - Retrieve subcategories
router.get('/categories/:id/subcategories', async (req, res) => {
  try {
    const subCategories = await SubCategory.find({ category: req.params.id });
    res.render('subcategories', { subCategories, categoryId: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /subcategories/:id - Edit a subcategory
router.put('/subcategories/:id', async (req, res) => {
  try {
    const updatedSubCategory = await SubCategory.findByIdAndUpdate(
      req.params.id,     // Find the subcategory by its ID
      req.body,          // Update fields from request body
      { new: true }      // Return the updated subcategory
    );
    if (!updatedSubCategory) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }
    res.json(updatedSubCategory);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /subcategories/:id/edit - Render the edit form for a subcategory
router.get('/subcategories/:id/edit', async (req, res) => {
  try {
    const subCategory = await SubCategory.findById(req.params.id);
    if (!subCategory) {
      return res.status(404).send('Subcategory not found');
    }
    res.render('editSubCategory', { subCategory });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

module.exports = router;
