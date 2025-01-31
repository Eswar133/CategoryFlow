const express = require("express");
const router = express.Router();
const mongoose = require('mongoose');
const Item = require('../models/Item');
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const { body, validationResult } = require('express-validator');
const methodOverride = require('method-override');

router.use(methodOverride('_method')); // Enable PUT and DELETE support in forms

/**
 * @desc Create an item under a subcategory or category
 * @route POST /items
 */
router.post("/", async (req, res) => {
    try {
        const { name, image, description, baseAmount, discount, taxApplicability, tax, taxType, categoryId, subCategoryId } = req.body;

        if (!categoryId && !subCategoryId) {
            return res.status(400).json({ message: "Item must be assigned to either a category or a subcategory" });
        }

        let parentTaxApplicability = false, parentTax = 0, parentTaxType = null;

        if (subCategoryId) {
            const subCategory = await SubCategory.findById(subCategoryId);
            if (!subCategory) {
                return res.status(404).json({ message: "Subcategory not found" });
            }
            parentTaxApplicability = subCategory.taxApplicability;
            parentTax = subCategory.tax;
            parentTaxType = subCategory.taxType;
        } else if (categoryId) {
            const category = await Category.findById(categoryId);
            if (!category) {
                return res.status(404).json({ message: "Category not found" });
            }
            parentTaxApplicability = category.taxApplicability;
            parentTax = category.tax;
            parentTaxType = category.taxType;
        }

        const finalTaxApplicability = taxApplicability !== undefined ? taxApplicability === 'true' : parentTaxApplicability;
        const finalTax = finalTaxApplicability ? (tax !== undefined ? parseFloat(tax) : parentTax) : 0;
        const finalTaxType = finalTaxApplicability ? (taxType !== undefined ? taxType : parentTaxType) : null;

        let taxAmount = 0;
        if (finalTaxApplicability) {
            taxAmount = finalTaxType === "percentage" ? (finalTax / 100) * baseAmount : finalTax;
        }
        const totalAmount = parseFloat(baseAmount) - (parseFloat(discount) || 0) + taxAmount;

        const newItem = new Item({
            name,
            image,
            description,
            baseAmount,
            discount: discount || 0,
            taxApplicability: finalTaxApplicability,
            tax: finalTax,
            taxType: finalTaxType,
            totalAmount,
            category: categoryId || null,
            subCategory: subCategoryId || null
        });

        await newItem.save();
        res.status(201).json({ message: "Item created successfully", item: newItem });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

/**
 * @desc Get all items with filtering & pagination
 * @route GET /items
 */
router.get("/", async (req, res) => {
    try {
        let { page, limit, categoryId, subCategoryId, taxApplicability, minPrice, maxPrice, search } = req.query;

        page = parseInt(page) || 1;
        limit = parseInt(limit) || 10;
        const skip = (page - 1) * limit;

        let filter = {};
        if (categoryId) filter.category = categoryId;
        if (subCategoryId) filter.subCategory = subCategoryId;
        if (taxApplicability !== undefined) filter.taxApplicability = taxApplicability === 'true';
        if (minPrice) filter.totalAmount = { $gte: parseFloat(minPrice) };
        if (maxPrice) filter.totalAmount = { ...filter.totalAmount, $lte: parseFloat(maxPrice) };
        if (search) filter.name = { $regex: search, $options: "i" };

        const items = await Item.find(filter)
            .skip(skip)
            .limit(limit)
            .populate('category', 'name')
            .populate('subCategory', 'name');

        const totalItems = await Item.countDocuments(filter);

        if (items.length === 0) {
            return res.status(404).json({ message: "No items found" });
        }

        res.status(200).json({
            message: "Items fetched successfully",
            data: items,
            pagination: {
                total: totalItems,
                page,
                limit,
                totalPages: Math.ceil(totalItems / limit)
            }
        });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

/**
 * @desc Render the Edit Item Page
 * @route GET /items/:id/edit
 */
router.get("/:id/edit", async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item) {
            return res.status(404).send("Item not found");
        }

        const category = item.category ? await Category.findById(item.category) : null;
        const subCategory = item.subCategory ? await SubCategory.findById(item.subCategory) : null;

        res.render("editItem", { item, category, subCategory, error: null });

    } catch (error) {
        console.error("❌ Error fetching item for edit:", error);
        res.status(500).send("Server Error");
    }
});

router.get("/:id", async (req, res) => {
    try {
        const item = await Item.findById(req.params.id);
        if (!item) {
            return res.status(404).send("Item not found");
        }

        const category = item.category ? await Category.findById(item.category) : null;
        const subCategory = item.subCategory ? await SubCategory.findById(item.subCategory) : null;

        res.render("items", { item, category, subCategory, items: [], error: null });

    } catch (error) {
        console.error("❌ Error fetching item:", error);
        res.status(500).send("Server Error");
    }
});

/**
 * @desc Update an item
 * @route PUT /items/:id
 */
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, image, description, baseAmount, discount, taxApplicability, tax, taxType, categoryId, subCategoryId } = req.body;

        let parentTaxApplicability = false, parentTax = 0, parentTaxType = null;

        if (subCategoryId) {
            const subCategory = await SubCategory.findById(subCategoryId);
            if (!subCategory) {
                return res.status(404).json({ message: "Subcategory not found" });
            }
            parentTaxApplicability = subCategory.taxApplicability;
            parentTax = subCategory.tax;
            parentTaxType = subCategory.taxType;
        } else if (categoryId) {
            const category = await Category.findById(categoryId);
            if (!category) {
                return res.status(404).json({ message: "Category not found" });
            }
            parentTaxApplicability = category.taxApplicability;
            parentTax = category.tax;
            parentTaxType = category.taxType;
        }

        const finalTaxApplicability = taxApplicability !== undefined ? taxApplicability : parentTaxApplicability;
        const finalTax = finalTaxApplicability ? (tax !== undefined ? tax : parentTax) : 0;
        const finalTaxType = finalTaxApplicability ? (taxType !== undefined ? taxType : parentTaxType) : null;

        const totalAmount = parseFloat(baseAmount) - (parseFloat(discount) || 0) + (finalTaxType === "percentage" ? (finalTax / 100) * baseAmount : finalTax);

        const updatedItem = await Item.findByIdAndUpdate(
            id,
            {
                name,
                image,
                description,
                baseAmount,
                discount,
                taxApplicability: finalTaxApplicability,
                tax: finalTax,
                taxType: finalTaxType,
                totalAmount,
                category: categoryId || null,
                subCategory: subCategoryId || null
            },
            { new: true }
        );

        if (!updatedItem) {
            return res.status(404).json({ message: "Item not found" });
        }

        res.status(200).json({ message: "Item updated successfully", item: updatedItem });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

/**
 * @desc Delete an item
 * @route DELETE /items/:id
 */
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const item = await Item.findById(id);
        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }

        await Item.findByIdAndDelete(id);

        res.status(200).json({ message: "Item deleted successfully" });

    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
});

module.exports = router;
