/*
 * Hospital Routes - Hospital management and emergency response coordination
 * Handles hospital dashboard, patient monitoring, and emergency management
 * 
 * Core API for hospital dashboard functionality
 */

const express = require('express');
const Hospital = require('../models/Hospital');
const Patient = require('../models/Patient');
const Emergency = require('../models/Emergency');
const HealthData = require('../models/HealthData');
const { authMiddleware, requireHospital } = require('../middleware/auth');
const { asyncHandler, AppError, validationError } = require('../middleware/errorHandler');

const router = express.Router();

// Get hospital profile
router.get('/profile', requireHospital, asyncHandler(async (req, res) => {
  const hospital = await Hospital.findById(req.user.id);
  
  if (!hospital) {
    throw new AppError('Hospital not found', 404);
  }
  
  res.json({
    success: true,
    data: { hospital }
  });
}));

// Update hospital profile
router.put('/profile', requireHospital, asyncHandler(async (req, res) => {
  const {
    name, phone, address, capacity, departments, specializations,
    emergencyResponse, facilities, operatingHours
  } = req.body;
  
  const hospital = await Hospital.findById(req.user.id);
  if (!hospital) {
    throw new AppError('Hospital not found', 404);
  }
  
  // Update allowed fields
  if (name) hospital.name = name.trim();
  if (phone) hospital.phone = phone;
  if (address) hospital.address = address;
  if (capacity) hospital.capacity = { ...hospital.capacity, ...capacity };
  if (departments) hospital.departments = departments;
  if (specializations) hospital.specializations = specializations;
  if (emergencyResponse) hospital.emergencyResponse = { ...hospital.emergencyResponse, ...emergencyResponse };
  if (facilities) hospital.facilities = facilities;
  if (operatingHours) hospital.operatingHours = { ...hospital.operatingHours, ...operatingHours };
  
  hospital.lastActiveAt = new Date();
  await hospital.save();
  
  res.json({
    success: true,
    message: 'Hospital profile updated successfully',
    data: { hospital }
  });
}));

// Get hospital dashboard data
router.get('/dashboard', requireHospital, asyncHandler(async (req, res) => {
  const hospitalId = req.user.id;
  
  // Get active emergencies assigned to this hospital
  const activeEmergencies = await Emergency.find({
    assignedHospital: hospitalId,
    status: { $in: ['active', 'acknowledged', 'responding'] }
  }).populate('patient', 'name phone patientId age gender');
  
  // Get emergency statistics for last 24 hours
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const emergencyStats = await Emergency.aggregate([
    {
      $match: {
        assignedHospital: hospitalId,
        detectedAt: { $gte: last24Hours }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
        high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        avgResponseTime: { $avg: '$metrics.totalResponseTime' }
      }
    }
  ]);
  
  const stats = emergencyStats[0] || {
    total: 0, critical: 0, high: 0, resolved: 0, avgResponseTime: 0
  };
  
  // Get assigned patients count
  const assignedPatientsCount = await Patient.countDocuments({
    assignedHospital: hospitalId,
    isActive: true
  });
  
  // Get recent emergency alerts
  const recentEmergencies = await Emergency.find({
    assignedHospital: hospitalId,
    detectedAt: { $gte: last24Hours }
  })
  .sort({ detectedAt: -1 })
  .limit(10)
  .populate('patient', 'name phone patientId age gender');
  
  // Get current capacity status
  const hospital = await Hospital.findById(hospitalId);
  const capacityUtilization = hospital.capacity ? {
    totalBeds: hospital.capacity.totalBeds || 0,
    availableBeds: hospital.capacity.availableBeds || 0,
    icuBeds: hospital.capacity.icuBeds || 0,
    emergencyBeds: hospital.capacity.emergencyBeds || 0,
    utilizationRate: hospital.capacity.totalBeds > 0 ? 
      ((hospital.capacity.totalBeds - hospital.capacity.availableBeds) / hospital.capacity.totalBeds * 100).toFixed(1) : 0
  } : null;
  
  res.json({
    success: true,
    data: {
      hospitalId: hospital.hospitalId,
      activeEmergencies: {
        count: activeEmergencies.length,
        emergencies: activeEmergencies
      },
      emergencyStats: stats,
      assignedPatientsCount,
      recentEmergencies,
      capacityStatus: capacityUtilization,
      onDutyStaff: hospital.staff.filter(member => member.isOnDuty).length
    }
  });
}));

