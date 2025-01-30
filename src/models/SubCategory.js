const mongoose = require('mongoose');

const subCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  taxApplicability: {
    type: Boolean,
    default: function () {
      return this.category ? this.category.taxApplicability : false;
    }
  },
  tax: {
    type: Number,
    default: function () {
      return this.category ? this.category.tax : 0;
    }
  },
  taxType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: function () {
      return this.category ? this.category.taxType : null;
    }
  }
}, { timestamps: true });

const SubCategory = mongoose.model('SubCategory', subCategorySchema);
module.exports = SubCategory;
