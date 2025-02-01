const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const Item = require('../models/Item');
const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 600 }); // Cache tax lookups for 10 minutes

/**
 * ✅ Get Effective Tax (Dynamic Inheritance)
 */
async function getEffectiveTax(item) {
    if (!item) throw new Error('Invalid item: null or undefined');

    // ✅ Check if tax is already cached
    const cachedTax = cache.get(`tax_${item._id}`);
    if (cachedTax) return cachedTax;

    let totalTax = 0;
    let taxType = 'percentage';

    try {
        // ✅ 1. Check if Item has its own tax
        if (item.taxApplicability && typeof item.tax === 'number' && item.tax >= 0) {
            totalTax += item.tax;
            taxType = item.taxType || 'percentage';
        }

        let category = null;

        // ✅ 2. Check Subcategory tax (if exists)
        if (item.subCategory) {
            const subCategory = await SubCategory.findById(item.subCategory);
            if (subCategory && subCategory.taxApplicability) {
                totalTax += subCategory.tax;
                taxType = subCategory.taxType || taxType;
            }
            category = subCategory.category ? await Category.findById(subCategory.category) : null;
        }

        // ✅ 3. Check Category tax (if no Subcategory tax exists)
        if (!category && item.category) {
            category = await Category.findById(item.category);
        }

        if (category && category.taxApplicability) {
            totalTax += category.tax;
            taxType = category.taxType || taxType;
        }

        const taxData = {
            applicability: totalTax > 0,
            value: totalTax,
            type: taxType,
            source: 'dynamic inheritance'
        };

        // ✅ Cache the result for 10 minutes
        cache.set(`tax_${item._id}`, taxData);
        return taxData;
    } catch (error) {
        console.error('Error calculating tax:', error);
        return { applicability: false, value: 0, type: 'percentage', source: 'error' };
    }
}

/**
 * ✅ Update Item Total Amount
 */
async function updateItemTotal(item) {
    try {
        if (!item) throw new Error('Invalid item provided');
        if (typeof item.baseAmount !== 'number' || item.baseAmount < 0) throw new Error('Invalid base amount');
        if (typeof item.discount !== 'number' || item.discount < 0) throw new Error('Invalid discount');

        // ✅ Ensure item is a valid Mongoose document
        if (!(item instanceof Item)) {
            item = await Item.findById(item._id);
            if (!item) throw new Error('Item not found in database');
        }

        const tax = await getEffectiveTax(item);
        let taxAmount = 0;

        if (tax.applicability) {
            taxAmount = tax.type === 'percentage'
                ? (item.baseAmount * tax.value) / 100
                : tax.value;
        }

        // ✅ Final Total Calculation
        item.totalAmount = parseFloat(
            Math.max(0, item.baseAmount - (item.discount || 0) + taxAmount).toFixed(2)
        );

        await item.save();
    } catch (error) {
        console.error('Error updating item:', error);
        throw error;
    }
}

/**
 * ✅ Update All Items when Tax Changes
 */
async function updateAllItems(parentId, isCategory = true) {
    try {
        if (!parentId) throw new Error('Invalid parentId');

        let items = [];

        if (isCategory) {
            const subCategories = await SubCategory.find({ category: parentId });
            const subCategoryIds = subCategories.map(sc => sc._id);

            items = await Item.find({
                $or: [
                    { category: parentId },
                    { subCategory: { $in: subCategoryIds } }
                ]
            });
        } else {
            items = await Item.find({ subCategory: parentId });
        }

        // ✅ Process items in batches to avoid performance issues
        const BATCH_SIZE = 50;
        for (let i = 0; i < items.length; i += BATCH_SIZE) {
            const batch = items.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(async (item) => await updateItemTotal(item)));
        }
    } catch (error) {
        console.error('Error in bulk update:', error);
        throw error;
    }
}

/**
 * ✅ Handle Tax Updates for Subcategories and Categories
 */
async function handleTaxUpdate(parentId, isCategory) {
    try {
        console.log(`🔄 Updating tax for ${isCategory ? 'category' : 'subcategory'}: ${parentId}`);
        await updateAllItems(parentId, isCategory);
    } catch (error) {
        console.error('❌ Error handling tax update:', error);
        throw error;
    }
}

// ✅ Export the functions properly
module.exports = {
    getEffectiveTax,
    updateItemTotal,
    updateAllItems,
    handleTaxUpdate // ✅ Make sure `handleTaxUpdate` is exported
};
