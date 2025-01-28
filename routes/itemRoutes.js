const express = require('express');
const router = express.Router();
const Item = require('../models/Item');

// POST /categories/:categoryId/subcategories/:subCategoryId/items
router.post('/categories/:categoryId/subcategories/:subCategoryId/items', async (req, res) => {
  try {
    const { categoryId, subCategoryId } = req.params;
    const { name, image, description, baseAmount, discount } = req.body;

    const totalAmount = baseAmount - discount;

    const item = new Item({
      name,
      image,
      description,
      baseAmount,
      discount,
      totalAmount,
      category: categoryId,
      subCategory: subCategoryId
    });
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /categories/:categoryId/subcategories/:subCategoryId/items
router.get('/categories/:categoryId/subcategories/:subCategoryId/items', async (req, res) => {
  try {
    const items = await Item.find({
      category: req.params.categoryId,
      subCategory: req.params.subCategoryId
    });
    res.render('items', { items, categoryId: req.params.categoryId, subCategoryId: req.params.subCategoryId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
