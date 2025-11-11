import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import Product from '../models/Product.js';
import logger from '../utils/logger.js';

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
export const createOrder = async (req, res, next) => {
  try {
    const {
      orderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
    } = req.body;

    if (!orderItems || orderItems.length === 0) {
      res.status(400);
      throw new Error('No order items');
    }

    // Create OrderItem documents and adjust product stock
    const createdOrderItems = await Promise.all(
      orderItems.map(async (item) => {
        const product = await Product.findById(item.product);
        if (!product) {
          throw new Error(`Product not found: ${item.product}`);
        }
        if (product.countInStock < item.qty) {
          throw new Error(`Not enough stock for product ${product.name}`);
        }
        // Decrease stock
        product.countInStock -= item.qty;
        await product.save();
        const orderItem = await OrderItem.create({
          name: product.name,
          qty: item.qty,
          image: product.image,
          price: product.price,
          product: product._id,
        });
        return orderItem._id;
      })
    );

    const order = await Order.create({
      orderItems: createdOrderItems,
      user: req.user._id,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      taxPrice,
      shippingPrice,
      totalPrice,
    });

    logger.info(`Order ${order._id} created by user ${req.user._id}`);
    res.status(201).json(order);
  } catch (error) {
    logger.error('Error creating order:', error);
    next(error);
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private (owner or admin)
export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate({
        path: 'orderItems',
        populate: { path: 'product', select: 'name price image' },
      });

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    // Only owner or admin can view
    if (order.user._id.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      res.status(403);
      throw new Error('Not authorized to view this order');
    }

    res.json(order);
  } catch (error) {
    logger.error('Error fetching order:', error);
    next(error);
  }
};

// @desc    Update order status (pay/deliver)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { isPaid, paidAt, isDelivered, deliveredAt } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }

    if (typeof isPaid === 'boolean') {
      order.isPaid = isPaid;
      order.paidAt = paidAt || new Date();
    }
    if (typeof isDelivered === 'boolean') {
      order.isDelivered = isDelivered;
      order.deliveredAt = deliveredAt || new Date();
    }

    const updatedOrder = await order.save();
    logger.info(`Order ${order._id} status updated`);
    res.json(updatedOrder);
  } catch (error) {
    logger.error('Error updating order status:', error);
    next(error);
  }
};

// @desc    Get logged in user's orders
// @route   GET /api/orders/myorders
// @access  Private
export const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('orderItems')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    logger.error('Error fetching user orders:', error);
    next(error);
  }
};

// @desc    Get all orders (admin)
// @route   GET /api/orders
// @access  Private/Admin
export const getAllOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({})
      .populate('user', 'id name')
      .populate('orderItems')
      .sort({ createdAt: -1 });
    const totalAmount = orders.reduce((acc, order) => acc + order.totalPrice, 0);
    res.json({ orders, totalAmount });
  } catch (error) {
    logger.error('Error fetching all orders:', error);
    next(error);
  }
};

// @desc    Delete an order (admin)
// @route   DELETE /api/orders/:id
// @access  Private/Admin
export const deleteOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404);
      throw new Error('Order not found');
    }
    // Restore stock for each order item
    await Promise.all(
      order.orderItems.map(async (itemId) => {
        const item = await OrderItem.findById(itemId);
        if (item) {
          const product = await Product.findById(item.product);
          if (product) {
            product.countInStock += item.qty;
            await product.save();
          }
          await item.remove();
        }
      })
    );
    await order.remove();
    logger.info(`Order ${req.params.id} deleted by admin ${req.user._id}`);
    res.json({ message: 'Order removed' });
  } catch (error) {
    logger.error('Error deleting order:', error);
    next(error);
  }
};