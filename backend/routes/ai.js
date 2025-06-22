/*
 * AI Routes - AI/ML analysis and prediction endpoints
 * Handles health data analysis, emergency prediction, and AI insights
 * 
 * Integration with local Ollama AI models for health predictions
 */

const express = require('express');
const HealthData = require('../models/HealthData');
const Patient = require('../models/Patient');
const { authMiddleware, requireHospital } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

// Get AI analysis for health data
router.post('/analyze-health', authMiddleware, asyncHandler(async (req, res) => {
  const { healthDataId, patientId } = req.body;
  const aiClient = req.app.locals.services.aiClient;
  
  if (!healthDataId && !patientId) {
    throw new AppError('Health data ID or patient ID required', 400);
  }
  
  let healthData;
  let patient;
  
  if (healthDataId) {
    healthData = await HealthData.findById(healthDataId);
    if (!healthData) {
      throw new AppError('Health data not found', 404);
    }
    patient = await Patient.findOne({ patientId: healthData.patientId });
  } else {
    // Get latest health data for patient
    patient = await Patient.findOne({ patientId });
    if (!patient) {
      throw new AppError('Patient not found', 404);
    }
    
    healthData = await HealthData.findOne({ patientId })
      .sort({ timestamp: -1 });
    
    if (!healthData) {
      throw new AppError('No health data available for analysis', 404);
    }
  }
  
  // Authorization check
  if (req.user.userType === 'patient' && patient.patientId !== req.user.patientId) {
    throw new AppError('Not authorized to access this patient data', 403);
  }
  
  // Run AI analysis using AI service client
  const analysisResult = await aiClient.analyzeHealthData(patient.patientId, healthData);
  
  // Update health data with AI analysis
  if (analysisResult.success) {
    healthData.aiAnalysis = analysisResult.analysis;
    await healthData.save();
    
    // Check for emergency and trigger alerts if needed
    if (analysisResult.analysis && analysisResult.analysis.emergency_detected) {
      const emergencyService = req.app.locals.services.emergency;
      await emergencyService.handleEmergencyDetection({
        patientId: patient.patientId,
        emergencyType: analysisResult.analysis.emergency_type,
        severity: analysisResult.analysis.severity,
        healthData: healthData,
        aiConfidence: analysisResult.analysis.confidence
      });
    }
  }
  
  res.json({
    success: true,
    data: {
      patientId: patient.patientId,
      healthDataId: healthData._id,
      analysis: analysisResult.analysis,
      aiServiceStatus: analysisResult.success ? 'connected' : 'fallback',
      timestamp: new Date()
    }
  });
}));

// Real-time health analysis endpoint (for hardware simulation)
router.post('/analyze-realtime', asyncHandler(async (req, res) => {
  const { patientId, deviceId, healthData } = req.body;
  const aiClient = req.app.locals.services.aiClient;
  
  if (!patientId || !healthData) {
    throw new AppError('Patient ID and health data required', 400);
  }
  
  // Find or create patient record
  let patient = await Patient.findOne({ patientId });
  if (!patient) {
    // Create basic patient record for simulation
    patient = new Patient({
      patientId,
      name: `Demo Patient ${patientId}`,
      age: 35,
      gender: 'Other',
      contactNumber: '9999999999',
      emergencyContact: '9999999998',
      deviceId: deviceId || `device-${patientId}`
    });
    await patient.save();
  }
  
  // Store health data
  const healthRecord = new HealthData({
    patientId,
    deviceId: deviceId || `device-${patientId}`,
    timestamp: new Date(),
    ...healthData
  });
  await healthRecord.save();
  
  // Run AI analysis
  const analysisResult = await aiClient.analyzeHealthData(patientId, healthData);
  
  // Update health record with AI analysis
  if (analysisResult.success) {
    healthRecord.aiAnalysis = analysisResult.analysis;
    await healthRecord.save();
    
    // Handle emergency detection
    if (analysisResult.analysis && analysisResult.analysis.emergency_detected) {
      const emergencyService = req.app.locals.services.emergency;
      const io = req.app.locals.io;
      
      // Create emergency alert
      const emergencyAlert = {
        patientId,
        emergencyType: analysisResult.analysis.emergency_type || 'unknown',
        severity: analysisResult.analysis.severity || 'medium',
        timestamp: new Date().toISOString(),
        healthData,
        aiConfidence: analysisResult.analysis.confidence || 0.5,
        location: patient.lastKnownLocation || 'Unknown'
      };
      
      // Emit real-time emergency alert
      if (io) {
        io.emit('emergency-alert', emergencyAlert);
        io.to(`patient-${patientId}`).emit('health-emergency', emergencyAlert);
      }
      
      console.log(`🚨 EMERGENCY DETECTED: ${emergencyAlert.emergencyType} for patient ${patientId}`);
    }
  }
  
  res.json({
    success: true,
    patientId,
    deviceId: deviceId || `device-${patientId}`,
    analysis: analysisResult.analysis,
    healthDataId: healthRecord._id,
    aiServiceStatus: analysisResult.success ? 'connected' : 'fallback',
    timestamp: new Date().toISOString()
  });
}));