// Get assigned patients
router.get('/patients', requireHospital, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const hospitalId = req.user.id;
  
  let query = { assignedHospital: hospitalId, isActive: true };
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { patientId: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];
  }
  
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  const [patients, totalCount] = await Promise.all([
    Patient.find(query)
      .select('patientId name phone age gender bloodGroup deviceId lastActiveAt')
      .sort({ lastActiveAt: -1 })
      .limit(parseInt(limit))
      .skip(skip),
    Patient.countDocuments(query)
  ]);
  
  res.json({
    success: true,
    data: {
      patients,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit))
      }
    }
  });
}));

// Get patient details
router.get('/patients/:patientId', requireHospital, asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const hospitalId = req.user.id;
  
  const patient = await Patient.findOne({
    patientId: patientId,
    assignedHospital: hospitalId
  });
  
  if (!patient) {
    throw new AppError('Patient not found or not assigned to this hospital', 404);
  }
  
  // Get recent health data
  const recentHealthData = await HealthData.getRecentData(patientId, 60); // Last hour
  
  // Get emergency history
  const emergencyHistory = await Emergency.find({ patientId })
    .sort({ detectedAt: -1 })
    .limit(5);
  
  res.json({
    success: true,
    data: {
      patient,
      recentHealthData,
      emergencyHistory,
      currentVitals: recentHealthData.length > 0 ? {
        heartRate: recentHealthData[0].vitals.heartRate?.value,
        temperature: recentHealthData[0].vitals.temperature?.value,
        bloodPressure: recentHealthData[0].vitals.bloodPressure,
        timestamp: recentHealthData[0].timestamp,
        riskLevel: recentHealthData[0].emergencyFlags?.overallRiskLevel || 'normal'
      } : null
    }
  });
}));

// Assign patient to hospital
router.post('/assign-patient', requireHospital, asyncHandler(async (req, res) => {
  const { patientId, assignedDoctor } = req.body;
  const hospitalId = req.user.id;
  
  if (!patientId) {
    throw validationError('Patient ID is required');
  }
  
  const patient = await Patient.findOne({ patientId });
  if (!patient) {
    throw new AppError('Patient not found', 404);
  }
  
  if (patient.assignedHospital && patient.assignedHospital.toString() !== hospitalId) {
    throw new AppError('Patient is already assigned to another hospital', 400);
  }
  
  patient.assignedHospital = hospitalId;
  if (assignedDoctor) {
    patient.assignedDoctor = assignedDoctor;
  }
  
  await patient.save();
  
  res.json({
    success: true,
    message: 'Patient assigned successfully',
    data: {
      patientId: patient.patientId,
      assignedHospital: hospitalId,
      assignedDoctor: patient.assignedDoctor
    }
  });
}));

// Update bed capacity
router.put('/capacity', requireHospital, asyncHandler(async (req, res) => {
  const { totalBeds, availableBeds, icuBeds, emergencyBeds, ambulances } = req.body;
  
  const hospital = await Hospital.findById(req.user.id);
  if (!hospital) {
    throw new AppError('Hospital not found', 404);
  }
  
  if (totalBeds !== undefined) hospital.capacity.totalBeds = totalBeds;
  if (availableBeds !== undefined) hospital.capacity.availableBeds = availableBeds;
  if (icuBeds !== undefined) hospital.capacity.icuBeds = icuBeds;
  if (emergencyBeds !== undefined) hospital.capacity.emergencyBeds = emergencyBeds;
  if (ambulances !== undefined) hospital.capacity.ambulances = ambulances;
  
  await hospital.save();
  
  res.json({
    success: true,
    message: 'Capacity updated successfully',
    data: { capacity: hospital.capacity }
  });
}));

// Manage staff
router.get('/staff', requireHospital, asyncHandler(async (req, res) => {
  const hospital = await Hospital.findById(req.user.id).select('staff');
  
  if (!hospital) {
    throw new AppError('Hospital not found', 404);
  }
  
  res.json({
    success: true,
    data: { staff: hospital.staff }
  });
}));

