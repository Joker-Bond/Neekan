import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const orderItemSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    price: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative'],
    },
    total: {
      type: Number,
      required: true,
      min: [0, 'Total cannot be negative'],
    },
  },
  { timestamps: true }
);

// Ensure total reflects quantity * price before saving
orderItemSchema.pre('validate', function (next) {
  if (this.isModified('quantity') || this.isModified('price')) {
    this.total = this.quantity * this.price;
  }
  next();
});

export default model('OrderItem', orderItemSchema);
