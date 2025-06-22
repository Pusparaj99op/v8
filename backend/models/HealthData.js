/*
 * HealthData Model - Real-time health monitoring data from wearable devices
 * Stores sensor readings, processes emergency conditions, and tracks patient vitals
 * 
 * This model handles data from ESP32 and Arduino sensors
 */

const mongoose = require('mongoose');

const healthDataSchema = new mongoose.Schema({
  // Patient and Device Information
  patientId: {
    type: String,
    required: true,
    index: true
  },
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  
  // Timestamp Information
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  deviceTimestamp: Date, // Timestamp from the device
  
  // Vital Signs Data
  vitals: {
    heartRate: {
      value: Number,
      unit: { type: String, default: 'bpm' },
      quality: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor'],
        default: 'good'
      }
    },
    
    temperature: {
      value: Number,
      unit: { type: String, default: 'celsius' },
      sensorType: { type: String, default: 'DS18B20' }
    },
    
    bloodPressure: {
      systolic: Number,
      diastolic: Number,
      unit: { type: String, default: 'mmHg' },
      calculationMethod: String
    },
    
    oxygenSaturation: {
      value: Number,
      unit: { type: String, default: '%' }
    }
  },
  
  // Motion and Activity Data
  motion: {
    accelerometer: {
      x: Number,
      y: Number,
      z: Number,
      magnitude: Number
    },
    
    activity: {
      type: String,
      enum: ['resting', 'walking', 'running', 'sitting', 'lying', 'unknown'],
      default: 'unknown'
    },
    
    stepCount: {
      type: Number,
      default: 0
    },
    
    fallDetected: {
      type: Boolean,
      default: false
    },
    
    fallConfidence: {
      type: Number,
      min: 0,
      max: 1
    }
  },
  
  // Environmental Data
  environment: {
    barometricPressure: {
      value: Number,
      unit: { type: String, default: 'hPa' }
    },
    
    altitude: {
      value: Number,
      unit: { type: String, default: 'meters' }
    },
    
    ambientLight: Number
  },
  
  // GPS Location Data
  location: {
    latitude: Number,
    longitude: Number,
    accuracy: Number,
    satellites: Number,
    speed: Number,
    heading: Number
  },
  
  // Battery and Device Status
  deviceStatus: {
    batteryLevel: {
      type: Number,
      min: 0,
      max: 100
    },
    
    signalStrength: Number,
    
    sensorStatus: {
      heartRate: { type: String, enum: ['ok', 'error', 'disconnected'], default: 'ok' },
      temperature: { type: String, enum: ['ok', 'error', 'disconnected'], default: 'ok' },
      accelerometer: { type: String, enum: ['ok', 'error', 'disconnected'], default: 'ok' },
      gps: { type: String, enum: ['ok', 'error', 'disconnected'], default: 'ok' },
      gsm: { type: String, enum: ['ok', 'error', 'disconnected'], default: 'ok' }
    },
    
    lastCalibration: Date,
    firmwareVersion: String
  },
  
  // Emergency Detection
  emergencyFlags: {
    heartRateAnomaly: {
      detected: { type: Boolean, default: false },
      severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
      description: String
    },
    
    temperatureAnomaly: {
      detected: { type: Boolean, default: false },
      severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
      description: String
    },
    
    fallDetection: {
      detected: { type: Boolean, default: false },
      severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
      description: String
    },
    
    inactivityAlert: {
      detected: { type: Boolean, default: false },
      duration: Number, // minutes of inactivity
      description: String
    },
    
    overallRiskLevel: {
      type: String,
      enum: ['normal', 'low', 'medium', 'high', 'critical'],
      default: 'normal'
    }
  },
  
  // AI Analysis Results
  aiAnalysis: {
    riskScore: {
      type: Number,
      min: 0,
      max: 1
    },
    
    predictions: [{
      condition: String,
      probability: Number,
      timeframe: String, // e.g., "next 30 minutes"
      confidence: Number
    }],
    
    recommendations: [String],
    
    modelVersion: String,
    analysisTimestamp: Date
  },
  
  // Data Quality and Validation
  dataQuality: {
    completeness: {
      type: Number,
      min: 0,
      max: 1,
      default: 1
    },
    
    reliability: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'high'
    },
    
    anomalies: [String],
    
    calibrationStatus: {
      type: String,
      enum: ['calibrated', 'needs_calibration', 'unknown'],
      default: 'calibrated'
    }
  },
  
  // Processing Status
  processed: {
    type: Boolean,
    default: false
  },
  
  processedAt: Date,
  
  emergencyTriggered: {
    type: Boolean,
    default: false
  },
  
  emergencyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Emergency'
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
healthDataSchema.index({ patientId: 1, timestamp: -1 });
healthDataSchema.index({ deviceId: 1, timestamp: -1 });
healthDataSchema.index({ timestamp: -1 });
healthDataSchema.index({ 'emergencyFlags.overallRiskLevel': 1 });
healthDataSchema.index({ processed: 1 });

