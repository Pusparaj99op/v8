/*
 * Authentication Routes - Login, registration, and user management
 * Handles patient and hospital authentication with JWT tokens
 * 
 * Provides secure access to the Rescue.net AI platform
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const Patient = require('../models/Patient');
const Hospital = require('../models/Hospital');
const { generateToken } = require('../middleware/auth');
const { asyncHandler, AppError, validationError } = require('../middleware/errorHandler');

const router = express.Router();

// Demo credentials for Central India Hackathon 2.0
const DEMO_PATIENT = {
  _id: 'demo_patient_id',
  patientId: 'DEMO-PAT-001',
  name: 'Demo Patient',
  email: '9876543210',
  phone: '9876543210',
  deviceId: 'demo-device-001',
  userType: 'patient',
  isActive: true,
  comparePassword: async (password) => password === 'patient123'
};

const DEMO_HOSPITAL = {
  _id: 'demo_hospital_id',
  hospitalId: 'HOSP-DEMO-001',
  name: 'Demo General Hospital',
  email: 'demo@hospital.com',
  phone: '+91-755-1234567',
  userType: 'hospital',
  isActive: true,
  comparePassword: async (password) => password === 'hospital123'
};

// Patient Registration
router.post('/patient/register', asyncHandler(async (req, res) => {
  const {
    name, email, phone, password, dateOfBirth, gender, bloodGroup,
    height, weight, address, emergencyContacts, medicalHistory,
    medications, allergies
  } = req.body;
  
  // Validation
  if (!name || !email || !phone || !password || !dateOfBirth || !gender || !bloodGroup) {
    throw validationError('All required fields must be provided');
  }
  
  if (!validator.isEmail(email)) {
    throw validationError('Invalid email format');
  }
  
  if (password.length < 6) {
    throw validationError('Password must be at least 6 characters long');
  }
  
  // Check if patient already exists
  const existingPatient = await Patient.findOne({
    $or: [{ email }, { phone }]
  });
  
  if (existingPatient) {
    throw new AppError('Patient with this email or phone already exists', 400);
  }
  
  // Generate unique patient ID
  let patientId;
  let isUnique = false;
  
  while (!isUnique) {
    patientId = Patient.generatePatientId();
    const existing = await Patient.findOne({ patientId });
    if (!existing) isUnique = true;
  }
  
  // Create new patient
  const patient = new Patient({
    patientId,
    name: name.trim(),
    email: email.toLowerCase(),
    phone,
    password,
    dateOfBirth: new Date(dateOfBirth),
    gender,
    bloodGroup,
    height,
    weight,
    address,
    emergencyContacts: emergencyContacts || [],
    medicalHistory: medicalHistory || [],
    medications: medications || [],
    allergies: allergies || []
  });
  
  await patient.save();
  
  // Generate JWT token
  const token = generateToken(patient._id, 'patient', { patientId: patient.patientId });
  
  res.status(201).json({
    success: true,
    message: 'Patient registered successfully',
    data: {
      patient: {
        id: patient._id,
        patientId: patient.patientId,
        name: patient.name,
        email: patient.email,
        phone: patient.phone
      },
      token
    }
  });
}));

// Hospital Registration
router.post('/hospital/register', asyncHandler(async (req, res) => {
  const {
    name, email, phone, password, type, registrationNumber,
    address, location, capacity, departments, specializations,
    emergencyResponse
  } = req.body;
  
  // Validation
  if (!name || !email || !phone || !password || !type || !registrationNumber) {
    throw validationError('All required fields must be provided');
  }
  
  if (!validator.isEmail(email)) {
    throw validationError('Invalid email format');
  }
  
  if (password.length < 6) {
    throw validationError('Password must be at least 6 characters long');
  }
  
  // Check if hospital already exists
  const existingHospital = await Hospital.findOne({
    $or: [{ email }, { registrationNumber }]
  });
  
  if (existingHospital) {
    throw new AppError('Hospital with this email or registration number already exists', 400);
  }
  
  // Generate unique hospital ID
  let hospitalId;
  let isUnique = false;
  
  while (!isUnique) {
    hospitalId = Hospital.generateHospitalId();
    const existing = await Hospital.findOne({ hospitalId });
    if (!existing) isUnique = true;
  }
  
  // Create new hospital
  const hospital = new Hospital({
    hospitalId,
    name: name.trim(),
    email: email.toLowerCase(),
    phone,
    password,
    type,
    registrationNumber,
    address,
    location,
    capacity,
    departments: departments || [],
    specializations: specializations || [],
    emergencyResponse: emergencyResponse || { isEnabled: true }
  });
  
  await hospital.save();
  
  // Generate JWT token
  const token = generateToken(hospital._id, 'hospital', { hospitalId: hospital.hospitalId });
  
  res.status(201).json({
    success: true,
    message: 'Hospital registered successfully',
    data: {
      hospital: {
        id: hospital._id,
        hospitalId: hospital.hospitalId,
        name: hospital.name,
        email: hospital.email,
        phone: hospital.phone,
        type: hospital.type
      },
      token
    }
  });
}));

// Patient Login
router.post('/patient/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    throw validationError('Email and password are required');
  }
  
  // Check for demo credentials first
  if (email === '9876543210' && password === 'patient123') {
    const token = generateToken(DEMO_PATIENT._id, 'patient', { patientId: DEMO_PATIENT.patientId });
    
    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: DEMO_PATIENT._id,
          patientId: DEMO_PATIENT.patientId,
          name: DEMO_PATIENT.name,
          email: DEMO_PATIENT.email,
          phone: DEMO_PATIENT.phone,
          deviceId: DEMO_PATIENT.deviceId,
          userType: 'patient'
        }
      }
    });
  }
  
  // Find patient in database
  const patient = await Patient.findOne({ 
    email: email.toLowerCase(),
    isActive: true 
  });
  
  if (!patient) {
    throw new AppError('Invalid email or password', 401);
  }
  
  // Check password
  const isPasswordValid = await patient.comparePassword(password);
  
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }
  
  // Update last active
  patient.lastActiveAt = new Date();
  await patient.save();
  
  // Generate JWT token
  const token = generateToken(patient._id, 'patient', { patientId: patient.patientId });
  
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      user: {
        id: patient._id,
        patientId: patient.patientId,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        deviceId: patient.deviceId,
        assignedHospital: patient.assignedHospital,
        userType: 'patient'
      }
    }
  });
}));

// Hospital Login
router.post('/hospital/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    throw validationError('Email and password are required');
  }
  
  // Check for demo credentials first
  if (email === 'demo@hospital.com' && password === 'hospital123') {
    const token = generateToken(DEMO_HOSPITAL._id, 'hospital', { hospitalId: DEMO_HOSPITAL.hospitalId });
    
    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: DEMO_HOSPITAL._id,
          hospitalId: DEMO_HOSPITAL.hospitalId,
          name: DEMO_HOSPITAL.name,
          email: DEMO_HOSPITAL.email,
          phone: DEMO_HOSPITAL.phone,
          userType: 'hospital'
        }
      }
    });
  }
  
  // Find hospital in database
  const hospital = await Hospital.findOne({ 
    email: email.toLowerCase(),
    isActive: true 
  });
  
  if (!hospital) {
    throw new AppError('Invalid email or password', 401);
  }
  
  // Check password
  const isPasswordValid = await hospital.comparePassword(password);
  
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401);
  }
  
  // Update last active
  hospital.lastActiveAt = new Date();
  await hospital.save();
  
  // Generate JWT token
  const token = generateToken(hospital._id, 'hospital', { hospitalId: hospital.hospitalId });
  
  res.json({
    success: true,
    message: 'Login successful',
    data: {
      token,
      user: {
        id: hospital._id,
        hospitalId: hospital.hospitalId,
        name: hospital.name,
        email: hospital.email,
        phone: hospital.phone,
        type: hospital.type,
        specializations: hospital.specializations,
        emergencyResponse: hospital.emergencyResponse,
        userType: 'hospital'
      }
    }
  });
}));

// Refresh Token (Optional - for extending session)
router.post('/refresh-token', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    throw validationError('Refresh token is required');
  }
  
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    // Find user and generate new token
    let user = null;
    if (decoded.userType === 'patient') {
      user = await Patient.findById(decoded.id);
    } else if (decoded.userType === 'hospital') {
      user = await Hospital.findById(decoded.id);
    }
    
    if (!user || !user.isActive) {
      throw new AppError('Invalid refresh token', 401);
    }
    
    const newToken = generateToken(user._id, decoded.userType, {
      [decoded.userType + 'Id']: user[decoded.userType + 'Id']
    });
    
    res.json({
      success: true,
      data: { token: newToken }
    });
    
  } catch (error) {
    throw new AppError('Invalid refresh token', 401);
  }
}));

// Password Reset Request
router.post('/password-reset-request', asyncHandler(async (req, res) => {
  const { email, userType } = req.body;
  
  if (!email || !userType) {
    throw validationError('Email and user type are required');
  }
  
  let user = null;
  if (userType === 'patient') {
    user = await Patient.findOne({ email: email.toLowerCase() });
  } else if (userType === 'hospital') {
    user = await Hospital.findOne({ email: email.toLowerCase() });
  }
  
  // Don't reveal if user exists or not for security
  res.json({
    success: true,
    message: 'If an account with this email exists, you will receive password reset instructions'
  });
  
  // TODO: Implement actual password reset email sending
  // This would typically involve:
  // 1. Generate a secure reset token
  // 2. Store it with expiration time
  // 3. Send email with reset link
}));

// Change Password (Authenticated)
router.post('/change-password', asyncHandler(async (req, res) => {
  const authHeader = req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('Authentication required', 401);
  }
  
  const token = authHeader.substring(7);
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    throw validationError('Current password and new password are required');
  }
  
  if (newPassword.length < 6) {
    throw validationError('New password must be at least 6 characters long');
  }
  
  // Find user
  let user = null;
  if (decoded.userType === 'patient') {
    user = await Patient.findById(decoded.id);
  } else if (decoded.userType === 'hospital') {
    user = await Hospital.findById(decoded.id);
  }
  
  if (!user) {
    throw new AppError('User not found', 404);
  }
  
  // Verify current password
  const isCurrentPasswordValid = await user.comparePassword(currentPassword);
  
  if (!isCurrentPasswordValid) {
    throw new AppError('Current password is incorrect', 400);
  }
  
  // Update password
  user.password = newPassword;
  await user.save();
  
  res.json({
    success: true,
    message: 'Password changed successfully'
  });
}));

// Logout (Optional - mainly for clearing client-side tokens)
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;
