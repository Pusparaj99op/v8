/*
 * Emergency Model - Emergency incident tracking and response coordination
 * Handles emergency alerts, response tracking, and incident management
 * 
 * Central component for emergency response coordination
 */

const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
  // Emergency Identification
  emergencyId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Patient Information
  patientId: {
    type: String,
    required: true,
    index: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  
  // Emergency Classification
  type: {
    type: String,
    enum: [
      'fall_detected',
      'heart_rate_anomaly', 
      'temperature_anomaly',
      'blood_pressure_anomaly',
      'inactivity_alert',
      'panic_button',
      'device_malfunction',
      'manual_trigger',
      'ai_prediction'
    ],
    required: true
  },
  
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
    index: true
  },
  
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'responding', 'resolved', 'false_alarm'],
    default: 'active',
    index: true
  },
  
  // Emergency Details
  description: {
    type: String,
    required: true
  },
  
  detectedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Health Data Reference
  healthDataId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HealthData'
  },
  
  triggerData: {
    heartRate: Number,
    temperature: Number,
    bloodPressure: {
      systolic: Number,
      diastolic: Number
    },
    accelerometer: {
      x: Number,
      y: Number,
      z: Number,
      magnitude: Number
    },
    fallConfidence: Number,
    riskScore: Number
  },
  
  // Location Information
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: [Number], // [longitude, latitude]
    address: String,
    accuracy: Number,
    detectedAt: Date
  },
  
  // Hospital Assignment
  assignedHospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital'
  },
  
  nearbyHospitals: [{
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital'
    },
    distance: Number, // in kilometers
    responseCapability: Boolean,
    estimatedArrivalTime: Number // in minutes
  }],
  
  // Response Tracking
  response: {
    acknowledgedAt: Date,
    acknowledgedBy: {
      name: String,
      role: String,
      hospitalId: String,
      phone: String
    },
    
    responseStartedAt: Date,
    estimatedArrivalTime: Number,
    actualArrivalTime: Date,
    
    responders: [{
      name: String,
      role: String,
      phone: String,
      vehicleType: String, // ambulance, helicopter, etc.
      dispatchedAt: Date,
      arrivedAt: Date
    }],
    
    responseNotes: String
  },
  
  // Communication Log
  notifications: [{
    type: {
      type: String,
      enum: ['sms', 'telegram', 'email', 'call', 'app_notification']
    },
    recipient: {
      name: String,
      phone: String,
      email: String,
      relationship: String
    },
    message: String,
    sentAt: Date,
    delivered: Boolean,
    deliveredAt: Date,
    failureReason: String
  }],
  
  // Emergency Contacts Reached
  contactsNotified: [{
    contactId: String,
    name: String,
    relationship: String,
    phone: String,
    notificationMethod: String,
    notifiedAt: Date,
    acknowledged: Boolean,
    acknowledgedAt: Date
  }],
  
  // AI Analysis
  aiAnalysis: {
    riskAssessment: {
      score: Number,
      factors: [String],
      recommendations: [String]
    },
    
    predictedOutcome: {
      severity: String,
      timeToIntervention: Number, // minutes
      requiredResources: [String]
    },
    
    similarCases: [{
      caseId: String,
      similarity: Number,
      outcome: String
    }],
    
    modelVersion: String,
    analysisTimestamp: Date
  },
  
  // Resolution
  resolution: {
    resolvedAt: Date,
    resolvedBy: {
      name: String,
      role: String,
      hospitalId: String
    },
    
    outcome: {
      type: String,
      enum: [
        'patient_stable',
        'hospitalized',
        'treated_released',
        'transferred',
        'false_alarm',
        'no_response_needed',
        'patient_deceased'
      ]
    },
    
    treatmentProvided: [String],
    
    finalNotes: String,
    
    followUpRequired: Boolean,
    followUpDate: Date,
    
    patientFeedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5
      },
      comments: String
    }
  },
  
  // Escalation
  escalation: {
    escalated: {
      type: Boolean,
      default: false
    },
    escalatedAt: Date,
    escalatedBy: String,
    escalationReason: String,
    escalationLevel: {
      type: String,
      enum: ['supervisor', 'senior_doctor', 'department_head', 'emergency_services']
    }
  },
  
  // Performance Metrics
  metrics: {
    detectionToNotification: Number, // milliseconds
    notificationToAcknowledgment: Number, // milliseconds
    acknowledgmentToResponse: Number, // milliseconds
    totalResponseTime: Number, // milliseconds
    
    falseAlarmProbability: Number,
    accuracyScore: Number
  },
  
  // System Information
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for performance
emergencySchema.index({ emergencyId: 1 });
emergencySchema.index({ patientId: 1, detectedAt: -1 });
emergencySchema.index({ severity: 1, status: 1 });
emergencySchema.index({ detectedAt: -1 });
emergencySchema.index({ status: 1, detectedAt: -1 });
emergencySchema.index({ assignedHospital: 1 });
emergencySchema.index({ location: '2dsphere' });