// Get AI service statistics
router.get('/service-stats', authMiddleware, asyncHandler(async (req, res) => {
  const aiClient = req.app.locals.services.aiClient;
  
  // Only allow hospital users to view stats
  if (req.user.userType !== 'hospital') {
    throw new AppError('Access denied. Hospital credentials required.', 403);
  }
  
  const healthCheck = await aiClient.checkHealth();
  const stats = await aiClient.getServiceStats();
  
  res.json({
    success: true,
    aiService: {
      status: healthCheck.status,
      details: healthCheck.data
    },
    stats: stats.success ? stats.stats : null,
    timestamp: new Date().toISOString()
  });
}));

// Simulate emergency for testing
router.post('/simulate-emergency', authMiddleware, asyncHandler(async (req, res) => {
  const { patientId, emergencyType } = req.body;
  const aiClient = req.app.locals.services.aiClient;
  
  // Only allow hospital users to simulate emergencies
  if (req.user.userType !== 'hospital') {
    throw new AppError('Access denied. Hospital credentials required.', 403);
  }
  
  if (!patientId) {
    throw new AppError('Patient ID required', 400);
  }
  
  // Simulate emergency using AI service
  const simulationResult = await aiClient.simulateEmergency(patientId, emergencyType);
  
  if (simulationResult.success) {
    // Emit real-time alert
    const io = req.app.locals.io;
    if (io) {
      io.emit('emergency-alert', simulationResult.alert);
      io.to(`patient-${patientId}`).emit('health-emergency', simulationResult.alert);
    }
  }
  
  res.json({
    success: simulationResult.success,
    alert: simulationResult.alert,
    analysis: simulationResult.analysis,
    timestamp: new Date().toISOString()
  });
}));

// Get AI trend analysis for a patient
router.get('/trends/:patientId', authMiddleware, asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const { days = 7 } = req.query;
  const aiService = req.app.locals.services.ai;
  
  // Authorization check
  if (req.user.userType === 'patient' && req.user.patientId !== patientId) {
    throw new AppError('Not authorized to access this patient data', 403);
  }
  
  const patient = await Patient.findOne({ patientId });
  if (!patient) {
    throw new AppError('Patient not found', 404);
  }
  
  // Get historical health data
  const cutoffDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
  const historicalData = await HealthData.find({
    patientId: patientId,
    timestamp: { $gte: cutoffDate }
  }).sort({ timestamp: 1 });
  
  if (historicalData.length === 0) {
    throw new AppError('Insufficient data for trend analysis', 400);
  }
  
  // Run AI trend analysis
  const trendAnalysis = await aiService.predictEmergencyTrends(patientId, historicalData);
  
  res.json({
    success: true,
    data: {
      patientId,
      timeframe: `Last ${days} days`,
      dataPoints: historicalData.length,
      trendAnalysis,
      summary: {
        avgRiskScore: historicalData.reduce((sum, data) => 
          sum + (data.aiAnalysis?.riskScore || 0), 0) / historicalData.length,
        emergencyCount: historicalData.filter(data => data.emergencyTriggered).length,
        highRiskPeriods: historicalData.filter(data => 
          data.aiAnalysis?.riskScore > 0.7).length
      }
    }
  });
}));

