const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  image: { type: String, required: true },
  description: String,
  taxApplicability: { type: Boolean, default: false },
  tax: { type: Number, min: 0 },
  taxType: { type: String, enum: ['percentage', 'fixed'] },
  subCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory' }]
});

module.exports = mongoose.model('Category', categorySchema);