/*
 * Error Handler Middleware - Centralized error handling for the application
 * Handles different types of errors and provides consistent error responses
 * 
 * Catches all errors and formats them properly for API responses
 */

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  
  // Log error details for debugging
  console.error('Error Details:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = {
      success: false,
      message: message,
      statusCode: 404
    };
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' already exists`;
    error = {
      success: false,
      message: message,
      statusCode: 400
    };
  }
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    error = {
      success: false,
      message: 'Validation Error',
      details: messages,
      statusCode: 400
    };
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      success: false,
      message: 'Invalid token',
      statusCode: 401
    };
  }
  
  if (err.name === 'TokenExpiredError') {
    error = {
      success: false,
      message: 'Token expired',
      statusCode: 401
    };
  }
  
  // Custom application errors
  if (err.isOperational) {
    error = {
      success: false,
      message: err.message,
      statusCode: err.statusCode || 500
    };
  }
  
  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = {
      success: false,
      message: 'File size too large',
      statusCode: 400
    };
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = {
      success: false,
      message: 'Unexpected file field',
      statusCode: 400
    };
  }
  
  // Database connection errors
  if (err.name === 'MongoNetworkError') {
    error = {
      success: false,
      message: 'Database connection error',
      statusCode: 503
    };
  }
  
  if (err.name === 'MongoTimeoutError') {
    error = {
      success: false,
      message: 'Database operation timeout',
      statusCode: 503
    };
  }
  
  // Default error response
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';
  
  const response = {
    success: false,
    message: message
  };
  
  // Add additional details in development mode
  if (process.env.NODE_ENV === 'development') {
    response.error = {
      name: err.name,
      stack: err.stack,
      details: error.details
    };
  }
  
  // Add error details if available
  if (error.details) {
    response.details = error.details;
  }
  
  res.status(statusCode).json(response);
};

// Custom error class for operational errors
class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Async error wrapper to catch async errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Not found handler for undefined routes
const notFound = (req, res, next) => {
  const error = new AppError(`Not found - ${req.originalUrl}`, 404);
  next(error);
};

// Validation error helper
const validationError = (message, details = []) => {
  const error = new AppError(message, 400);
  error.details = details;
  return error;
};

// Authentication error helper
const authError = (message = 'Authentication failed') => {
  return new AppError(message, 401);
};

// Authorization error helper
const authorizationError = (message = 'Not authorized to access this resource') => {
  return new AppError(message, 403);
};

// Resource not found error helper
const notFoundError = (resource = 'Resource') => {
  return new AppError(`${resource} not found`, 404);
};

// Emergency system error helper
const emergencyError = (message = 'Emergency system error') => {
  const error = new AppError(message, 500);
  error.isEmergency = true;
  return error;
};

module.exports = {
  errorHandler,
  AppError,
  asyncHandler,
  notFound,
  validationError,
  authError,
  authorizationError,
  notFoundError,
  emergencyError
};
