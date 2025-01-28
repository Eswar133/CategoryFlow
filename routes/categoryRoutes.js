const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

// POST /categories - Create a category
router.post('/', async (req, res) => {
  try {
    const category = new Category(req.body);
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
    res.render('categories', { categories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
