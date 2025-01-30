const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const Item = require('../models/Item');

/**
 * @desc Create a new category
 * @route POST /categories
 * @access Public
 */
const createCategory = async (req, res) => {
  await Promise.all([
    body('name').notEmpty().withMessage('Name is required').run(req),
    body('image').isURL().withMessage('Valid image URL is required').run(req),
    body('taxApplicability').notEmpty().withMessage('Tax Applicability is required').run(req),
    body('tax').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax must be between 0 and 100').run(req),
  ]);

  console.log("📨 Incoming POST Request:", req.body);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log("❌ Validation Errors:", errors.array());
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { name, image, description, taxApplicability, tax, taxType } = req.body;

    // **Fix: Use taxApplicability instead of taxApplicable**
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

    console.log("✅ Category Created Successfully:", newCategory.name);

    res.status(201).json({ 
      success: true, 
      message: `Category "${newCategory.name}" created successfully!`, 
      category: newCategory 
    });

  } catch (error) {
    console.error("❌ Server Error:", error.message);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
};


/**
 * @desc Get all categories with pagination
 * @route GET /categories
 */
const getAllCategories = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    // Retrieve categories with pagination
    const categories = await Category.find()
      .skip(skip)
      .limit(limit)
      .populate('subCategories', 'name image description');

    if (categories.length === 0) {
      return res.status(404).json({ message: "No categories found" });
    }

    // Get total count for pagination
    const totalCategories = await Category.countDocuments();

    res.status(200).json({
      message: "Categories fetched successfully",
      data: categories,
      pagination: {
        total: totalCategories,
        page,
        limit,
        totalPages: Math.ceil(totalCategories / limit)
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc Update category details
 * @route PUT /categories/:id
 */
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, image, description, taxApplicability, tax, taxType } = req.body;

    const taxApplicable = taxApplicability === "true";

    // Update category directly
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      {
        name,
        image,
        description,
        taxApplicability: taxApplicable,
        tax: taxApplicable ? parseFloat(tax) : 0,
        taxType: taxApplicable ? taxType : null
      },
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    // If tax settings changed, update subcategories & items that inherit tax
    await SubCategory.updateMany(
      { category: id, taxApplicability: true },
      { tax: updatedCategory.tax, taxType: updatedCategory.taxType }
    );

    await Item.updateMany(
      { category: id, taxApplicability: true },
      { tax: updatedCategory.tax, taxType: updatedCategory.taxType }
    );

    res.status(200).json({ message: "Category updated successfully", category: updatedCategory });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc Delete category with constraints
 * @route DELETE /categories/:id
 */
const deleteCategory = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    // Check if the category exists
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    // Check if items exist directly under the category
    const itemsUnderCategory = await Item.find({ category: id });
    if (itemsUnderCategory.length > 0) {
      return res.status(400).json({ message: "Cannot delete category. Items exist under this category." });
    }

    // Find all subcategories under the category
    const subcategories = await SubCategory.find({ category: id });

    for (let subcategory of subcategories) {
      // Check if items exist under this subcategory
      const items = await Item.find({ subCategory: subcategory._id });

      // If items exist, restrict deletion
      if (items.length > 0) {
        return res.status(400).json({ message: `Cannot delete category. Items exist under subcategory: ${subcategory.name}` });
      }

      // Delete subcategory
      await SubCategory.findByIdAndDelete(subcategory._id, { session });
    }

    // Delete the category
    await Category.findByIdAndDelete(id, { session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({ message: "Category and associated subcategories deleted successfully" });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { createCategory, getAllCategories, updateCategory, deleteCategory };
