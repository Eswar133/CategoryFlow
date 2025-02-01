const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String, required: true },
  description: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
  subCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory' },
  taxApplicability: { type: Boolean, default: false },
  tax: { type: Number, min: 0 },
  taxType: { type: String, enum: ['percentage', 'fixed'] },
  baseAmount: { type: Number, required: true, min: 0 },
  discount: { type: Number, min: 0, default: 0 },
  totalAmount: { type: Number, min: 0 }
});

module.exports = mongoose.model('Item', itemSchema);