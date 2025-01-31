const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const methodOverride = require('method-override');
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const Item = require('../models/Item');

router.use(methodOverride('_method')); // Enable PUT/DELETE in forms

// 🏠 Categories Homepage
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    const categories = await Category.find()
      .skip(skip)
      .limit(limit)
      .populate('subCategories', 'name image description');

    const totalCategories = await Category.countDocuments();

    res.render('categories', {
      categories,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCategories / limit),
        hasNext: page * limit < totalCategories,
        hasPrev: page > 1
      },
      errors: []
    });
  } catch (error) {
    res.status(500).send("Server Error");
  }
});

// 📝 Create Category Form
router.get('/new', (req, res) => {
  res.render('newCategory', { errors: [], category: null });
});

// ✅ Create Category
router.post('/', [
  body('name').notEmpty().withMessage('Name is required'),
  body('image').isURL().withMessage('Valid image URL is required'),
  body('taxApplicability').notEmpty().withMessage('Tax Applicability is required'),
  body('tax').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax must be between 0-100')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('newCategory', { 
      errors: errors.array(), 
      category: null 
    });
  }

  try {
    const { name, image, description, taxApplicability, tax, taxType } = req.body;
    const isTaxApplicable = taxApplicability === "true";

    const newCategory = new Category({
      name,
      image,
      description,
      taxApplicability: isTaxApplicable,
      tax: isTaxApplicable ? parseFloat(tax) : 0,
      taxType: isTaxApplicable ? taxType : null,
    });

    await newCategory.save();
    res.redirect(`/api/v1/categories/${newCategory._id}`);
  } catch (error) {
    res.status(500).render('newCategory', {
      errors: [{ msg: 'Server error: ' + error.message }],
      category: null
    });
  }
});

// 👀 View Single Category
router.get('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).send("Category not found");

    const [subcategories, items] = await Promise.all([
      SubCategory.find({ category: category._id }),
      Item.find({ category: category._id })
    ]);

    res.render('category', { category, subcategories, items });
  } catch (error) {
    res.status(500).send("Server Error");
  }
});

// ✏️ Edit Category Form
router.get('/:id/edit', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).send("Category not found");
    res.render('editCategory', { category, errors: [], message: null });
  } catch (error) {
    res.status(500).redirect('/api/v1/categories');
  }
});

// ✅ Update Category
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, image, description, taxApplicability, tax, taxType } = req.body;

        const updatedCategory = await Category.findByIdAndUpdate(
            id,
            {
                name,
                image,
                description,
                taxApplicability: taxApplicability === 'true',
                tax: taxApplicability === 'true' ? parseFloat(tax) : 0,
                taxType: taxApplicability === 'true' ? taxType : null
            },
            { new: true }
        );

        if (!updatedCategory) {
            return res.status(404).json({ message: "Category not found" });
        }

        // ✅ Update all subcategories that inherit from category
        await SubCategory.updateMany(
            { category: id, taxApplicability: true },
            { tax: updatedCategory.tax, taxType: updatedCategory.taxType }
        );

        // ✅ Update all items that inherit from category or subcategories
        await Item.updateMany(
            { category: id, taxApplicability: true },
            { tax: updatedCategory.tax, taxType: updatedCategory.taxType }
        );

        res.json({ message: "Category updated successfully", category: updatedCategory });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});


// 🗑️ Delete Category
router.delete('/:id', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const category = await Category.findById(req.params.id).session(session);
    if (!category) {
      return res.status(404).json({ success: false, message: "Category not found" });
    }

    const itemsExist = await Item.exists({ category: category._id }).session(session);
    if (itemsExist) {
      throw new Error("Cannot delete category with existing items");
    }

    const subcategories = await SubCategory.find({ category: category._id }).session(session);
    for (const subcategory of subcategories) {
      const subcategoryItems = await Item.exists({ subCategory: subcategory._id }).session(session);
      if (subcategoryItems) {
        throw new Error(`Cannot delete - items exist in subcategory: ${subcategory.name}`);
      }
      await SubCategory.findByIdAndDelete(subcategory._id).session(session);
    }

    await Category.findByIdAndDelete(category._id).session(session);
    await session.commitTransaction();
    
    res.json({ success: true, message: "Category deleted successfully!" });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ 
      success: false, 
      message: error.message || "Server error during deletion"
    });
  } finally {
    session.endSession();
  }
});

// ➕ Subcategory Routes

// 🆕 Create Subcategory Form
router.get('/:categoryId/subcategories/new', async (req, res) => {
  try {
    const category = await Category.findById(req.params.categoryId);
    if (!category) return res.status(404).send("Parent category not found");
    res.render('newSubcategory', { category, errors: [] });
  } catch (error) {
    res.status(500).redirect('/api/v1/categories');
  }
});

// ✅ Create Subcategory
router.post('/:categoryId/subcategories', [
  body('name').notEmpty().withMessage('Subcategory name is required'),
  body('image').isURL().withMessage('Valid image URL is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const category = await Category.findById(req.params.categoryId);
    return res.render('newSubcategory', {
      category,
      errors: errors.array()
    });
  }

  try {
    const { name, image, description, taxApplicability, tax, taxType } = req.body;
    const category = await Category.findById(req.params.categoryId);

    const newSub = new SubCategory({
      name,
      image,
      description,
      category: category._id,
      taxApplicability: taxApplicability === "true",
      tax: taxApplicability === "true" ? parseFloat(tax) : 0,
      taxType: taxApplicability === "true" ? taxType : null
    });

    await newSub.save();
    res.redirect(`/api/v1/categories/${category._id}/subcategories`);
  } catch (error) {
    res.status(500).render('newSubcategory', {
      errors: [{ msg: 'Server error: ' + error.message }],
      category: null
    });
  }
});

// 👀 View Subcategories
router.get('/:categoryId/subcategories', async (req, res) => {
  try {
    const category = await Category.findById(req.params.categoryId);
    if (!category) return res.status(404).send("Parent category not found");

    const subcategories = await SubCategory.find({ category: category._id });
    res.render('subcategories', {
      category,
      subcategories,
      errors: []
    });
  } catch (error) {
    res.status(500).render('subcategories', {
      errors: [{ msg: "Server error fetching subcategories" }]
    });
  }
});

module.exports = router;