/*
 * Health Data Routes - API endpoints for wearable device data and health monitoring
 * Handles real-time data from ESP32 devices and health analytics
 * 
 * Core endpoints for the IoT wearable device communication
 */

const express = require('express');
const HealthData = require('../models/HealthData');
const Patient = require('../models/Patient');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { optionalAuth, authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Receive health data from wearable device (No auth required for device)
router.post('/device-data', asyncHandler(async (req, res) => {
  const emergencyService = req.app.locals.services.emergency;
  const aiService = req.app.locals.services.ai;
  
  // Validate required fields
  const { patientId, deviceId } = req.body;
  
  if (!patientId || !deviceId) {
    throw new AppError('Patient ID and Device ID are required', 400);
  }
  
  // Verify patient exists
  const patient = await Patient.findOne({ patientId });
  if (!patient) {
    throw new AppError('Patient not found', 404);
  }
  
  // Verify device is registered to this patient
  if (patient.deviceId && patient.deviceId !== deviceId) {
    throw new AppError('Device not registered to this patient', 403);
  }
  
  // Process health data through emergency service
  const result = await emergencyService.processHealthData(req.body);
  
  // Get AI analysis if available
  let aiAnalysis = null;
  try {
    aiAnalysis = await aiService.analyzeHealthData(result.healthData || req.body, patient);
  } catch (error) {
    console.error('AI analysis failed:', error);
  }
  
  res.json({
    success: true,
    message: 'Health data processed successfully',
    data: {
      healthDataId: result.healthDataId,
      emergencyDetected: result.emergency,
      emergencyId: result.emergencyId,
      aiAnalysis: aiAnalysis
    }
  });
}));

// Get patient's recent health data
router.get('/patient/:patientId/recent', authMiddleware, asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { minutes = 60 } = req.query;
  
  // Authorization check
  if (req.user.userType === 'patient' && req.user.patientId !== patientId) {
    throw new AppError('Not authorized to access this patient data', 403);
  }
  
  const recentData = await HealthData.getRecentData(patientId, parseInt(minutes));
  
  res.json({
    success: true,
    data: {
      patientId,
      timeRange: `Last ${minutes} minutes`,
      count: recentData.length,
      healthData: recentData
    }
  });
}));

// Get patient's health history
router.get('/patient/:patientId/history', authMiddleware, asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { 
    startDate, 
    endDate, 
    limit = 100, 
    page = 1,
    emergencyOnly = false 
  } = req.query;
  
  // Authorization check
  if (req.user.userType === 'patient' && req.user.patientId !== patientId) {
    throw new AppError('Not authorized to access this patient data', 403);
  }
  
  // Build query
  const query = { patientId };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  if (emergencyOnly === 'true') {
    query.emergencyTriggered = true;
  }
  
  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const [healthData, totalCount] = await Promise.all([
    HealthData.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(skip),
    HealthData.countDocuments(query)
  ]);
  
  res.json({
    success: true,
    data: {
      patientId,
      healthData,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit))
      }
    }
  });
}));

// Get health statistics for a patient
router.get('/patient/:patientId/stats', authMiddleware, asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { days = 7 } = req.query;
  
  // Authorization check
  if (req.user.userType === 'patient' && req.user.patientId !== patientId) {
    throw new AppError('Not authorized to access this patient data', 403);
  }
  
  const cutoffDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
  
  const stats = await HealthData.aggregate([
    {
      $match: {
        patientId: patientId,
        timestamp: { $gte: cutoffDate }
      }
    },
    {
      $group: {
        _id: null,
        totalReadings: { $sum: 1 },
        avgHeartRate: { $avg: '$vitals.heartRate.value' },
        avgTemperature: { $avg: '$vitals.temperature.value' },
        minHeartRate: { $min: '$vitals.heartRate.value' },
        maxHeartRate: { $max: '$vitals.heartRate.value' },
        minTemperature: { $min: '$vitals.temperature.value' },
        maxTemperature: { $max: '$vitals.temperature.value' },
        emergencyCount: {
          $sum: { $cond: ['$emergencyTriggered', 1, 0] }
        },
        fallsDetected: {
          $sum: { $cond: ['$motion.fallDetected', 1, 0] }
        },
        avgBatteryLevel: { $avg: '$deviceStatus.batteryLevel' }
      }
    }
  ]);
  
  const result = stats[0] || {
    totalReadings: 0,
    avgHeartRate: null,
    avgTemperature: null,
    emergencyCount: 0,
    fallsDetected: 0
  };
  
  res.json({
    success: true,
    data: {
      patientId,
      timeframe: `Last ${days} days`,
      statistics: result
    }
  });
}));

