/*
 * Authentication Middleware - JWT token validation and user authentication
 * Handles patient and hospital authentication for secure API access
 * 
 * Used across all protected routes in the application
 */

const jwt = require('jsonwebtoken');
const Patient = require('../models/Patient');
const Hospital = require('../models/Hospital');

// Verify JWT token and authenticate user
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No valid token provided.'
      });
    }
    
    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Token is required.'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find user based on type
    let user = null;
    if (decoded.userType === 'patient') {
      user = await Patient.findById(decoded.id).select('-password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Patient not found.'
        });
      }
    } else if (decoded.userType === 'hospital') {
      user = await Hospital.findById(decoded.id).select('-password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Hospital not found.'
        });
      }
    } else {
      return res.status(401).json({
        success: false,
        message: 'Invalid user type in token.'
      });
    }
    
    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }
    
    // Add user info to request
    req.user = {
      id: user._id,
      userType: decoded.userType,
      patientId: user.patientId || null,
      hospitalId: user.hospitalId || null,
      email: user.email,
      name: user.name,
      isActive: user.isActive
    };
    
    next();
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token has expired. Please login again.'
      });
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication.'
    });
  }
};

// Middleware to check if user is a patient
const requirePatient = (req, res, next) => {
  if (req.user && req.user.userType === 'patient') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Patient account required.'
    });
  }
};

// Middleware to check if user is a hospital
const requireHospital = (req, res, next) => {
  if (req.user && req.user.userType === 'hospital') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Hospital account required.'
    });
  }
};

// Middleware to check if user can access specific patient data
const canAccessPatient = (req, res, next) => {
  const requestedPatientId = req.params.patientId || req.body.patientId;
  
  // Patients can only access their own data
  if (req.user.userType === 'patient') {
    if (req.user.patientId !== requestedPatientId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own data.'
      });
    }
  }
  
  // Hospitals can access data of their assigned patients
  // This would need additional logic to check patient-hospital assignment
  
  next();
};

// Optional authentication - doesn't fail if no token provided
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }
    
    const token = authHeader.substring(7);
    
    if (!token) {
      req.user = null;
      return next();
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    let user = null;
    if (decoded.userType === 'patient') {
      user = await Patient.findById(decoded.id).select('-password');
    } else if (decoded.userType === 'hospital') {
      user = await Hospital.findById(decoded.id).select('-password');
    }
    
    if (user && user.isActive) {
      req.user = {
        id: user._id,
        userType: decoded.userType,
        patientId: user.patientId || null,
        hospitalId: user.hospitalId || null,
        email: user.email,
        name: user.name,
        isActive: user.isActive
      };
    } else {
      req.user = null;
    }
    
    next();
    
  } catch (error) {
    req.user = null;
    next();
  }
};

// Generate JWT token
const generateToken = (userId, userType, additionalData = {}) => {
  const payload = {
    id: userId,
    userType: userType,
    ...additionalData
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '24h'
  });
};

// Verify refresh token (if implementing refresh token system)
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  authMiddleware,
  requirePatient,
  requireHospital,
  canAccessPatient,
  optionalAuth,
  generateToken,
  verifyRefreshToken
};
