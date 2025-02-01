const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Item = require('../models/Item');
const SubCategory = require('../models/SubCategory');
const { handleTaxUpdate, updateAllItems, getEffectiveTax } = require('../utils/taxUtils'); // ✅ Use `handleTaxUpdate`

// ✅ Render Categories Page
router.get('/', async (req, res) => {
    try {
        const categories = await Category.find().lean();
        res.render('category', { categories });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ Create a New Category
router.post('/', async (req, res) => {
    try {
        const category = new Category(req.body);
        await category.save();
        res.redirect('/categories');
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// ✅ Render Edit Category Page
router.get('/edit/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id).lean();
        if (!category) return res.status(404).json({ error: 'Category not found' });

        res.render('editCategory', { category });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ Update Category (Now Uses `handleTaxUpdate`)
router.patch('/:id', async (req, res) => {
    try {
        const categoryId = req.params.id;

        // Check if category exists
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // Validate and update
        const updatedCategory = await Category.findByIdAndUpdate(categoryId, req.body, { new: true });

        if (!updatedCategory) {
            return res.status(500).json({ error: 'Failed to update category' });
        }

        // ✅ If tax changes, update all child items
        if ('tax' in req.body || 'taxApplicability' in req.body) {
            await updateAllItems(updatedCategory._id, true);
        }

        res.redirect('/categories');
    } catch (error) {
        console.error('❌ Error updating category:', error);
        res.status(400).json({ error: error.message });
    }
});


// ✅ View Items Inside a Category (If No Subcategories)
router.get('/:id/items', async (req, res) => {
  try {
      const category = await Category.findById(req.params.id).lean();
      if (!category) return res.status(404).send('❌ Category not found');

      // ✅ Fetch only items that belong directly to the category (without subcategories)
      const items = await Item.find({ category: req.params.id, subCategory: null }).lean();

      res.render('itemcategory', { category, items });
  } catch (error) {
      res.status(500).send('❌ Error fetching items: ' + error.message);
  }
});

// ✅ View Subcategories Inside a Category
router.get('/:id/subcategories', async (req, res) => {
  try {
      const category = await Category.findById(req.params.id).lean();
      if (!category) return res.status(404).send('❌ Category not found');

      const subcategories = await SubCategory.find({ category: req.params.id }).lean();
      res.render('subcategory', { category, subcategories });
  } catch (error) {
      res.status(500).send('❌ Error fetching subcategories: ' + error.message);
  }
});

module.exports = router;
