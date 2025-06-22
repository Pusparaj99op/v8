/*
 * Patient Model - Core patient data and profile information
 * Handles patient registration, health profiles, and emergency contacts
 * 
 * Used by both patient dashboard and hospital systems
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const patientSchema = new mongoose.Schema({
  // Basic Information
  patientId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  
  // Personal Details
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  height: Number, // in cm
  weight: Number, // in kg
  
  // Address Information
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: {
      type: String,
      default: 'India'
    }
  },
  
  // Emergency Contacts
  emergencyContacts: [{
    name: String,
    relationship: String,
    phone: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  
  // Medical Information
  medicalHistory: [{
    condition: String,
    diagnosedDate: Date,
    status: {
      type: String,
      enum: ['active', 'resolved', 'chronic']
    },
    notes: String
  }],
  
  medications: [{
    name: String,
    dosage: String,
    frequency: String,
    startDate: Date,
    endDate: Date,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  allergies: [String],
  
  // Device Information
  deviceId: {
    type: String,
    unique: true,
    sparse: true // allows null values to be non-unique
  },
  deviceRegisteredAt: Date,
  
  // Hospital Assignment
  assignedHospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital'
  },
  assignedDoctor: {
    name: String,
    specialization: String,
    phone: String
  },
  
  // Health Thresholds (for emergency detection)
  healthThresholds: {
    heartRate: {
      min: { type: Number, default: 60 },
      max: { type: Number, default: 100 }
    },
    temperature: {
      min: { type: Number, default: 36.0 },
      max: { type: Number, default: 37.5 }
    },
    bloodPressure: {
      systolic: { type: Number, default: 140 },
      diastolic: { type: Number, default: 90 }
    }
  },
  
  // Status and Settings
  isActive: {
    type: Boolean,
    default: true
  },
  emergencyAlertsEnabled: {
    type: Boolean,
    default: true
  },
  dataPrivacyConsent: {
    type: Boolean,
    default: false
  },
  language: {
    type: String,
    enum: ['english', 'hindi'],
    default: 'english'
  },
  
  // Metadata
  lastActiveAt: Date,
  registeredAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    }
  }
});

// Indexes for performance
patientSchema.index({ patientId: 1 });
patientSchema.index({ email: 1 });
patientSchema.index({ phone: 1 });
patientSchema.index({ deviceId: 1 });
patientSchema.index({ assignedHospital: 1 });

// Password hashing middleware
patientSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
patientSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to generate patient ID
patientSchema.statics.generatePatientId = function() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `PAT-${timestamp}-${random}`.toUpperCase();
};

// Virtual for age calculation
patientSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Method to check if patient needs immediate attention
patientSchema.methods.isHighRisk = function() {
  const age = this.age;
  const hasChronicConditions = this.medicalHistory.some(
    condition => condition.status === 'chronic'
  );
  
  return age > 65 || hasChronicConditions || this.allergies.length > 0;
};

module.exports = mongoose.model('Patient', patientSchema);
