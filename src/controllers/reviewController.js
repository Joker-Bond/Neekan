import Review from '../models/Review.js';
import Product from '../models/Product.js';

/**
 * @desc    Get all reviews or reviews for a specific product
 * @route   GET /api/reviews
 * @route   GET /api/products/:productId/reviews
 */
export const getReviews = async (req, res, next) => {
  try {
    const { productId } = req.params;
    let reviews;
    if (productId) {
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
      reviews = await Review.find({ product: productId }).populate('user', 'name email');
    } else {
      reviews = await Review.find().populate('product', 'name').populate('user', 'name email');
    }
    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new review for a product
 * @route   POST /api/products/:productId/reviews
 */
export const createReview = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;

    if (!rating) {
      return res.status(400).json({ success: false, message: 'Rating is required' });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Prevent duplicate reviews by same user
    const existing = await Review.findOne({ product: productId, user: userId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this product' });
    }

    const review = await Review.create({
      product: productId,
      user: userId,
      rating,
      comment,
    });

    // Recalculate product rating & numReviews
    await recalculateProductStats(productId);

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a review
 * @route   PUT /api/reviews/:id
 */
export const updateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (review.user.toString() !== userId.toString() && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this review' });
    }

    if (rating !== undefined) review.rating = rating;
    if (comment !== undefined) review.comment = comment;
    await review.save();

    await recalculateProductStats(review.product);

    res.status(200).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a review
 * @route   DELETE /api/reviews/:id
 */
export const deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (review.user.toString() !== userId.toString() && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this review' });
    }

    await review.remove();
    await recalculateProductStats(review.product);

    res.status(200).json({ success: true, message: 'Review removed' });
  } catch (error) {
    next(error);
  }
};

/**
 * Recalculates and updates the product's average rating and number of reviews.
 * @param {String} productId
 */
const recalculateProductStats = async (productId) => {
  const stats = await Review.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: '$product',
        numReviews: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      numReviews: stats[0].numReviews,
      rating: stats[0].avgRating,
    });
  } else {
    // No reviews left
    await Product.findByIdAndUpdate(productId, {
      numReviews: 0,
      rating: 0,
    });
  }
};