// Get AI insights for hospital
router.get('/hospital-insights', requireHospital, asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const hospitalId = req.user.id;
  
  const cutoffDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);
  
  // Get AI analysis statistics for hospital patients
  const insights = await HealthData.aggregate([
    {
      $lookup: {
        from: 'patients',
        localField: 'patientId',
        foreignField: 'patientId',
        as: 'patient'
      }
    },
    {
      $match: {
        'patient.assignedHospital': hospitalId,
        timestamp: { $gte: cutoffDate },
        'aiAnalysis.riskScore': { $exists: true }
      }
    },
    {
      $group: {
        _id: null,
        totalAnalyses: { $sum: 1 },
        avgRiskScore: { $avg: '$aiAnalysis.riskScore' },
        highRiskCount: { 
          $sum: { $cond: [{ $gt: ['$aiAnalysis.riskScore', 0.7] }, 1, 0] } 
        },
        mediumRiskCount: { 
          $sum: { 
            $cond: [
              { 
                $and: [
                  { $gt: ['$aiAnalysis.riskScore', 0.4] },
                  { $lte: ['$aiAnalysis.riskScore', 0.7] }
                ]
              }, 
              1, 
              0
            ] 
          } 
        },
        lowRiskCount: { 
          $sum: { $cond: [{ $lte: ['$aiAnalysis.riskScore', 0.4] }, 1, 0] } 
        }
      }
    }
  ]);
  
  const result = insights[0] || {
    totalAnalyses: 0, avgRiskScore: 0, highRiskCount: 0, 
    mediumRiskCount: 0, lowRiskCount: 0
  };
  
  // Get most common risk factors
  const riskFactors = await HealthData.aggregate([
    {
      $lookup: {
        from: 'patients',
        localField: 'patientId',
        foreignField: 'patientId',
        as: 'patient'
      }
    },
    {
      $match: {
        'patient.assignedHospital': hospitalId,
        timestamp: { $gte: cutoffDate },
        'aiAnalysis.predictions': { $exists: true, $not: { $size: 0 } }
      }
    },
    {
      $unwind: '$aiAnalysis.predictions'
    },
    {
      $group: {
        _id: '$aiAnalysis.predictions.condition',
        count: { $sum: 1 },
        avgProbability: { $avg: '$aiAnalysis.predictions.probability' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);
  
  res.json({
    success: true,
    data: {
      timeframe: `Last ${days} days`,
      overview: result,
      riskDistribution: {
        high: result.highRiskCount,
        medium: result.mediumRiskCount,
        low: result.lowRiskCount
      },
      commonRiskFactors: riskFactors,
      recommendations: generateHospitalRecommendations(result, riskFactors)
    }
  });
}));

// Get AI model status
router.get('/model-status', authMiddleware, asyncHandler(async (req, res) => {
  const aiService = req.app.locals.services.ai;
  
  const [connectionTest, modelInfo] = await Promise.all([
    aiService.testConnection(),
    aiService.getModelInfo()
  ]);
  
  res.json({
    success: true,
    data: {
      connectionStatus: connectionTest,
      modelInfo: modelInfo,
      lastUpdated: new Date()
    }
  });
}));

// Get patient risk assessment
router.get('/risk-assessment/:patientId', authMiddleware, asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  const aiService = req.app.locals.services.ai;
  
  // Authorization check
  if (req.user.userType === 'patient' && req.user.patientId !== patientId) {
    throw new AppError('Not authorized to access this patient data', 403);
  }
  
  const patient = await Patient.findOne({ patientId });
  if (!patient) {
    throw new AppError('Patient not found', 404);
  }
  
  // Get recent health data for assessment
  const recentData = await HealthData.getRecentData(patientId, 60); // Last hour
  
  if (recentData.length === 0) {
    throw new AppError('No recent health data available for assessment', 400);
  }
  
  const latestData = recentData[0];
  
  // Run AI analysis
  const analysis = await aiService.analyzeHealthData(latestData, patient);
  
  // Calculate overall risk factors
  const riskFactors = calculateRiskFactors(patient, latestData);
  
  res.json({
    success: true,
    data: {
      patientId,
      riskAssessment: {
        overallRiskScore: analysis.riskScore,
        riskLevel: analysis.riskLevel,
        emergencyProbability: analysis.emergencyProbability,
        riskFactors: riskFactors,
        predictions: analysis.predictions,
        recommendations: analysis.recommendations,
        lastUpdated: latestData.timestamp
      },
      vitals: {
        heartRate: latestData.vitals.heartRate?.value,
        temperature: latestData.vitals.temperature?.value,
        bloodPressure: latestData.vitals.bloodPressure,
        fallRisk: latestData.motion.fallDetected
      }
    }
  });
}));