// Get real-time vitals for a patient
router.get('/patient/:patientId/current', authMiddleware, asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  
  // Authorization check
  if (req.user.userType === 'patient' && req.user.patientId !== patientId) {
    throw new AppError('Not authorized to access this patient data', 403);
  }
  
  // Get the most recent health data (within last 5 minutes)
  const recentData = await HealthData.findOne({
    patientId: patientId,
    timestamp: { $gte: new Date(Date.now() - 5 * 60 * 1000) }
  }).sort({ timestamp: -1 });
  
  if (!recentData) {
    throw new AppError('No recent health data available', 404);
  }
  
  res.json({
    success: true,
    data: {
      patientId,
      currentVitals: {
        heartRate: recentData.vitals.heartRate?.value || null,
        temperature: recentData.vitals.temperature?.value || null,
        bloodPressure: recentData.vitals.bloodPressure || null,
        oxygenSaturation: recentData.vitals.oxygenSaturation?.value || null,
        batteryLevel: recentData.deviceStatus?.batteryLevel || null,
        lastUpdate: recentData.timestamp,
        deviceStatus: recentData.deviceStatus?.sensorStatus || null,
        location: recentData.location || null
      },
      emergencyStatus: {
        riskLevel: recentData.emergencyFlags?.overallRiskLevel || 'normal',
        lastEmergency: recentData.emergencyTriggered,
        emergencyId: recentData.emergencyId || null
      }
    }
  });
}));

// Device registration endpoint
router.post('/device/register', authMiddleware, asyncHandler(async (req, res) => {
  const { deviceId, patientId: bodyPatientId } = req.body;
  
  if (!deviceId) {
    throw new AppError('Device ID is required', 400);
  }
  
  // For patients, use their own patient ID
  const patientId = req.user.userType === 'patient' ? req.user.patientId : bodyPatientId;
  
  if (!patientId) {
    throw new AppError('Patient ID is required', 400);
  }
  
  // Check if device is already registered
  const existingPatient = await Patient.findOne({ deviceId });
  if (existingPatient && existingPatient.patientId !== patientId) {
    throw new AppError('Device is already registered to another patient', 400);
  }
  
  // Update patient with device ID
  const patient = await Patient.findOne({ patientId });
  if (!patient) {
    throw new AppError('Patient not found', 404);
  }
  
  patient.deviceId = deviceId;
  patient.deviceRegisteredAt = new Date();
  await patient.save();
  
  res.json({
    success: true,
    message: 'Device registered successfully',
    data: {
      patientId,
      deviceId,
      registeredAt: patient.deviceRegisteredAt
    }
  });
}));

// Device heartbeat/status endpoint
router.post('/device/heartbeat', asyncHandler(async (req, res) => {
  const { deviceId, status, batteryLevel, signalStrength } = req.body;
  
  if (!deviceId) {
    throw new AppError('Device ID is required', 400);
  }
  
  // Find patient with this device
  const patient = await Patient.findOne({ deviceId });
  if (!patient) {
    throw new AppError('Device not registered', 404);
  }
  
  // Create a minimal health data entry for status tracking
  const healthData = new HealthData({
    patientId: patient.patientId,
    deviceId: deviceId,
    deviceStatus: {
      batteryLevel: batteryLevel || null,
      signalStrength: signalStrength || null,
      sensorStatus: status || {}
    },
    processed: true // Mark as processed since it's just a heartbeat
  });
  
  await healthData.save();
  
  res.json({
    success: true,
    message: 'Heartbeat received',
    data: {
      deviceId,
      patientId: patient.patientId,
      timestamp: healthData.timestamp
    }
  });
}));

// Emergency data endpoint for hospitals
router.get('/emergency-data', authMiddleware, asyncHandler(async (req, res) => {
  if (req.user.userType !== 'hospital') {
    throw new AppError('Hospital access required', 403);
  }
  
  const { hours = 24 } = req.query;
  const cutoffTime = new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000);
  
  const emergencyData = await HealthData.find({
    timestamp: { $gte: cutoffTime },
    'emergencyFlags.overallRiskLevel': { $in: ['high', 'critical'] }
  })
  .populate('patientId', 'name phone patientId')
  .sort({ timestamp: -1 })
  .limit(50);
  
  res.json({
    success: true,
    data: {
      timeframe: `Last ${hours} hours`,
      emergencyCount: emergencyData.length,
      emergencyData: emergencyData
    }
  });
}));

// Health data export endpoint
router.get('/patient/:patientId/export', authMiddleware, asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { format = 'json', startDate, endDate } = req.query;
  
  // Authorization check
  if (req.user.userType === 'patient' && req.user.patientId !== patientId) {
    throw new AppError('Not authorized to access this patient data', 403);
  }
  
  const query = { patientId };
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  const healthData = await HealthData.find(query).sort({ timestamp: -1 });
  
  if (format === 'csv') {
    // Convert to CSV format
    const csvData = healthData.map(data => ({
      timestamp: data.timestamp,
      heartRate: data.vitals.heartRate?.value || '',
      temperature: data.vitals.temperature?.value || '',
      systolic: data.vitals.bloodPressure?.systolic || '',
      diastolic: data.vitals.bloodPressure?.diastolic || '',
      fallDetected: data.motion.fallDetected,
      batteryLevel: data.deviceStatus?.batteryLevel || '',
      emergencyTriggered: data.emergencyTriggered
    }));
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="health-data-${patientId}.csv"`);
    
    // Simple CSV conversion (in production, use a proper CSV library)
    const csvHeaders = Object.keys(csvData[0] || {}).join(',');
    const csvRows = csvData.map(row => Object.values(row).join(','));
    res.send([csvHeaders, ...csvRows].join('\n'));
  } else {
    res.json({
      success: true,
      data: {
        patientId,
        exportDate: new Date(),
        count: healthData.length,
        healthData: healthData
      }
    });
  }
}));

module.exports = router;