// Method to detect emergency conditions
healthDataSchema.methods.detectEmergencies = function(patientThresholds) {
  const emergencies = [];
  
  // Heart rate anomaly detection
  if (this.vitals.heartRate.value) {
    const hr = this.vitals.heartRate.value;
    if (hr < patientThresholds.heartRate.min || hr > patientThresholds.heartRate.max) {
      this.emergencyFlags.heartRateAnomaly.detected = true;
      this.emergencyFlags.heartRateAnomaly.severity = hr < 40 || hr > 150 ? 'critical' : 'high';
      this.emergencyFlags.heartRateAnomaly.description = 
        `Heart rate ${hr} bpm is ${hr < patientThresholds.heartRate.min ? 'below' : 'above'} normal range`;
      emergencies.push('heart_rate_anomaly');
    }
  }
  
  // Temperature anomaly detection
  if (this.vitals.temperature.value) {
    const temp = this.vitals.temperature.value;
    if (temp < patientThresholds.temperature.min || temp > patientThresholds.temperature.max) {
      this.emergencyFlags.temperatureAnomaly.detected = true;
      this.emergencyFlags.temperatureAnomaly.severity = temp > 39 || temp < 35 ? 'critical' : 'high';
      this.emergencyFlags.temperatureAnomaly.description = 
        `Temperature ${temp}°C is ${temp < patientThresholds.temperature.min ? 'below' : 'above'} normal range`;
      emergencies.push('temperature_anomaly');
    }
  }
  
  // Fall detection
  if (this.motion.fallDetected) {
    this.emergencyFlags.fallDetection.detected = true;
    this.emergencyFlags.fallDetection.severity = this.motion.fallConfidence > 0.8 ? 'critical' : 'high';
    this.emergencyFlags.fallDetection.description = 
      `Fall detected with ${Math.round(this.motion.fallConfidence * 100)}% confidence`;
    emergencies.push('fall_detected');
  }
  
  // Determine overall risk level
  const severities = Object.values(this.emergencyFlags)
    .filter(flag => flag.detected && flag.severity)
    .map(flag => flag.severity);
  
  if (severities.includes('critical')) {
    this.emergencyFlags.overallRiskLevel = 'critical';
  } else if (severities.includes('high')) {
    this.emergencyFlags.overallRiskLevel = 'high';
  } else if (severities.includes('medium')) {
    this.emergencyFlags.overallRiskLevel = 'medium';
  } else if (severities.includes('low')) {
    this.emergencyFlags.overallRiskLevel = 'low';
  }
  
  return emergencies;
};

// Method to calculate data completeness
healthDataSchema.methods.calculateCompleteness = function() {
  const requiredFields = [
    'vitals.heartRate.value',
    'vitals.temperature.value',
    'motion.accelerometer.x',
    'motion.accelerometer.y',
    'motion.accelerometer.z',
    'deviceStatus.batteryLevel'
  ];
  
  let completedFields = 0;
  requiredFields.forEach(field => {
    const value = field.split('.').reduce((obj, key) => obj && obj[key], this);
    if (value !== null && value !== undefined) {
      completedFields++;
    }
  });
  
  this.dataQuality.completeness = completedFields / requiredFields.length;
  return this.dataQuality.completeness;
};

// Static method to get recent data for a patient
healthDataSchema.statics.getRecentData = function(patientId, minutes = 10) {
  const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);
  return this.find({
    patientId: patientId,
    timestamp: { $gte: cutoffTime }
  }).sort({ timestamp: -1 });
};

// Static method to get emergency data
healthDataSchema.statics.getEmergencyData = function(patientId, hours = 24) {
  const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({
    patientId: patientId,
    timestamp: { $gte: cutoffTime },
    'emergencyFlags.overallRiskLevel': { $in: ['high', 'critical'] }
  }).sort({ timestamp: -1 });
};

module.exports = mongoose.model('HealthData', healthDataSchema);
