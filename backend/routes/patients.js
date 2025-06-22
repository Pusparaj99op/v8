/*
 * Patient Routes - Patient profile management and health data access
 * Handles patient information, preferences, and health monitoring
 * 
 * Core API for patient dashboard functionality
 */

const express = require('express');
const Patient = require('../models/Patient');
const HealthData = require('../models/HealthData');
const Emergency = require('../models/Emergency');
const { authMiddleware, requirePatient } = require('../middleware/auth');
const { asyncHandler, AppError, validationError } = require('../middleware/errorHandler');

const router = express.Router();

// Get patient profile
router.get('/profile', requirePatient, asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.user.id)
    .populate('assignedHospital', 'name phone address emergencyResponse');
  
  if (!patient) {
    throw new AppError('Patient not found', 404);
  }
  
  res.json({
    success: true,
    data: { patient }
  });
}));

// Update patient profile
router.put('/profile', requirePatient, asyncHandler(async (req, res) => {
  const {
    name, phone, address, emergencyContacts, medicalHistory,
    medications, allergies, healthThresholds, language
  } = req.body;
  
  const patient = await Patient.findById(req.user.id);
  if (!patient) {
    throw new AppError('Patient not found', 404);
  }
  
  // Update allowed fields
  if (name) patient.name = name.trim();
  if (phone) patient.phone = phone;
  if (address) patient.address = address;
  if (emergencyContacts) patient.emergencyContacts = emergencyContacts;
  if (medicalHistory) patient.medicalHistory = medicalHistory;
  if (medications) patient.medications = medications;
  if (allergies) patient.allergies = allergies;
  if (healthThresholds) patient.healthThresholds = healthThresholds;
  if (language) patient.language = language;
  
  await patient.save();
  
  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: { patient }
  });
}));

// Get patient dashboard data
router.get('/dashboard', requirePatient, asyncHandler(async (req, res) => {
  const patientId = req.user.patientId;
  
  // Get recent health data (last 24 hours)
  const recentHealthData = await HealthData.getRecentData(patientId, 24 * 60);
  
  // Get latest vital signs (last reading)
  const latestVitals = recentHealthData.length > 0 ? recentHealthData[0] : null;
  
  // Get emergency history (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const emergencyHistory = await Emergency.find({
    patientId: patientId,
    detectedAt: { $gte: thirtyDaysAgo }
  }).sort({ detectedAt: -1 }).limit(10);
  
  // Calculate health statistics
  const healthStats = await HealthData.aggregate([
    {
      $match: {
        patientId: patientId,
        timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }
    },
    {
      $group: {
        _id: null,
        avgHeartRate: { $avg: '$vitals.heartRate.value' },
        avgTemperature: { $avg: '$vitals.temperature.value' },
        totalReadings: { $sum: 1 },
        emergencyCount: { $sum: { $cond: ['$emergencyTriggered', 1, 0] } }
      }
    }
  ]);
  
  const stats = healthStats[0] || {
    avgHeartRate: null,
    avgTemperature: null,
    totalReadings: 0,
    emergencyCount: 0
  };
  
  // Get device status
  const deviceStatus = latestVitals ? {
    batteryLevel: latestVitals.deviceStatus?.batteryLevel,
    lastUpdate: latestVitals.timestamp,
    signalStrength: latestVitals.deviceStatus?.signalStrength,
    sensorStatus: latestVitals.deviceStatus?.sensorStatus
  } : null;
  
  res.json({
    success: true,
    data: {
      patientId,
      currentVitals: latestVitals ? {
        heartRate: latestVitals.vitals.heartRate?.value,
        temperature: latestVitals.vitals.temperature?.value,
        bloodPressure: latestVitals.vitals.bloodPressure,
        timestamp: latestVitals.timestamp,
        riskLevel: latestVitals.emergencyFlags?.overallRiskLevel || 'normal'
      } : null,
      healthStats: stats,
      deviceStatus,
      recentEmergencies: emergencyHistory,
      dataPoints: recentHealthData.length
    }
  });
}));

