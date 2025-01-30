const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
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
    ref: 'Category'
  },
  subCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory'
  },
  baseAmount: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  taxApplicability: {
    type: Boolean,
    default: function () {
      return this.subCategory ? this.subCategory.taxApplicability : this.category ? this.category.taxApplicability : false;
    }
  },
  tax: {
    type: Number,
    default: function () {
      return this.subCategory ? this.subCategory.tax : this.category ? this.category.tax : 0;
    }
  },
  taxType: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: function () {
      return this.subCategory ? this.subCategory.taxType : this.category ? this.category.taxType : null;
    }
  },
  totalAmount: {
    type: Number
  }
}, { timestamps: true });

itemSchema.pre('save', function (next) {
  let taxAmount = 0;
  
  if (this.taxApplicability) {
    if (this.taxType === 'percentage') {
      taxAmount = (this.tax / 100) * this.baseAmount;
    } else if (this.taxType === 'fixed') {
      taxAmount = this.tax;
    }
  }
  
  this.totalAmount = this.baseAmount - this.discount + taxAmount;
  next();
});

const Item = mongoose.model('Item', itemSchema);
module.exports = Item;
