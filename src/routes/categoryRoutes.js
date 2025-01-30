const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const Item = require('../models/Item');
const { body, validationResult } = require('express-validator');
const methodOverride = require('method-override');

const { createCategory, getAllCategories, updateCategory, deleteCategory } = require('../controllers/categoryController');

router.use(methodOverride('_method')); // Enable PUT support in forms

// ✅ Create a new category
router.post('/:categoryId/subcategories', async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { name, image, description, taxApplicability, tax, taxType } = req.body;

        // Ensure the category exists
        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).render('subcategories', {
                category: null,
                subcategories: [],
                errors: [{ msg: 'Category not found' }],
            });
        }

        // Check if the subcategory already exists
        const existingSubCategory = await SubCategory.findOne({ name, category: categoryId });
        if (existingSubCategory) {
            const subcategories = await SubCategory.find({ category: categoryId });
            return res.render('subcategories', {
                category,
                subcategories,
                errors: [{ msg: 'Subcategory name already exists' }],
            });
        }

        // Create a new subcategory
        const newSubCategory = new SubCategory({
            name,
            image,
            description,
            category: categoryId,
            taxApplicability,
            tax,
            taxType,
        });

        await newSubCategory.save();
        res.redirect(`/api/v1/categories/${categoryId}/subcategories`);
    } catch (error) {
        console.error('Error creating subcategory:', error);
        res.status(500).render('subcategories', {
            category: null,
            subcategories: [],
            errors: [{ msg: 'Server error while creating subcategory' }],
        });
    }
});


// ✅ Get all categories with pagination
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Retrieve categories with pagination
        const categories = await Category.find()
            .skip(skip)
            .limit(limit);

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

// ✅ Get a single category and render its page
router.get('/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).send("Category not found");
        }

        const subcategories = await SubCategory.find({ category: category._id });
        const items = await Item.find({ category: category._id });

        // ✅ Use 'category.ejs' instead of 'categories.ejs'
        res.render('category', { category, subcategories, items });
    } catch (error) {
        console.error("Error fetching category:", error);
        res.status(500).send("Server Error");
    }
});

// ✅ Render Edit Category Page
router.get('/:id/edit', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).send("Category not found");
        }
        res.render('editCategory', { category, errors: [], message: null });
    } catch (error) {
        res.status(500).redirect('/');
    }
});

// ✅ Update Category (PUT)
router.put('/:id', [
    body('name').notEmpty().withMessage('Category name is required'),
    body('image').isURL().withMessage('Valid image URL is required'),
    body('tax')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('Tax percentage must be between 0 and 100')
], async (req, res) => {
    const errors = validationResult(req);

    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).send("Category not found");
        }

        if (!errors.isEmpty()) {
            return res.render('editCategory', { category, errors: errors.array(), message: null });
        }

        const { name, image, description, taxApplicability, tax, taxType } = req.body;

        const taxChanged = (
            category.taxApplicability !== taxApplicability ||
            category.tax !== tax ||
            category.taxType !== taxType
        );

        // ✅ Update category details
        category.name = name;
        category.image = image;
        category.description = description;
        category.taxApplicability = taxApplicability === "true"; // Ensure boolean conversion
        category.tax = tax ? parseFloat(tax) : 0;
        category.taxType = taxType;

        await category.save();

        // ✅ If tax settings changed, update subcategories & items that inherit tax
        if (taxChanged) {
            await SubCategory.updateMany(
                { category: category._id, taxApplicability: true },
                { tax: category.tax, taxType: category.taxType }
            );

            await Item.updateMany(
                { category: category._id, taxApplicability: true },
                { tax: category.tax, taxType: category.taxType }
            );
        }

        console.log("✅ Category updated successfully");

        // ✅ Redirect after successful update (Fixing multiple response issue)
        return res.redirect('/api/v1/categories');

    } catch (error) {
        console.error("❌ Error updating category:", error);
        return res.status(500).send("Server Error");
    }
});

// ✅ Delete a category
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Check if the category exists
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({ success: false, message: "Category not found" });
        }

        // Check if items exist under this category
        const itemsUnderCategory = await Item.find({ category: id });
        if (itemsUnderCategory.length > 0) {
            return res.status(400).json({ success: false, message: "Cannot delete. Items exist under this category." });
        }

        // Delete the category
        await Category.findByIdAndDelete(id);

        res.json({ success: true, message: "Category deleted successfully!" });

    } catch (error) {
        console.error("❌ Error deleting category:", error);
        res.status(500).json({ success: false, message: "Server error. Try again!" });
    }
});

// ✅ Get subcategories for a specific category
router.get('/:id/subcategories', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).render('subcategories', {
                category: null,
                subcategories: [],
                errors: [{ msg: "Category not found" }]
            });
        }

        const subcategories = await SubCategory.find({ category: category._id });

        // Add errors: [] here 👇
        res.render('subcategories', {
            category,
            subcategories,
            errors: []  // This fixes the undefined issue
        });

    } catch (error) {
        console.error("Error fetching subcategories:", error);
        res.status(500).render('subcategories', {
            errors: [{ msg: "Server error" }]
        });
    }
});


module.exports = router;