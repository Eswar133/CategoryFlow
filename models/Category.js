const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  image: { type: String, required: true },
  description: { type: String, required: true },
  taxApplicability: { type: Boolean, default: false },
  tax: { type: Number, default: 0 },
  taxType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' }
});

module.exports = mongoose.model('Category', categorySchema);