// Get health trends for charts
router.get('/health-trends', requirePatient, asyncHandler(async (req, res) => {
  const { days = 7, metric = 'heartRate' } = req.query;
  const patientId = req.user.patientId;
  
  const cutoffDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
  
  let aggregationPipeline = [
    {
      $match: {
        patientId: patientId,
        timestamp: { $gte: cutoffDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' },
          hour: { $hour: '$timestamp' }
        },
        timestamp: { $first: '$timestamp' }
      }
    },
    { $sort: { timestamp: 1 } }
  ];
  
  // Add metric-specific fields
  if (metric === 'heartRate') {
    aggregationPipeline[1].$group.avgValue = { $avg: '$vitals.heartRate.value' };
    aggregationPipeline[1].$group.minValue = { $min: '$vitals.heartRate.value' };
    aggregationPipeline[1].$group.maxValue = { $max: '$vitals.heartRate.value' };
  } else if (metric === 'temperature') {
    aggregationPipeline[1].$group.avgValue = { $avg: '$vitals.temperature.value' };
    aggregationPipeline[1].$group.minValue = { $min: '$vitals.temperature.value' };
    aggregationPipeline[1].$group.maxValue = { $max: '$vitals.temperature.value' };
  }
  
  const trends = await HealthData.aggregate(aggregationPipeline);
  
  res.json({
    success: true,
    data: {
      patientId,
      metric,
      timeframe: `Last ${days} days`,
      trends: trends.map(trend => ({
        timestamp: trend.timestamp,
        value: trend.avgValue,
        min: trend.minValue,
        max: trend.maxValue
      }))
    }
  });
}));

// Add emergency contact
router.post('/emergency-contacts', requirePatient, asyncHandler(async (req, res) => {
  const { name, relationship, phone, isPrimary } = req.body;
  
  if (!name || !relationship || !phone) {
    throw validationError('Name, relationship, and phone are required');
  }
  
  const patient = await Patient.findById(req.user.id);
  if (!patient) {
    throw new AppError('Patient not found', 404);
  }
  
  // If this is primary contact, unset other primary contacts
  if (isPrimary) {
    patient.emergencyContacts.forEach(contact => {
      contact.isPrimary = false;
    });
  }
  
  patient.emergencyContacts.push({
    name: name.trim(),
    relationship: relationship.trim(),
    phone: phone.trim(),
    isPrimary: isPrimary || false
  });
  
  await patient.save();
  
  res.json({
    success: true,
    message: 'Emergency contact added successfully',
    data: { emergencyContacts: patient.emergencyContacts }
  });
}));

// Update emergency contact
router.put('/emergency-contacts/:contactIndex', requirePatient, asyncHandler(async (req, res) => {
  const { contactIndex } = req.params;
  const { name, relationship, phone, isPrimary } = req.body;
  
  const patient = await Patient.findById(req.user.id);
  if (!patient) {
    throw new AppError('Patient not found', 404);
  }
  
  const index = parseInt(contactIndex);
  if (index < 0 || index >= patient.emergencyContacts.length) {
    throw new AppError('Invalid contact index', 400);
  }
  
  // If this is primary contact, unset other primary contacts
  if (isPrimary) {
    patient.emergencyContacts.forEach((contact, i) => {
      if (i !== index) contact.isPrimary = false;
    });
  }
  
  // Update contact
  const contact = patient.emergencyContacts[index];
  if (name) contact.name = name.trim();
  if (relationship) contact.relationship = relationship.trim();
  if (phone) contact.phone = phone.trim();
  if (isPrimary !== undefined) contact.isPrimary = isPrimary;
  
  await patient.save();
  
  res.json({
    success: true,
    message: 'Emergency contact updated successfully',
    data: { emergencyContacts: patient.emergencyContacts }
  });
}));

// Delete emergency contact
router.delete('/emergency-contacts/:contactIndex', requirePatient, asyncHandler(async (req, res) => {
  const { contactIndex } = req.params;
  
  const patient = await Patient.findById(req.user.id);
  if (!patient) {
    throw new AppError('Patient not found', 404);
  }
  
  const index = parseInt(contactIndex);
  if (index < 0 || index >= patient.emergencyContacts.length) {
    throw new AppError('Invalid contact index', 400);
  }
  
  patient.emergencyContacts.splice(index, 1);
  await patient.save();
  
  res.json({
    success: true,
    message: 'Emergency contact deleted successfully',
    data: { emergencyContacts: patient.emergencyContacts }
  });
}));