// Add staff member
router.post('/staff', requireHospital, asyncHandler(async (req, res) => {
  const { name, role, specialization, phone, email, shiftTiming } = req.body;
  
  if (!name || !role || !phone) {
    throw validationError('Name, role, and phone are required');
  }
  
  const hospital = await Hospital.findById(req.user.id);
  if (!hospital) {
    throw new AppError('Hospital not found', 404);
  }
  
  const staffId = `STF-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase();
  
  hospital.staff.push({
    staffId,
    name: name.trim(),
    role,
    specialization,
    phone,
    email,
    shiftTiming,
    isOnDuty: false
  });
  
  await hospital.save();
  
  res.json({
    success: true,
    message: 'Staff member added successfully',
    data: { staff: hospital.staff }
  });
}));

// Update staff duty status
router.put('/staff/:staffId/duty', requireHospital, asyncHandler(async (req, res) => {
  const { staffId } = req.params;
  const { isOnDuty } = req.body;
  
  const hospital = await Hospital.findById(req.user.id);
  if (!hospital) {
    throw new AppError('Hospital not found', 404);
  }
  
  const staffMember = hospital.staff.find(member => member.staffId === staffId);
  if (!staffMember) {
    throw new AppError('Staff member not found', 404);
  }
  
  staffMember.isOnDuty = isOnDuty;
  await hospital.save();
  
  res.json({
    success: true,
    message: 'Staff duty status updated',
    data: { staffMember }
  });
}));

// Get emergency response statistics
router.get('/emergency-stats', requireHospital, asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const hospitalId = req.user.id;
  const cutoffDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
  
  const stats = await Emergency.aggregate([
    {
      $match: {
        assignedHospital: hospitalId,
        detectedAt: { $gte: cutoffDate }
      }
    },
    {
      $group: {
        _id: null,
        totalEmergencies: { $sum: 1 },
        criticalCount: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
        highCount: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
        resolvedCount: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        falseAlarmCount: { $sum: { $cond: [{ $eq: ['$status', 'false_alarm'] }, 1, 0] } },
        avgResponseTime: { $avg: '$metrics.totalResponseTime' },
        avgAcknowledgmentTime: { $avg: '$metrics.detectionToNotification' }
      }
    }
  ]);
  
  const result = stats[0] || {
    totalEmergencies: 0, criticalCount: 0, highCount: 0,
    resolvedCount: 0, falseAlarmCount: 0, avgResponseTime: 0, avgAcknowledgmentTime: 0
  };
  
  // Get emergency types breakdown
  const typeBreakdown = await Emergency.aggregate([
    {
      $match: {
        assignedHospital: hospitalId,
        detectedAt: { $gte: cutoffDate }
      }
    },
    { $group: { _id: '$type', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  res.json({
    success: true,
    data: {
      timeframe: `Last ${days} days`,
      overview: result,
      emergencyTypes: typeBreakdown,
      successRate: result.totalEmergencies > 0 ? 
        ((result.resolvedCount / result.totalEmergencies) * 100).toFixed(1) : 0
    }
  });
}));

// Get nearby hospitals for reference
router.get('/nearby', requireHospital, asyncHandler(async (req, res) => {
  const { radius = 50 } = req.query; // radius in kilometers
  
  const currentHospital = await Hospital.findById(req.user.id);
  if (!currentHospital || !currentHospital.location?.coordinates) {
    throw new AppError('Hospital location not set', 400);
  }
  
  const [longitude, latitude] = currentHospital.location.coordinates;
  
  const nearbyHospitals = await Hospital.find({
    _id: { $ne: req.user.id },
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude]
        },
        $maxDistance: parseInt(radius) * 1000 // Convert km to meters
      }
    },
    isActive: true
  }).select('name phone address location specializations emergencyResponse');
  
  res.json({
    success: true,
    data: {
      currentLocation: { latitude, longitude },
      radius: parseInt(radius),
      count: nearbyHospitals.length,
      hospitals: nearbyHospitals.map(hospital => ({
        ...hospital.toObject(),
        distance: hospital.calculateDistance(latitude, longitude)
      }))
    }
  });
}));

// Update emergency response settings
router.put('/emergency-response', requireHospital, asyncHandler(async (req, res) => {
  const { isEnabled, responseRadius, emergencyContacts } = req.body;
  
  const hospital = await Hospital.findById(req.user.id);
  if (!hospital) {
    throw new AppError('Hospital not found', 404);
  }
  
  if (isEnabled !== undefined) {
    hospital.emergencyResponse.isEnabled = isEnabled;
  }
  
  if (responseRadius !== undefined) {
    hospital.emergencyResponse.responseRadius = responseRadius;
  }
  
  if (emergencyContacts) {
    hospital.emergencyResponse.emergencyContacts = emergencyContacts;
  }
  
  await hospital.save();
  
  res.json({
    success: true,
    message: 'Emergency response settings updated',
    data: { emergencyResponse: hospital.emergencyResponse }
  });
}));

module.exports = router;
