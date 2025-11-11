import Product from '../models/Product.js';

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// @desc    Get all products with filtering, sorting, and pagination
// @route   GET /api/products
// @access  Public
export const getProducts = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Keyword search on name or description
  const keyword = req.query.keyword
    ? { $or: [{ name: { $regex: req.query.keyword, $options: 'i' } }, { description: { $regex: req.query.keyword, $options: 'i' } }] }
    : {};

  // Advanced filters (price, rating)
  const filter = {};
  if (req.query['price[gte]'] || req.query['price[lte]']) {
    filter.price = {};
    if (req.query['price[gte]']) filter.price.$gte = Number(req.query['price[gte]']);
    if (req.query['price[lte]']) filter.price.$lte = Number(req.query['price[lte]']);
  }
  if (req.query['rating[gte]']) {
    filter.rating = { $gte: Number(req.query['rating[gte]']) };
  }

  const queryObj = { ...keyword, ...filter };

  // Sorting
  const sortBy = req.query.sort ? req.query.sort.split(',').join(' ') : '-createdAt';

  const [total, products] = await Promise.all([
    Product.countDocuments(queryObj),
    Product.find(queryObj)
      .sort(sortBy)
      .skip(skip)
      .limit(limit)
  ]);

  res.json({
    success: true,
    count: products.length,
    total,
    page,
    pages: Math.ceil(total / limit),
    data: products
  });
});

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
export const getProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    return next(err);
  }
  res.json({ success: true, data: product });
});

// @desc    Create a new product
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.create(req.body);
  res.status(201).json({ success: true, data: product });
});

// @desc    Update an existing product
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    return next(err);
  }
  res.json({ success: true, data: product });
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    const err = new Error('Product not found');
    err.statusCode = 404;
    return next(err);
  }
  res.json({ success: true, message: 'Product removed' });
});
