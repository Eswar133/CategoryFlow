const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String, required: true },
  description: { type: String, required: true },
  baseAmount: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  taxApplicability: { type: Boolean, default: false },
  tax: { type: Number, default: 0 },
  taxType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
  totalAmount: { type: Number, required: true },
  subCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true }
});

module.exports = mongoose.model('Item', itemSchema);
