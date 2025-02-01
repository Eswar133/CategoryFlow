const express = require('express');
const router = express.Router();
const SubCategory = require('../models/SubCategory');
const Category = require('../models/Category');
const Item = require('../models/Item');
const { handleTaxUpdate,  } = require('../utils/taxUtils'); // ✅ Use `handleTaxUpdate`

// ✅ Render Subcategories Page
router.get('/', async (req, res) => {
    try {
        const categoryId = req.query.categoryId;
        if (!categoryId) return res.status(400).send("❌ Category ID is required.");

        const category = await Category.findById(categoryId);
        if (!category) return res.status(404).send("❌ Category not found.");

        const subcategories = await SubCategory.find({ category: categoryId });

        res.render('subcategory', { category, subcategories });
    } catch (error) {
        res.status(500).send("❌ Internal Server Error: " + error.message);
    }
});

// ✅ Create a New Subcategory
router.post('/', async (req, res) => {
    try {
        const subCategory = new SubCategory(req.body);
        await subCategory.save();
        res.redirect(`/subcategories?categoryId=${subCategory.category}`);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// ✅ Edit Subcategory
router.get('/edit/:id', async (req, res) => {
    try {
        const subCategory = await SubCategory.findById(req.params.id).lean();
        if (!subCategory) return res.status(404).send("Subcategory not found");

        const categories = await Category.find().lean();
        res.render('editSubCategory', { subCategory, categories });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// ✅ View Items Inside a Subcategory
router.get('/:id/items', async (req, res) => {
    try {
        const subCategoryId = req.params.id;

        // Fetch the subcategory and its associated category
        const subCategory = await SubCategory.findById(subCategoryId).populate('category').lean();
        if (!subCategory) return res.status(404).send('❌ Subcategory not found');

        // ✅ Fetch items under the specific subcategory
        const items = await Item.find({ subCategory: subCategoryId }).lean();

        // ✅ Render items page
        res.render('item', { subCategory, category: subCategory.category, items });
    } catch (error) {
        res.status(500).send("❌ Error fetching items: " + error.message);
    }
});

// ✅ Update Subcategory (Now Uses `handleTaxUpdate`)
router.patch('/:id', async (req, res) => {
  try {
    const updatedSubCategory = await SubCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });

    if (!updatedSubCategory) return res.status(404).json({ error: 'Subcategory not found' });

    // ✅ Update all related items if tax is changed
    if ('tax' in req.body || 'taxApplicability' in req.body) {
      await handleTaxUpdate(updatedSubCategory._id, false);
    }

    res.redirect('/categories/' + updatedSubCategory.category + '/subcategories'); // ✅ Redirect to subcategories list
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
