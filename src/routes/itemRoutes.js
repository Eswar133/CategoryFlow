const express = require("express");
const router = express.Router();
const Item = require('../models/Item');
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const { body, validationResult } = require('express-validator');
const methodOverride = require('method-override');

const { createItem, getAllItems,  deleteItem, searchItems } = require("../controllers/itemController");

router.use(methodOverride('_method')); // Enable PUT support in forms

// ✅ Create an item
router.post("/", createItem);

// ✅ Get all items
router.get("/", getAllItems);

router.get("/subcategory/:subCategoryId", async (req, res) => {
    try {
        const subCategory = await SubCategory.findById(req.params.subCategoryId);
        if (!subCategory) {
            return res.status(404).render("items", { items: [], subCategory: null, category: null, error: "Subcategory not found" });
        }

        const category = await Category.findById(subCategory.category);
        const items = await Item.find({ subCategory: subCategory._id });

        res.render("items", { items, subCategory, category, item: null, error: null });

    } catch (error) {
        res.status(500).render("items", { items: [], subCategory: null, category: null, item: null, error: "Server error while fetching items." });
    }
});


// ✅ Get a single item details
router.get("/:id", async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item) {
            return res.status(404).render("items", { item: null, items: [], category: null, subCategory: null, error: "Item not found" });
        }

        const category = await Category.findById(item.category);
        const subCategory = item.subCategory ? await SubCategory.findById(item.subCategory) : null;

        res.render("items", { item, items: [], category, subCategory, error: null });

    } catch (error) {
        res.status(500).render("items", { item: null, items: [], category: null, subCategory: null, error: "Server Error" });
    }
});


// ✅ Render Edit Item Page (Newly Added)
router.get('/:id/edit', async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item) {
            return res.status(404).send("Item not found");
        }

        const category = await Category.findById(item.category);
        let subCategory = null;
        if (item.subCategory) {
            subCategory = await SubCategory.findById(item.subCategory);
        }

        res.render('editItem', { item, category, subCategory, errors: [], message: null });

    } catch (error) {
        res.status(500).send("Server Error");
    }
});

// ✅ Update Item (Ensures Validation)
router.put('/:id', [
    body('name').notEmpty().withMessage('Item name is required'),
    body('image').isURL().withMessage('Valid image URL is required'),
    body('baseAmount').isFloat({ min: 0 }).withMessage('Base amount must be a positive number'),
    body('discount').optional().isFloat({ min: 0 }).withMessage('Discount must be a positive number'),
    body('tax').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax must be between 0 and 100'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const item = await Item.findById(req.params.id);
        const category = await Category.findById(item.category);
        let subCategory = null;
        if (item.subCategory) {
            subCategory = await SubCategory.findById(item.subCategory);
        }
        return res.render('editItem', { item, category, subCategory, errors: errors.array(), message: null });
    }

    try {
        const { name, image, description, baseAmount, discount, taxApplicability, tax, taxType, overrideTax } = req.body;

        const item = await Item.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }

        const updatedItem = {
            name,
            image,
            description,
            baseAmount: parseFloat(baseAmount),
            discount: parseFloat(discount) || 0,
            taxApplicability: overrideTax === "true",
            tax: overrideTax === "true" ? parseFloat(tax) : item.tax,
            taxType: overrideTax === "true" ? taxType : item.taxType,
            totalAmount: parseFloat(baseAmount) - (parseFloat(discount) || 0) + (overrideTax === "true" ? parseFloat(tax) : item.tax),
        };

        await Item.findByIdAndUpdate(req.params.id, updatedItem);

        res.redirect(`/items/${item._id}`);

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
});

// ✅ Delete an item
router.delete("/:id", deleteItem);

module.exports = router;
