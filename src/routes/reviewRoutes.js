import express from 'express';
import Review from '../models/Review.js';
import Product from '../models/Product.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Get all reviews for a product
// @route   GET /api/products/:productId/reviews
// @access  Public
router.get('/products/:productId/reviews', async (req, res, next) => {
  try {
    const { productId } = req.params;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    const reviews = await Review.find({ product: productId }).populate('user', 'name');
    res.json(reviews);
  } catch (error) {
    next(error);
  }
});

// @desc    Create a new review for a product
// @route   POST /api/products/:productId/reviews
// @access  Private
router.post('/products/:productId/reviews', protect, async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    // Prevent duplicate reviews by the same user
    const alreadyReviewed = await Review.findOne({ product: productId, user: req.user._id });
    if (alreadyReviewed) {
      return res.status(400).json({ message: 'Product already reviewed' });
    }
    const review = new Review({
      user: req.user._id,
      product: productId,
      rating: Number(rating),
      comment,
    });
    await review.save();
    // Update product stats
    const reviews = await Review.find({ product: productId });
    product.numReviews = reviews.length;
    product.rating = reviews.reduce((acc, item) => acc + item.rating, 0) / reviews.length;
    await product.save();
    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
});

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private (owner or admin)
router.put('/reviews/:id', protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    if (review.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to update this review' });
    }
    if (rating !== undefined) review.rating = Number(rating);
    if (comment !== undefined) review.comment = comment;
    await review.save();
    // Recalculate product rating
    const product = await Product.findById(review.product);
    if (product) {
      const reviews = await Review.find({ product: product._id });
      product.numReviews = reviews.length;
      product.rating = reviews.reduce((acc, item) => acc + item.rating, 0) / reviews.length;
      await product.save();
    }
    res.json(review);
  } catch (error) {
    next(error);
  }
});

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private (owner or admin)
router.delete('/reviews/:id', protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    if (review.user.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }
    await review.remove();
    // Recalculate product rating
    const product = await Product.findById(review.product);
    if (product) {
      const reviews = await Review.find({ product: product._id });
      product.numReviews = reviews.length;
      product.rating = reviews.length
        ? reviews.reduce((acc, item) => acc + item.rating, 0) / reviews.length
        : 0;
      await product.save();
    }
    res.json({ message: 'Review removed' });
  } catch (error) {
    next(error);
  }
});

export default router;
