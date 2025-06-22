/*
 * Emergency Routes - Emergency management and response coordination
 * Handles emergency incidents, alerts, and response tracking
 * 
 * Central API for emergency response coordination
 */

const express = require('express');
const Emergency = require('../models/Emergency');
const Patient = require('../models/Patient');
const Hospital = require('../models/Hospital');
const { authMiddleware, requireHospital } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

// Get all active emergencies (Hospital access)
router.get('/active', requireHospital, asyncHandler(async (req, res) => {
  const activeEmergencies = await Emergency.getActiveEmergencies()
    .populate('patient', 'name phone patientId age gender bloodGroup')
    .populate('assignedHospital', 'name phone address');
  
  res.json({
    success: true,
    data: {
      count: activeEmergencies.length,
      emergencies: activeEmergencies
    }
  });
}));

// Get emergencies for a specific hospital
router.get('/hospital/:hospitalId', requireHospital, asyncHandler(async (req, res) => {
  const { hospitalId } = req.params;
  const { hours = 24 } = req.query;
  
  // Verify hospital access
  if (req.user.hospitalId !== hospitalId) {
    throw new AppError('Not authorized to access this hospital data', 403);
  }
  
  const hospital = await Hospital.findOne({ hospitalId });
  if (!hospital) {
    throw new AppError('Hospital not found', 404);
  }
  
  const emergencies = await Emergency.getHospitalEmergencies(hospital._id, parseInt(hours))
    .populate('patient', 'name phone patientId age gender bloodGroup emergencyContacts');
  
  res.json({
    success: true,
    data: {
      hospitalId,
      timeframe: `Last ${hours} hours`,
      count: emergencies.length,
      emergencies: emergencies
    }
  });
}));

// Get specific emergency details
router.get('/:emergencyId', authMiddleware, asyncHandler(async (req, res) => {
  const { emergencyId } = req.params;
  
  const emergency = await Emergency.findOne({ emergencyId })
    .populate('patient', 'name phone patientId age gender bloodGroup emergencyContacts medicalHistory')
    .populate('assignedHospital', 'name phone address location emergencyResponse')
    .populate('healthDataId');
  
  if (!emergency) {
    throw new AppError('Emergency not found', 404);
  }
  
  // Authorization check
  if (req.user.userType === 'patient' && emergency.patient.patientId !== req.user.patientId) {
    throw new AppError('Not authorized to access this emergency', 403);
  }
  
  res.json({
    success: true,
    data: { emergency }
  });
}));

// Acknowledge emergency (Hospital staff)
router.post('/:emergencyId/acknowledge', requireHospital, asyncHandler(async (req, res) => {
  const { emergencyId } = req.params;
  const { acknowledgedBy, notes } = req.body;
  
  const emergency = await Emergency.findOne({ emergencyId });
  if (!emergency) {
    throw new AppError('Emergency not found', 404);
  }
  
  if (emergency.status !== 'active') {
    throw new AppError('Emergency is not in active state', 400);
  }
  
  // Update emergency status
  emergency.status = 'acknowledged';
  emergency.response.acknowledgedAt = new Date();
  emergency.response.acknowledgedBy = {
    name: acknowledgedBy?.name || req.user.name,
    role: acknowledgedBy?.role || 'hospital_staff',
    hospitalId: req.user.hospitalId,
    phone: acknowledgedBy?.phone
  };
  
  if (notes) {
    emergency.response.responseNotes = notes;
  }
  
  await emergency.save();
  
  // Send status update via services
  const telegramService = req.app.locals.services.telegram;
  await telegramService.sendStatusUpdate(emergency, 'acknowledged', notes);
  
  res.json({
    success: true,
    message: 'Emergency acknowledged successfully',
    data: {
      emergencyId: emergency.emergencyId,
      status: emergency.status,
      acknowledgedAt: emergency.response.acknowledgedAt
    }
  });
}));