// Update health thresholds
router.put('/health-thresholds', requirePatient, asyncHandler(async (req, res) => {
  const { heartRate, temperature, bloodPressure } = req.body;
  
  const patient = await Patient.findById(req.user.id);
  if (!patient) {
    throw new AppError('Patient not found', 404);
  }
  
  if (heartRate) {
    patient.healthThresholds.heartRate = {
      min: heartRate.min || patient.healthThresholds.heartRate.min,
      max: heartRate.max || patient.healthThresholds.heartRate.max
    };
  }
  
  if (temperature) {
    patient.healthThresholds.temperature = {
      min: temperature.min || patient.healthThresholds.temperature.min,
      max: temperature.max || patient.healthThresholds.temperature.max
    };
  }
  
  if (bloodPressure) {
    patient.healthThresholds.bloodPressure = {
      systolic: bloodPressure.systolic || patient.healthThresholds.bloodPressure.systolic,
      diastolic: bloodPressure.diastolic || patient.healthThresholds.bloodPressure.diastolic
    };
  }
  
  await patient.save();
  
  res.json({
    success: true,
    message: 'Health thresholds updated successfully',
    data: { healthThresholds: patient.healthThresholds }
  });
}));

// Add medication
router.post('/medications', requirePatient, asyncHandler(async (req, res) => {
  const { name, dosage, frequency, startDate, endDate } = req.body;
  
  if (!name || !dosage || !frequency) {
    throw validationError('Name, dosage, and frequency are required');
  }
  
  const patient = await Patient.findById(req.user.id);
  if (!patient) {
    throw new AppError('Patient not found', 404);
  }
  
  patient.medications.push({
    name: name.trim(),
    dosage: dosage.trim(),
    frequency: frequency.trim(),
    startDate: startDate ? new Date(startDate) : new Date(),
    endDate: endDate ? new Date(endDate) : null,
    isActive: true
  });
  
  await patient.save();
  
  res.json({
    success: true,
    message: 'Medication added successfully',
    data: { medications: patient.medications }
  });
}));

// Update medication
router.put('/medications/:medicationIndex', requirePatient, asyncHandler(async (req, res) => {
  const { medicationIndex } = req.params;
  const { name, dosage, frequency, endDate, isActive } = req.body;
  
  const patient = await Patient.findById(req.user.id);
  if (!patient) {
    throw new AppError('Patient not found', 404);
  }
  
  const index = parseInt(medicationIndex);
  if (index < 0 || index >= patient.medications.length) {
    throw new AppError('Invalid medication index', 400);
  }
  
  const medication = patient.medications[index];
  if (name) medication.name = name.trim();
  if (dosage) medication.dosage = dosage.trim();
  if (frequency) medication.frequency = frequency.trim();
  if (endDate) medication.endDate = new Date(endDate);
  if (isActive !== undefined) medication.isActive = isActive;
  
  await patient.save();
  
  res.json({
    success: true,
    message: 'Medication updated successfully',
    data: { medications: patient.medications }
  });
}));

// Get patient settings
router.get('/settings', requirePatient, asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.user.id).select(
    'emergencyAlertsEnabled dataPrivacyConsent language healthThresholds'
  );
  
  if (!patient) {
    throw new AppError('Patient not found', 404);
  }
  
  res.json({
    success: true,
    data: {
      emergencyAlertsEnabled: patient.emergencyAlertsEnabled,
      dataPrivacyConsent: patient.dataPrivacyConsent,
      language: patient.language,
      healthThresholds: patient.healthThresholds
    }
  });
}));

// Update patient settings
router.put('/settings', requirePatient, asyncHandler(async (req, res) => {
  const { emergencyAlertsEnabled, dataPrivacyConsent, language } = req.body;
  
  const patient = await Patient.findById(req.user.id);
  if (!patient) {
    throw new AppError('Patient not found', 404);
  }
  
  if (emergencyAlertsEnabled !== undefined) {
    patient.emergencyAlertsEnabled = emergencyAlertsEnabled;
  }
  
  if (dataPrivacyConsent !== undefined) {
    patient.dataPrivacyConsent = dataPrivacyConsent;
  }
  
  if (language && ['english', 'hindi'].includes(language)) {
    patient.language = language;
  }
  
  await patient.save();
  
  res.json({
    success: true,
    message: 'Settings updated successfully',
    data: {
      emergencyAlertsEnabled: patient.emergencyAlertsEnabled,
      dataPrivacyConsent: patient.dataPrivacyConsent,
      language: patient.language
    }
  });
}));

// Get patient's assigned hospital
router.get('/hospital', requirePatient, asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.user.id)
    .populate('assignedHospital', 'name phone address location emergencyResponse specializations');
  
  if (!patient) {
    throw new AppError('Patient not found', 404);
  }
  
  res.json({
    success: true,
    data: {
      assignedHospital: patient.assignedHospital,
      assignedDoctor: patient.assignedDoctor
    }
  });
}));

module.exports = router;
