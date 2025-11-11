import express from 'express';
import Product from '../models/Product.js';
import ApiFeatures from '../utils/apiFeatures.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// @desc    Get all products
// @route   GET /api/products
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    const features = new ApiFeatures(Product.find(), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const products = await features.query;
    res.json({ status: 'success', results: products.length, data: { products } });
  } catch (err) {
    next(err);
  }
});

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
router.get('/:id', async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }
    res.json({ status: 'success', data: { product } });
  } catch (err) {
    next(err);
  }
});

// @desc    Create a new product
// @route   POST /api/products
// @access  Private/Admin
router.post('/', protect, admin, async (req, res, next) => {
  try {
    const newProduct = await Product.create(req.body);
    res.status(201).json({ status: 'success', data: { product: newProduct } });
  } catch (err) {
    next(err);
  }
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
router.put('/:id', protect, admin, async (req, res, next) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedProduct) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }
    res.json({ status: 'success', data: { product: updatedProduct } });
  } catch (err) {
    next(err);
  }
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
router.delete('/:id', protect, admin, async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }
    res.status(204).json({ status: 'success', data: null });
  } catch (err) {
    next(err);
  }
});

export default router;
