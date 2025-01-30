const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const Item = require('../models/Item');
const mongoose = require('mongoose');

/**
 * @desc Create a subcategory under a category
 * @route POST /categories/:categoryId/subcategories
 * @access Public
 */
const createSubCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { name, image, description, taxApplicability, tax, taxType } = req.body;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    const existingSubCategory = await SubCategory.findOne({ name, category: categoryId });
    if (existingSubCategory) {
      return res.status(400).json({ message: "Subcategory with this name already exists in this category" });
    }

    const finalTaxApplicability = taxApplicability !== undefined ? taxApplicability : category.taxApplicability;
    const finalTax = finalTaxApplicability ? (tax !== undefined ? tax : category.tax) : 0;
    const finalTaxType = finalTaxApplicability ? (taxType !== undefined ? taxType : category.taxType) : null;

    if (finalTaxApplicability && !["percentage", "fixed"].includes(finalTaxType)) {
      return res.status(400).json({ message: "Invalid tax type. Must be 'percentage' or 'fixed'." });
    }

    const newSubCategory = new SubCategory({
      name,
      image,
      description,
      category: categoryId,
      taxApplicability: finalTaxApplicability,
      tax: finalTax,
      taxType: finalTaxType
    });

    await newSubCategory.save();

    res.status(201).json({ message: "Subcategory created successfully", subCategory: newSubCategory });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc Get all subcategories under a category
 * @route GET /categories/:categoryId/subcategories
 */
const getSubCategoriesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const subCategories = await SubCategory.find({ category: categoryId })
      .populate({
        path: 'items',
        select: 'name image description baseAmount discount totalAmount'
      });

    if (subCategories.length === 0) {
      return res.status(404).json({ message: "No subcategories found for this category" });
    }

    res.status(200).json({
      message: "Subcategories fetched successfully",
      data: subCategories
    });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc Update subcategory details
 * @route PUT /subcategories/:id
 */
const updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, image, description, taxApplicability, tax, taxType } = req.body;

    const subCategory = await SubCategory.findById(id);
    if (!subCategory) {
      return res.status(404).json({ message: "Subcategory not found" });
    }

    const taxChanged = (
      subCategory.taxApplicability !== taxApplicability ||
      subCategory.tax !== tax ||
      subCategory.taxType !== taxType
    );

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
    );

    if (taxChanged) {
      await Item.updateMany(
        { subCategory: id, taxApplicability: updatedSubCategory.taxApplicability },
        { tax: updatedSubCategory.tax, taxType: updatedSubCategory.taxType }
      );
    }

    res.status(200).json({ message: "Subcategory updated successfully", subCategory: updatedSubCategory });

  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * @desc Delete a subcategory
 * @route DELETE /subcategories/:id
 */
const deleteSubCategory = async (req, res) => {
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
};

module.exports = { createSubCategory, getSubCategoriesByCategory, updateSubCategory, deleteSubCategory };
