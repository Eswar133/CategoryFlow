const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const SubCategory = require('../models/SubCategory');
const Category = require('../models/Category');
const Item = require('../models/Item');
const { body, validationResult } = require('express-validator');
const methodOverride = require('method-override');

router.use(methodOverride('_method')); // Enable PUT and DELETE support in forms

/**
 * @desc Create a subcategory under a category
 * @route POST /categories/:categoryId/subcategories
 */
router.post('/:categoryId/subcategories', async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { name, image, description, taxApplicability, tax, taxType } = req.body;

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).render('subcategories', {
                category: null,
                subcategories: [],
                errors: [{ msg: "Category not found" }],
            });
        }

        const existingSubCategory = await SubCategory.findOne({ name, category: categoryId });
        if (existingSubCategory) {
            const subcategories = await SubCategory.find({ category: categoryId });
            return res.render('subcategories', {
                category,
                subcategories,
                errors: [{ msg: "Subcategory name already exists in this category" }],
            });
        }

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
        console.error("Error creating subcategory:", error);
        res.status(500).render('subcategories', {
            category: null,
            subcategories: [],
            errors: [{ msg: "Server error occurred while creating subcategory" }],
        });
    }
});

/**
 * @desc Get all subcategories under a category
 * @route GET /categories/:categoryId/subcategories
 */
router.get('/:categoryId/subcategories', async (req, res) => {
    try {
        const { categoryId } = req.params;

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).render('subcategories', { 
                category: null, 
                subcategories: [], 
                errors: [{ msg: "Category not found" }] 
            });
        }

        const subcategories = await SubCategory.find({ category: categoryId });
        res.render('subcategories', { category, subcategories, errors: [] });

    } catch (error) {
        console.error("Error fetching subcategories:", error);
        res.status(500).render('subcategories', { 
            category: null, 
            subcategories: [], 
            errors: [{ msg: "Server error occurred while fetching subcategories." }] 
        });
    }
});

/**
 * @desc Get all items under a subcategory
 * @route GET /subcategories/:id/items
 */
router.get("/:id/items", async (req, res) => {
    try {
        const subCategory = await SubCategory.findById(req.params.id);
        if (!subCategory) {
            return res.status(404).render("items", { items: [], subCategory: null, category: null, error: "Subcategory not found" });
        }

        const category = await Category.findById(subCategory.category);
        const items = await Item.find({ subCategory: subCategory._id });

        res.render("items", { items, subCategory, category, error: null });

    } catch (error) {
        res.status(500).render("items", { items: [], subCategory: null, category: null, error: "Server error while fetching items." });
    }
});

/**
 * @desc Get a single subcategory details
 * @route GET /subcategories/:id
 */
router.get("/:id", async (req, res) => {
    try {
        const subCategory = await SubCategory.findById(req.params.id);
        if (!subCategory) {
            return res.status(404).render("items", { 
                items: [], 
                subCategory: null, 
                category: null, 
                item: null, 
                error: "Subcategory not found" 
            });
        }

        const category = await Category.findById(subCategory.category);
        const items = await Item.find({ subCategory: subCategory._id });

        res.render("items", { 
            items, 
            subCategory, 
            category, 
            item: null, 
            error: null 
        });

    } catch (error) {
        res.status(500).render("items", { 
            items: [], 
            subCategory: null, 
            category: null, 
            item: null, 
            error: "Server error while fetching items." 
        });
    }
});

/**
 * @desc Render Edit Subcategory Page
 * @route GET /subcategories/:id/edit
 */
router.get('/:id/edit', async (req, res) => {
    try {
        const subcategory = await SubCategory.findById(req.params.id);
        if (!subcategory) {
            return res.status(404).send("Subcategory not found");
        }

        const category = await Category.findById(subcategory.category);
        if (!category) {
            return res.status(404).send("Parent category not found");
        }

        res.render('editSubcategory', { subcategory, category, errors: [], message: null });
    } catch (error) {
        res.status(500).send("Server Error");
    }
});

/**
 * @desc Update a subcategory
 * @route PUT /subcategories/:id
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, image, description, taxApplicability, tax, taxType } = req.body;

        const subCategory = await SubCategory.findById(id).populate('category');
        if (!subCategory) {
            return res.status(404).json({ success: false, message: "Subcategory not found" });
        }

        const updatedSubCategory = await SubCategory.findByIdAndUpdate(
            id,
            {
                name: name || subCategory.name,
                image: image || subCategory.image,
                description: description || subCategory.description,
                taxApplicability: taxApplicability !== undefined ? taxApplicability : subCategory.taxApplicability,
                tax: taxApplicability ? (tax !== undefined ? tax : subCategory.tax) : 0,
                taxType: taxApplicability ? (taxType !== undefined ? taxType : subCategory.taxType) : null
            },
            { new: true }
        ).populate('category'); 

        return res.status(200).json({
            success: true,
            message: "Subcategory updated successfully!",
            subCategory: updatedSubCategory,
            categoryName: updatedSubCategory.category.name 
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
});

/**
 * @desc Delete a subcategory
 * @route DELETE /subcategories/:id
 */
router.delete('/:id', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;

        const subCategory = await SubCategory.findById(id);
        if (!subCategory) {
            return res.status(404).json({ message: "Subcategory not found" });
        }

        const itemsUnderSubCategory = await Item.find({ subCategory: id });

        if (itemsUnderSubCategory.length > 0) {
            await Item.updateMany(
                { subCategory: id },
                { $unset: { subCategory: "" }, category: subCategory.category },
                { session }
            );
        }

        await SubCategory.findByIdAndDelete(id, { session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({ message: "Subcategory deleted successfully. Items reassigned to the main category." });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

module.exports = router;
