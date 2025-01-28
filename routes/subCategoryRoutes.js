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

    const subCategory = new SubCategory({
      ...req.body,
      category: req.params.id
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

module.exports = router;
