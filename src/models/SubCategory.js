const mongoose = require('mongoose');

const subCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String, required: true },
  description: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  taxApplicability: { type: Boolean, default: false },
  tax: { type: Number, min: 0 },
  taxType: { type: String, enum: ['percentage', 'fixed'] }
});

module.exports = mongoose.model('SubCategory', subCategorySchema);