// Method to generate emergency ID
emergencySchema.statics.generateEmergencyId = function() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `EMG-${timestamp}-${random}`.toUpperCase();
};

// Method to calculate response times
emergencySchema.methods.calculateResponseTimes = function() {
  const detection = this.detectedAt;
  const acknowledged = this.response.acknowledgedAt;
  const responseStarted = this.response.responseStartedAt;
  const resolved = this.resolution.resolvedAt;
  
  if (acknowledged) {
    this.metrics.detectionToNotification = acknowledged.getTime() - detection.getTime();
  }
  
  if (responseStarted && acknowledged) {
    this.metrics.acknowledgmentToResponse = responseStarted.getTime() - acknowledged.getTime();
  }
  
  if (resolved) {
    this.metrics.totalResponseTime = resolved.getTime() - detection.getTime();
  }
  
  return this.metrics;
};

// Method to check if emergency needs escalation
emergencySchema.methods.needsEscalation = function() {
  const now = new Date();
  const timeSinceDetection = now.getTime() - this.detectedAt.getTime();
  const minutesSinceDetection = timeSinceDetection / (1000 * 60);
  
  // Escalate if critical emergency not acknowledged in 5 minutes
  if (this.severity === 'critical' && !this.response.acknowledgedAt && minutesSinceDetection > 5) {
    return true;
  }
  
  // Escalate if high severity not acknowledged in 10 minutes
  if (this.severity === 'high' && !this.response.acknowledgedAt && minutesSinceDetection > 10) {
    return true;
  }
  
  // Escalate if acknowledged but no response in 15 minutes
  if (this.response.acknowledgedAt && !this.response.responseStartedAt && minutesSinceDetection > 15) {
    return true;
  }
  
  return false;
};

// Method to determine required resources
emergencySchema.methods.getRequiredResources = function() {
  const resources = [];
  
  switch (this.type) {
    case 'fall_detected':
      resources.push('ambulance', 'paramedic', 'orthopedic_assessment');
      break;
    case 'heart_rate_anomaly':
      resources.push('ambulance', 'cardiac_monitor', 'cardiologist');
      break;
    case 'temperature_anomaly':
      resources.push('medical_assessment', 'fever_management');
      break;
    default:
      resources.push('medical_assessment');
  }
  
  if (this.severity === 'critical') {
    resources.push('icu_bed', 'emergency_doctor');
  }
  
  return resources;
};

// Static method to get active emergencies
emergencySchema.statics.getActiveEmergencies = function() {
  return this.find({
    status: { $in: ['active', 'acknowledged', 'responding'] }
  }).sort({ detectedAt: -1 });
};

// Static method to get emergencies for a hospital
emergencySchema.statics.getHospitalEmergencies = function(hospitalId, hours = 24) {
  const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({
    assignedHospital: hospitalId,
    detectedAt: { $gte: cutoffTime }
  }).sort({ detectedAt: -1 });
};

// Pre-save middleware to update timestamps
emergencySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Emergency', emergencySchema);
