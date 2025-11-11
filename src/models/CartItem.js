import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const cartItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    cart: { type: Schema.Types.ObjectId, ref: 'Cart', required: true },
    quantity: { type: Number, default: 1, min: 1 },
    price: { type: Number, required: true },
  },
  { timestamps: true }
);

export default model('CartItem', cartItemSchema);
