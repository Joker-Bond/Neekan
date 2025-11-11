import mongoose from 'mongoose';

const { Schema } = mongoose;

const promotionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage',
    },
    discountValue: { type: Number, required: true, min: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    active: { type: Boolean, default: true },
    usageLimit: { type: Number, default: null, min: 1 },
    usedCount: { type: Number, default: 0, min: 0 },
    products: [{ type: Schema.Types.ObjectId, ref: 'Product' }], // optional: restrict promotion to specific products
  },
  {
    timestamps: true,
  }
);

// Ensure that endDate is after startDate
promotionSchema.pre('validate', function (next) {
  if (this.endDate && this.startDate && this.endDate <= this.startDate) {
    return next(new Error('End date must be greater than start date'));
  }
  next();
});

// Increment usedCount safely
promotionSchema.methods.incrementUsage = async function () {
  if (this.usageLimit !== null && this.usedCount >= this.usageLimit) {
    throw new Error('Promotion usage limit reached');
  }
  this.usedCount += 1;
  await this.save();
};

export default mongoose.model('Promotion', promotionSchema);
