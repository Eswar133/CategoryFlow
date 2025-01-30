const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
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
  taxApplicability: {
    type: Boolean,
    required: true,
    default: false
  },
  tax: {
    type: Number,
    required: function () {
      return this.taxApplicability;
    },
    default: 0
  },
  taxType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: function () {
      return this.taxApplicability;
    }
  }
}, { timestamps: true });

const Category = mongoose.model('Category', categorySchema);
module.exports = Category;