// Start emergency response (Hospital staff)
router.post('/:emergencyId/respond', requireHospital, asyncHandler(async (req, res) => {
  const { emergencyId } = req.params;
  const { responders, estimatedArrivalTime, notes } = req.body;
  
  const emergency = await Emergency.findOne({ emergencyId });
  if (!emergency) {
    throw new AppError('Emergency not found', 404);
  }
  
  if (!['active', 'acknowledged'].includes(emergency.status)) {
    throw new AppError('Emergency cannot be responded to in current state', 400);
  }
  
  // Update emergency status
  emergency.status = 'responding';
  emergency.response.responseStartedAt = new Date();
  emergency.response.estimatedArrivalTime = estimatedArrivalTime;
  
  if (responders && Array.isArray(responders)) {
    emergency.response.responders = responders.map(responder => ({
      name: responder.name,
      role: responder.role,
      phone: responder.phone,
      vehicleType: responder.vehicleType,
      dispatchedAt: new Date()
    }));
  }
  
  if (notes) {
    emergency.response.responseNotes = notes;
  }
  
  await emergency.save();
  
  // Send status update
  const telegramService = req.app.locals.services.telegram;
  await telegramService.sendStatusUpdate(emergency, 'responding', notes);
  
  res.json({
    success: true,
    message: 'Emergency response started',
    data: {
      emergencyId: emergency.emergencyId,
      status: emergency.status,
      responseStartedAt: emergency.response.responseStartedAt,
      estimatedArrival: estimatedArrivalTime
    }
  });
}));

// Resolve emergency
router.post('/:emergencyId/resolve', requireHospital, asyncHandler(async (req, res) => {
  const { emergencyId } = req.params;
  const { outcome, treatmentProvided, finalNotes, followUpRequired, followUpDate } = req.body;
  
  const emergency = await Emergency.findOne({ emergencyId });
  if (!emergency) {
    throw new AppError('Emergency not found', 404);
  }
  
  if (emergency.status === 'resolved') {
    throw new AppError('Emergency is already resolved', 400);
  }
  
  // Update emergency status
  emergency.status = 'resolved';
  emergency.resolution = {
    resolvedAt: new Date(),
    resolvedBy: {
      name: req.user.name,
      role: 'hospital_staff',
      hospitalId: req.user.hospitalId
    },
    outcome: outcome || 'patient_stable',
    treatmentProvided: treatmentProvided || [],
    finalNotes: finalNotes,
    followUpRequired: followUpRequired || false,
    followUpDate: followUpDate ? new Date(followUpDate) : null
  };
  
  // Calculate response metrics
  emergency.calculateResponseTimes();
  
  await emergency.save();
  
  // Send status update
  const telegramService = req.app.locals.services.telegram;
  await telegramService.sendStatusUpdate(emergency, 'resolved', finalNotes);
  
  res.json({
    success: true,
    message: 'Emergency resolved successfully',
    data: {
      emergencyId: emergency.emergencyId,
      status: emergency.status,
      resolvedAt: emergency.resolution.resolvedAt,
      outcome: emergency.resolution.outcome
    }
  });
}));

// Mark as false alarm
router.post('/:emergencyId/false-alarm', requireHospital, asyncHandler(async (req, res) => {
  const { emergencyId } = req.params;
  const { reason } = req.body;
  
  const emergency = await Emergency.findOne({ emergencyId });
  if (!emergency) {
    throw new AppError('Emergency not found', 404);
  }
  
  emergency.status = 'false_alarm';
  emergency.resolution = {
    resolvedAt: new Date(),
    resolvedBy: {
      name: req.user.name,
      role: 'hospital_staff',
      hospitalId: req.user.hospitalId
    },
    outcome: 'false_alarm',
    finalNotes: reason || 'Marked as false alarm'
  };
  
  await emergency.save();
  
  // Send status update
  const telegramService = req.app.locals.services.telegram;
  await telegramService.sendStatusUpdate(emergency, 'false_alarm', reason);
  
  res.json({
    success: true,
    message: 'Emergency marked as false alarm',
    data: {
      emergencyId: emergency.emergencyId,
      status: emergency.status
    }
  });
}));

