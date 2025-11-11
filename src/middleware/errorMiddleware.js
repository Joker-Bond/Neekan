import logger from '../utils/logger.js';

/**
 * Middleware to handle 404 Not Found errors.
 * Creates an Error object with a 404 status code and forwards it to the error handler.
 */
export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

/**
 * Centralized error handling middleware.
 * Sends a JSON response containing the error details and logs the error.
 * In development mode, the stack trace is also included in the response.
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Server Error';

  // Log the error with request details for debugging
  logger.error(`${req.method} ${req.originalUrl} ${statusCode} - ${message}`);

  const response = {
    success: false,
    error: message,
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};
