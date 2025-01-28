const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const SubCategory = require('../models/SubCategory'); 


// POST /categories/:categoryId/subcategories/:subCategoryId/items
router.post('/categories/:categoryId/subcategories/:subCategoryId/items', async (req, res) => {
  try {
    const { categoryId, subCategoryId } = req.params;
    const { name, image, description, baseAmount, discount, taxApplicability, tax, taxType } = req.body;

    if (baseAmount <= discount) {
      return res.status(400).json({ error: 'Base amount must be greater than discount' });
    }

    // Fetch the subcategory and category to inherit tax details
    const subCategory = await SubCategory.findById(subCategoryId).populate('category');
    if (!subCategory) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }

    // Determine tax applicability and values
    const finalTaxApplicability = taxApplicability ?? subCategory.taxApplicability ?? subCategory.category.taxApplicability;
    const finalTax = finalTaxApplicability ? (tax ?? subCategory.tax ?? subCategory.category.tax) : 0;
    const finalTaxType = taxType ?? subCategory.taxType ?? subCategory.category.taxType;

    // Calculate tax
    const calculatedTax =
      finalTaxApplicability && finalTaxType === 'percentage'
        ? (finalTax / 100) * baseAmount
        : finalTaxApplicability && finalTaxType === 'fixed'
        ? finalTax
        : 0;

    // Calculate total amount
    const totalAmount = baseAmount - discount + calculatedTax;

    // Create the item
    const item = new Item({
      name,
      image,
      description,
      baseAmount,
      discount,
      taxApplicability: finalTaxApplicability,
      tax: finalTax,
      taxType: finalTaxType,
      totalAmount,
      category: categoryId,
      subCategory: subCategoryId,
    });

    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


router.get('/categories/:categoryId/subcategories/:subCategoryId/items', async (req, res) => {
  try {
    const { page = 1 } = req.query;
    const limit = 9;
    const skip = (page - 1) * limit;

    const items = await Item.find({ category: req.params.categoryId, subCategory: req.params.subCategoryId })
      .skip(skip)
      .limit(limit);

    const totalItems = await Item.countDocuments({ category: req.params.categoryId, subCategory: req.params.subCategoryId });
    const totalPages = Math.ceil(totalItems / limit);

    // Ensure items are sent to the template
    res.render('items', { 
      items, 
      categoryId: req.params.categoryId, 
      subCategoryId: req.params.subCategoryId, 
      totalPages, 
      currentPage: Number(page) 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Search items
router.get('/items/search', async (req, res) => {
  try {
    const { name, page = 1 } = req.query;
    const limit = 9;
    const skip = (page - 1) * limit;

    const query = name ? { name: { $regex: name, $options: 'i' } } : {};
    const items = await Item.find(query).skip(skip).limit(limit);
    const totalItems = await Item.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    res.json({ items, totalPages, currentPage: Number(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /items/:id/edit - Render the edit form for an item
router.get('/items/:id/edit', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).send('Item not found');
    }

    // Pass categoryId and subCategoryId along with the item
    res.render('editItems', {
      item,
      categoryId: item.category, // Assuming `category` is stored in the item document
      subCategoryId: item.subCategory // Assuming `subCategory` is stored in the item document
    });
  } catch (err) {
    res.status(500).send('Server error');
  }
});



// PUT /items/:id - Update an item
router.put('/items/:id', async (req, res) => {
  try {
    const { name, image, description, baseAmount, discount, taxApplicability, tax, taxType } = req.body;

    if (baseAmount <= discount) {
      return res.status(400).json({ error: 'Base amount must be greater than discount' });
    }

    // Fetch the existing item to get the subcategory and category
    const item = await Item.findById(req.params.id).populate('subCategory');
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const subCategory = await SubCategory.findById(item.subCategory).populate('category');
    if (!subCategory) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }

    // Determine tax applicability and values
    const finalTaxApplicability = taxApplicability ?? subCategory.taxApplicability ?? subCategory.category.taxApplicability;
    const finalTax = finalTaxApplicability ? (tax ?? subCategory.tax ?? subCategory.category.tax) : 0;
    const finalTaxType = taxType ?? subCategory.taxType ?? subCategory.category.taxType;

    // Calculate tax
    const calculatedTax =
      finalTaxApplicability && finalTaxType === 'percentage'
        ? (finalTax / 100) * baseAmount
        : finalTaxApplicability && finalTaxType === 'fixed'
        ? finalTax
        : 0;

    // Calculate total amount
    const totalAmount = baseAmount - discount + calculatedTax;

    // Update the item
    const updatedItem = await Item.findByIdAndUpdate(
      req.params.id,
      { name, image, description, baseAmount, discount, taxApplicability: finalTaxApplicability, tax: finalTax, taxType: finalTaxType, totalAmount },
      { new: true }
    );

    res.json(updatedItem);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});



module.exports = router;
