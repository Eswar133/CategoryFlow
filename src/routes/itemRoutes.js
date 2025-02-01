const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const { updateItemTotal } = require('../utils/taxUtils');

// ✅ Fetch All Items
router.get('/', async (req, res) => {
    try {
        const items = await Item.find().populate('category').populate('subCategory').lean();
        const categories = await Category.find().lean();
        const subcategories = await SubCategory.find().lean();

        res.render('item', { items, categories, subcategories });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.post('/', async (req, res) => {
    try {
        if (!req.body.category) {
            return res.status(400).json({ error: "Category is required" });
        }

        // ✅ If subCategory is empty, remove it
        if (!req.body.subCategory || req.body.subCategory.trim() === "") {
            delete req.body.subCategory;
        }

        const newItem = new Item(req.body);
        await newItem.save();
        await updateItemTotal(newItem);

        // ✅ Redirect to correct category or subcategory page
        if (newItem.subCategory) {
            return res.redirect(`/subcategories/${newItem.subCategory}/items`);
        } else if (newItem.category) {
            return res.redirect(`/categories/${newItem.category}/items`);
        }

        res.redirect('/categories'); // Fallback
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});



// ✅ Edit Item Page (Fetch Data)
router.get('/edit/:id', async (req, res) => {
    try {
        const item = await Item.findById(req.params.id).lean();
        if (!item) return res.status(404).send("❌ Item not found");

        const categories = await Category.find().lean();
        const subCategories = await SubCategory.find({ category: item.category }).lean();

        res.render('editItem', { item, categories, subCategories });
    } catch (error) {
        res.status(500).send(error.message);
    }
});


router.patch('/:id', async (req, res) => {
    try {
        // ✅ If subCategory is empty, remove it
        if (!req.body.subCategory || req.body.subCategory.trim() === "") {
            delete req.body.subCategory;
        }

        const updatedItem = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedItem) return res.status(404).json({ error: '❌ Item not found' });

        await updateItemTotal(updatedItem);

        // ✅ Redirect to correct category or subcategory page
        if (updatedItem.subCategory) {
            return res.redirect(`/subcategories/${updatedItem.subCategory}/items`);
        } else if (updatedItem.category) {
            return res.redirect(`/categories/${updatedItem.category}/items`);
        }

        res.redirect('/categories'); // Fallback
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});



// ✅ Delete an Item
router.delete('/:id', async (req, res) => {
    try {
        await Item.findByIdAndDelete(req.params.id);
        res.redirect('/items');
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ✅ View Items Inside a Subcategory
router.get('/subcategory/:id', async (req, res) => {
    try {
        const subCategoryId = req.params.id;

        // Fetch the subcategory and its associated category
        const subCategory = await SubCategory.findById(subCategoryId).populate('category').lean();
        if (!subCategory) return res.status(404).send('❌ Subcategory not found');

        // ✅ Fetch items under the specific subcategory
        const items = await Item.find({ subCategory: subCategoryId }).lean();

        // ✅ Render the correct page
        res.render('item', { subCategory, category: subCategory.category, items });
    } catch (error) {
        res.status(500).send("❌ Error fetching items: " + error.message);
    }
});

// ✅ View Items Inside a Category (If No Subcategories Exist)
router.get('/category/:id', async (req, res) => {
    try {
        const categoryId = req.params.id;

        // Fetch category
        const category = await Category.findById(categoryId).lean();
        if (!category) return res.status(404).send('❌ Category not found');

        // ✅ Check if category has subcategories
        const subcategories = await SubCategory.find({ category: categoryId }).lean();
        if (subcategories.length > 0) {
            return res.redirect(`/subcategories?categoryId=${categoryId}`);
        }

        // ✅ Fetch items directly under the category (if no subcategories exist)
        const items = await Item.find({ category: categoryId, subCategory: null }).lean();

        res.render('itemcategory', { category, items });
    } catch (error) {
        res.status(500).send("❌ Error fetching items: " + error.message);
    }
});

router.get('/subcategories/:id/items', async (req, res) => {
    try {
        const subCategoryId = req.params.id;

        // ✅ Fetch subcategory along with its category
        const subCategory = await SubCategory.findById(subCategoryId).populate('category').lean();
        if (!subCategory) return res.status(404).send('❌ Subcategory not found');

        // ✅ Fetch items under the specific subcategory
        const items = await Item.find({ subCategory: subCategoryId }).lean();

        // ✅ Render `item.ejs` and pass `subCategory`
        res.render('item', { items, subCategory, category: subCategory.category });

    } catch (error) {
        console.error('❌ Error fetching items:', error);
        res.status(500).send('❌ Error fetching items: ' + error.message);
    }
});


module.exports = router;