// Batch analysis for multiple patients (Hospital only)
router.post('/batch-analysis', requireHospital, asyncHandler(async (req, res) => {
  const { patientIds } = req.body;
  const aiService = req.app.locals.services.ai;
  const hospitalId = req.user.id;
  
  if (!Array.isArray(patientIds) || patientIds.length === 0) {
    throw new AppError('Patient IDs array is required', 400);
  }
  
  if (patientIds.length > 50) {
    throw new AppError('Maximum 50 patients per batch analysis', 400);
  }
  
  // Verify all patients are assigned to this hospital
  const patients = await Patient.find({
    patientId: { $in: patientIds },
    assignedHospital: hospitalId
  });
  
  if (patients.length !== patientIds.length) {
    throw new AppError('Some patients not found or not assigned to this hospital', 400);
  }
  
  // Run batch analysis
  const results = [];
  
  for (const patient of patients) {
    try {
      // Get latest health data
      const latestData = await HealthData.findOne({ patientId: patient.patientId })
        .sort({ timestamp: -1 });
      
      if (latestData) {
        const analysis = await aiService.analyzeHealthData(latestData, patient);
        
        results.push({
          patientId: patient.patientId,
          patientName: patient.name,
          analysis: analysis,
          vitals: {
            heartRate: latestData.vitals.heartRate?.value,
            temperature: latestData.vitals.temperature?.value,
            timestamp: latestData.timestamp
          },
          status: 'analyzed'
        });
      } else {
        results.push({
          patientId: patient.patientId,
          patientName: patient.name,
          status: 'no_data'
        });
      }
    } catch (error) {
      results.push({
        patientId: patient.patientId,
        patientName: patient.name,
        status: 'error',
        error: error.message
      });
    }
  }
  
  // Sort by risk score (highest first)
  results.sort((a, b) => {
    const aRisk = a.analysis?.riskScore || 0;
    const bRisk = b.analysis?.riskScore || 0;
    return bRisk - aRisk;
  });
  
  res.json({
    success: true,
    data: {
      totalPatients: patientIds.length,
      analyzedCount: results.filter(r => r.status === 'analyzed').length,
      highRiskCount: results.filter(r => r.analysis?.riskScore > 0.7).length,
      results: results,
      timestamp: new Date()
    }
  });
}));

// Helper function to generate hospital recommendations
function generateHospitalRecommendations(insights, riskFactors) {
  const recommendations = [];
  
  if (insights.avgRiskScore > 0.6) {
    recommendations.push('High average risk score detected. Consider increasing monitoring frequency.');
  }
  
  if (insights.highRiskCount > insights.totalAnalyses * 0.2) {
    recommendations.push('High proportion of patients at risk. Review emergency response protocols.');
  }
  
  if (riskFactors.length > 0) {
    const topRiskFactor = riskFactors[0];
    recommendations.push(`Most common risk factor: ${topRiskFactor._id}. Consider specialized training.`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Patient population appears stable. Continue standard monitoring.');
  }
  
  return recommendations;
}

// Helper function to calculate risk factors
function calculateRiskFactors(patient, healthData) {
  const riskFactors = [];
  
  // Age-based risk
  if (patient.age > 65) {
    riskFactors.push({ factor: 'Advanced age', impact: 'high' });
  }
  
  // Medical history risk
  if (patient.medicalHistory.some(h => h.status === 'chronic')) {
    riskFactors.push({ factor: 'Chronic conditions', impact: 'high' });
  }
  
  // Vital signs risk
  if (healthData.vitals.heartRate?.value) {
    const hr = healthData.vitals.heartRate.value;
    if (hr < 50 || hr > 120) {
      riskFactors.push({ factor: 'Abnormal heart rate', impact: 'medium' });
    }
  }
  
  if (healthData.vitals.temperature?.value) {
    const temp = healthData.vitals.temperature.value;
    if (temp > 38 || temp < 36) {
      riskFactors.push({ factor: 'Abnormal temperature', impact: 'medium' });
    }
  }
  
  // Fall risk
  if (healthData.motion.fallDetected) {
    riskFactors.push({ factor: 'Fall detected', impact: 'critical' });
  }
  
  // Device status risk
  if (healthData.deviceStatus?.batteryLevel < 20) {
    riskFactors.push({ factor: 'Low device battery', impact: 'low' });
  }
  
  return riskFactors;
}

module.exports = router;
