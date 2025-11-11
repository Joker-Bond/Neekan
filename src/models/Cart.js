import mongoose from 'mongoose';

const { Schema, model, Types } = mongoose;

// Sub‑document schema for items stored in the cart
const CartItemSchema = new Schema(
  {
    product: { type: Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    // Store the price at the time the item was added to avoid price drift
    price: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

// Main Cart schema – one cart per user
const CartSchema = new Schema(
  {
    user: { type: Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [CartItemSchema],
    // Optional promotion applied to the whole cart
    promotion: { type: Types.ObjectId, ref: 'Promotion' },
    // Cached total (including any discount) for quick reads
    total: { type: Number, required: true, default: 0 }
  },
  { timestamps: true }
);

/**
 * Re‑calculate the cart total based on items and an optional promotion.
 * If a promotion document contains a `discountPercent` field, it is applied.
 */
CartSchema.methods.calculateTotal = async function () {
  const subtotal = this.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  let discount = 0;
  if (this.promotion) {
    // Lazy‑load the promotion to get discount details
    const Promotion = model('Promotion');
    const promo = await Promotion.findById(this.promotion);
    if (promo && promo.discountPercent) {
      discount = (subtotal * promo.discountPercent) / 100;
    }
  }

  this.total = Math.max(subtotal - discount, 0);
  return this.total;
};

/**
 * Add a product to the cart or increase its quantity.
 * @param {String|ObjectId} productId - The product to add.
 * @param {Number} qty - Quantity to add (default 1).
 */
CartSchema.methods.addItem = async function (productId, qty = 1) {
  const Product = model('Product');
  const product = await Product.findById(productId);
  if (!product) {
    throw new Error('Product not found');
  }

  const existing = this.items.find(
    (it) => it.product.toString() === productId.toString()
  );
  if (existing) {
    existing.quantity += qty;
    existing.price = product.price; // keep price snapshot up‑to‑date
  } else {
    this.items.push({
      product: productId,
      quantity: qty,
      price: product.price
    });
  }

  await this.calculateTotal();
  return this.save();
};

/**
 * Remove a product from the cart.
 * @param {String|ObjectId} productId - The product to remove.
 */
CartSchema.methods.removeItem = async function (productId) {
  const idx = this.items.findIndex(
    (it) => it.product.toString() === productId.toString()
  );
  if (idx > -1) {
    this.items.splice(idx, 1);
    await this.calculateTotal();
  }
  return this.save();
};

/**
 * Empty the cart completely, removing items and any promotion.
 */
CartSchema.methods.clear = async function () {
  this.items = [];
  this.promotion = undefined;
  this.total = 0;
  return this.save();
};

export default model('Cart', CartSchema);
