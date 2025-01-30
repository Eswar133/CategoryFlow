/**
 * Calculate tax amount and total amount for an item.
 * @param {Number} baseAmount - Base price of the item.
 * @param {Number} discount - Discount amount.
 * @param {Boolean} taxApplicability - Whether tax applies to this item.
 * @param {Number} tax - Tax value (either percentage or fixed).
 * @param {String} taxType - "percentage" or "fixed".
 * @returns {Object} - { taxAmount, totalAmount }
 */
const calculateTax = (baseAmount, discount, taxApplicability, tax, taxType) => {
    let taxAmount = 0;
  
    if (taxApplicability) {
      if (taxType === "percentage") {
        taxAmount = (tax / 100) * baseAmount;
      } else if (taxType === "fixed") {
        taxAmount = tax;
      }
    }
  
    const totalAmount = baseAmount - discount + taxAmount;
  
    return { taxAmount, totalAmount };
  };
  
  module.exports = { calculateTax };
  