// Get emergency statistics
router.get('/stats/overview', requireHospital, asyncHandler(async (req, res) => {
  const { hours = 24 } = req.query;
  const cutoffTime = new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000);
  
  const stats = await Emergency.aggregate([
    { $match: { detectedAt: { $gte: cutoffTime } } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
        high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
        medium: { $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] } },
        low: { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } },
        active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
        acknowledged: { $sum: { $cond: [{ $eq: ['$status', 'acknowledged'] }, 1, 0] } },
        responding: { $sum: { $cond: [{ $eq: ['$status', 'responding'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        falseAlarms: { $sum: { $cond: [{ $eq: ['$status', 'false_alarm'] }, 1, 0] } }
      }
    }
  ]);
  
  const result = stats[0] || {
    total: 0, critical: 0, high: 0, medium: 0, low: 0,
    active: 0, acknowledged: 0, responding: 0, resolved: 0, falseAlarms: 0
  };
  
  // Get emergency types breakdown
  const typeStats = await Emergency.aggregate([
    { $match: { detectedAt: { $gte: cutoffTime } } },
    { $group: { _id: '$type', count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);
  
  res.json({
    success: true,
    data: {
      timeframe: `Last ${hours} hours`,
      overview: result,
      emergencyTypes: typeStats
    }
  });
}));

// Get patient emergency history
router.get('/patient/:patientId/history', authMiddleware, asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { limit = 10 } = req.query;
  
  // Authorization check
  if (req.user.userType === 'patient' && req.user.patientId !== patientId) {
    throw new AppError('Not authorized to access this patient data', 403);
  }
  
  const emergencies = await Emergency.find({ patientId })
    .sort({ detectedAt: -1 })
    .limit(parseInt(limit))
    .populate('assignedHospital', 'name phone');
  
  res.json({
    success: true,
    data: {
      patientId,
      count: emergencies.length,
      emergencies: emergencies
    }
  });
}));

// Escalate emergency
router.post('/:emergencyId/escalate', requireHospital, asyncHandler(async (req, res) => {
  const { emergencyId } = req.params;
  const { escalationReason, escalationLevel } = req.body;
  
  const emergency = await Emergency.findOne({ emergencyId });
  if (!emergency) {
    throw new AppError('Emergency not found', 404);
  }
  
  emergency.escalation = {
    escalated: true,
    escalatedAt: new Date(),
    escalatedBy: req.user.name,
    escalationReason: escalationReason,
    escalationLevel: escalationLevel || 'supervisor'
  };
  
  await emergency.save();
  
  res.json({
    success: true,
    message: 'Emergency escalated successfully',
    data: {
      emergencyId: emergency.emergencyId,
      escalationLevel: emergency.escalation.escalationLevel
    }
  });
}));

// Add patient feedback
router.post('/:emergencyId/feedback', authMiddleware, asyncHandler(async (req, res) => {
  const { emergencyId } = req.params;
  const { rating, comments } = req.body;
  
  const emergency = await Emergency.findOne({ emergencyId });
  if (!emergency) {
    throw new AppError('Emergency not found', 404);
  }
  
  // Authorization check - only the patient can provide feedback
  if (req.user.userType !== 'patient' || emergency.patientId !== req.user.patientId) {
    throw new AppError('Only the patient can provide feedback', 403);
  }
  
  if (!emergency.resolution) {
    throw new AppError('Emergency must be resolved before feedback can be provided', 400);
  }
  
  emergency.resolution.patientFeedback = {
    rating: rating,
    comments: comments
  };
  
  await emergency.save();
  
  res.json({
    success: true,
    message: 'Feedback submitted successfully',
    data: {
      emergencyId: emergency.emergencyId,
      feedback: emergency.resolution.patientFeedback
    }
  });
}));

module.exports = router;
