/*
 * Hospital Model - Hospital system data and staff management
 * Handles hospital registration, departments, and emergency response coordination
 * 
 * Used by hospital dashboard and emergency response system
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const hospitalSchema = new mongoose.Schema({
  // Basic Information
  hospitalId: {
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
    required: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  
  // Hospital Details
  type: {
    type: String,
    enum: ['government', 'private', 'clinic', 'specialty'],
    required: true
  },
  registrationNumber: {
    type: String,
    required: true,
    unique: true
  },
  establishedYear: Number,
  
  // Address Information
  address: {
    street: String,
    area: String,
    city: String,
    state: String,
    pincode: String,
    country: {
      type: String,
      default: 'India'
    }
  },
  
  // Location for emergency response
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      index: '2dsphere'
    }
  },
  
  // Capacity and Resources
  capacity: {
    totalBeds: Number,
    icuBeds: Number,
    emergencyBeds: Number,
    availableBeds: Number,
    ambulances: Number
  },
  
  // Departments and Specializations
  departments: [{
    name: String,
    head: String,
    phone: String,
    isEmergencyCapable: {
      type: Boolean,
      default: false
    }
  }],
  
  specializations: [{
    type: String,
    enum: [
      'cardiology', 'neurology', 'orthopedics', 'pediatrics',
      'gynecology', 'emergency', 'icu', 'surgery', 'radiology',
      'pathology', 'pharmacy', 'physiotherapy'
    ]
  }],
  
  // Staff Information
  staff: [{
    staffId: String,
    name: String,
    role: {
      type: String,
      enum: ['doctor', 'nurse', 'technician', 'admin', 'emergency_responder']
    },
    specialization: String,
    phone: String,
    email: String,
    isOnDuty: {
      type: Boolean,
      default: false
    },
    shiftTiming: {
      start: String, // "09:00"
      end: String    // "17:00"
    }
  }],
  
  // Emergency Response Configuration
  emergencyResponse: {
    isEnabled: {
      type: Boolean,
      default: true
    },
    responseRadius: {
      type: Number,
      default: 10 // kilometers
    },
    emergencyContacts: [{
      name: String,
      role: String,
      phone: String,
      isPrimary: Boolean
    }],
    averageResponseTime: Number // in minutes
  },
  
  // Equipment and Facilities
  equipment: [{
    name: String,
    category: String,
    isAvailable: Boolean,
    quantity: Number,
    lastMaintenance: Date
  }],
  
  facilities: [{
    type: String,
    enum: [
      'emergency_room', 'icu', 'operation_theater', 'blood_bank',
      'pharmacy', 'radiology', 'laboratory', 'ambulance_service',
      'trauma_center', 'dialysis', 'burn_unit', 'cardiac_care'
    ],
    isActive: Boolean
  }],
  
  // Status and Settings
  isActive: {
    type: Boolean,
    default: true
  },
  operatingHours: {
    isOpen24x7: {
      type: Boolean,
      default: false
    },
    weekdays: {
      open: String,  // "08:00"
      close: String  // "20:00"
    },
    weekends: {
      open: String,
      close: String
    }
  },
  
  // Statistics and Performance
  statistics: {
    totalPatients: {
      type: Number,
      default: 0
    },
    emergenciesHandled: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    responseSuccessRate: {
      type: Number,
      default: 0 // percentage
    }
  },
  
  // Metadata
  registeredAt: {
    type: Date,
    default: Date.now
  },
  lastActiveAt: Date,
  verifiedAt: Date,
  isVerified: {
    type: Boolean,
    default: false
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

// Indexes for performance and geospatial queries
hospitalSchema.index({ hospitalId: 1 });
hospitalSchema.index({ email: 1 });
hospitalSchema.index({ location: '2dsphere' });
hospitalSchema.index({ 'specializations': 1 });
hospitalSchema.index({ 'emergencyResponse.isEnabled': 1 });

// Password hashing middleware
hospitalSchema.pre('save', async function(next) {
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
hospitalSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to generate hospital ID
hospitalSchema.statics.generateHospitalId = function() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `HOS-${timestamp}-${random}`.toUpperCase();
};

// Method to check if hospital can handle emergency
hospitalSchema.methods.canHandleEmergency = function() {
  return this.isActive && 
         this.emergencyResponse.isEnabled && 
         this.capacity.availableBeds > 0 &&
         this.specializations.includes('emergency');
};

// Method to calculate distance from coordinates
hospitalSchema.methods.calculateDistance = function(lat, lng) {
  if (!this.location.coordinates || this.location.coordinates.length !== 2) {
    return null;
  }
  
  const [hospitalLng, hospitalLat] = this.location.coordinates;
  const R = 6371; // Earth's radius in kilometers
  
  const dLat = (lat - hospitalLat) * Math.PI / 180;
  const dLng = (lng - hospitalLng) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(hospitalLat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
};

// Method to get available emergency staff
hospitalSchema.methods.getEmergencyStaff = function() {
  return this.staff.filter(member => 
    member.isOnDuty && 
    (member.role === 'doctor' || member.role === 'emergency_responder')
  );
};

// Static method to find nearest hospitals
hospitalSchema.statics.findNearest = function(lat, lng, maxDistance = 50) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [lng, lat]
        },
        $maxDistance: maxDistance * 1000 // Convert km to meters
      }
    },
    isActive: true,
    'emergencyResponse.isEnabled': true
  });
};

module.exports = mongoose.model('Hospital', hospitalSchema);
