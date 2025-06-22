/*
 * Emergency Service - Core emergency detection and response coordination
 * Handles real-time health data processing, emergency detection, and alert management
 * 
 * This is the heart of the Rescue.net AI emergency response system
 */

const Emergency = require('../models/Emergency');
const HealthData = require('../models/HealthData');
const Patient = require('../models/Patient');
const Hospital = require('../models/Hospital');
const TelegramService = require('./telegramService');
const SMSService = require('./smsService');

class EmergencyService {
  constructor(io) {
    this.io = io; // Socket.IO instance for real-time communication
    this.telegramService = new TelegramService();
    this.smsService = new SMSService();
    
    // Emergency thresholds - these could be made configurable per patient
    this.defaultThresholds = {
      heartRate: { min: 60, max: 100 },
      temperature: { min: 36.0, max: 37.5 },
      bloodPressure: { systolic: 140, diastolic: 90 },
      fallConfidence: 0.7,
      inactivityMinutes: 60
    };
  }
  
  // Main method to process incoming health data and detect emergencies
  async processHealthData(healthData) {
    try {
      console.log(`Processing health data for patient: ${healthData.patientId}`);
      
      // Save health data to database
      const savedHealthData = await this.saveHealthData(healthData);
      
      // Get patient information and thresholds
      const patient = await Patient.findOne({ patientId: healthData.patientId });
      if (!patient) {
        throw new Error(`Patient not found: ${healthData.patientId}`);
      }
      
      // Use patient-specific thresholds or defaults
      const thresholds = patient.healthThresholds || this.defaultThresholds;
      
      // Detect emergencies
      const emergencies = savedHealthData.detectEmergencies(thresholds);
      
      let emergencyResponse = {
        emergency: false,
        healthDataId: savedHealthData._id,
        patientId: healthData.patientId
      };
      
      // If emergencies detected, create emergency record and trigger alerts
      if (emergencies.length > 0) {
        const emergency = await this.createEmergency(patient, savedHealthData, emergencies);
        emergencyResponse.emergency = true;
        emergencyResponse.emergencyId = emergency.emergencyId;
        emergencyResponse.severity = emergency.severity;
        emergencyResponse.types = emergencies;
        
        // Trigger immediate alerts
        await this.triggerEmergencyAlerts(emergency, patient);
        
        // Find and assign nearest hospital
        await this.assignNearestHospital(emergency);
        
        console.log(`🚨 Emergency detected: ${emergency.emergencyId} for patient ${patient.patientId}`);
      }
      
      // Always send real-time update
      this.sendRealTimeUpdate(healthData, emergencyResponse);
      
      return emergencyResponse;
      
    } catch (error) {
      console.error('Error processing health data:', error);
      throw error;
    }
  }
  
  // Save health data to database
  async saveHealthData(data) {
    const healthData = new HealthData({
      patientId: data.patientId,
      deviceId: data.deviceId,
      deviceTimestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      
      vitals: {
        heartRate: {
          value: data.heartRate,
          quality: data.heartRateQuality || 'good'
        },
        temperature: {
          value: data.temperature
        },
        bloodPressure: {
          systolic: data.bloodPressureSystolic,
          diastolic: data.bloodPressureDiastolic
        },
        oxygenSaturation: {
          value: data.oxygenSaturation
        }
      },
      
      motion: {
        accelerometer: {
          x: data.accelerometerX,
          y: data.accelerometerY,
          z: data.accelerometerZ,
          magnitude: data.accelerometerMagnitude
        },
        fallDetected: data.fallDetected || false,
        fallConfidence: data.fallConfidence || 0,
        stepCount: data.stepCount || 0
      },
      
      environment: {
        barometricPressure: {
          value: data.barometricPressure
        },
        altitude: {
          value: data.altitude
        }
      },
      
      location: {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.gpsAccuracy,
        satellites: data.gpsSatellites
      },
      
      deviceStatus: {
        batteryLevel: data.batteryLevel,
        signalStrength: data.signalStrength,
        sensorStatus: {
          heartRate: data.heartRateStatus || 'ok',
          temperature: data.temperatureStatus || 'ok',
          accelerometer: data.accelerometerStatus || 'ok',
          gps: data.gpsStatus || 'ok',
          gsm: data.gsmStatus || 'ok'
        }
      }
    });
    
    // Calculate data completeness
    healthData.calculateCompleteness();
    
    return await healthData.save();
  }
  
  // Create emergency record
  async createEmergency(patient, healthData, emergencyTypes) {
    // Determine the most severe emergency type
    const primaryType = this.determinePrimaryEmergencyType(emergencyTypes);
    const severity = this.calculateSeverity(healthData, emergencyTypes);
    
    const emergency = new Emergency({
      emergencyId: Emergency.generateEmergencyId(),
      patientId: patient.patientId,
      patient: patient._id,
      type: primaryType,
      severity: severity,
      description: this.generateEmergencyDescription(emergencyTypes, healthData),
      healthDataId: healthData._id,
      
      triggerData: {
        heartRate: healthData.vitals.heartRate.value,
        temperature: healthData.vitals.temperature.value,
        bloodPressure: {
          systolic: healthData.vitals.bloodPressure.systolic,
          diastolic: healthData.vitals.bloodPressure.diastolic
        },
        accelerometer: healthData.motion.accelerometer,
        fallConfidence: healthData.motion.fallConfidence
      },
      
      location: {
        coordinates: [healthData.location.longitude, healthData.location.latitude],
        accuracy: healthData.location.accuracy,
        detectedAt: new Date()
      }
    });
    
    const savedEmergency = await emergency.save();
    
    // Update health data with emergency reference
    healthData.emergencyTriggered = true;
    healthData.emergencyId = savedEmergency._id;
    await healthData.save();
    
    return savedEmergency;
  }
  
  // Trigger emergency alerts to all relevant parties
  async triggerEmergencyAlerts(emergency, patient) {
    const alerts = [];
    
    try {
      // Send SMS to emergency contacts
      for (const contact of patient.emergencyContacts) {
        if (contact.phone) {
          const smsPromise = this.smsService.sendEmergencyAlert(
            contact.phone,
            emergency,
            patient,
            contact.name
          );
          alerts.push(smsPromise);
        }
      }
      
      // Send Telegram alerts
      const telegramPromise = this.telegramService.sendEmergencyAlert(emergency, patient);
      alerts.push(telegramPromise);
      
      // Wait for all alerts to be sent
      const results = await Promise.allSettled(alerts);
      
      // Log notification results
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          emergency.notifications.push(result.value);
        } else {
          console.error('Alert failed:', result.reason);
        }
      });
      
      await emergency.save();
      
    } catch (error) {
      console.error('Error sending emergency alerts:', error);
    }
  }
  
  // Find and assign nearest hospital
  async assignNearestHospital(emergency) {
    try {
      if (!emergency.location.coordinates || emergency.location.coordinates.length !== 2) {
        console.log('No valid location data for hospital assignment');
        return;
      }
      
      const [longitude, latitude] = emergency.location.coordinates;
      
      // Find nearest hospitals within 50km
      const nearbyHospitals = await Hospital.findNearest(latitude, longitude, 50);
      
      if (nearbyHospitals.length > 0) {
        // Assign the nearest hospital
        emergency.assignedHospital = nearbyHospitals[0]._id;
        
        // Store all nearby hospitals with distances
        emergency.nearbyHospitals = nearbyHospitals.map(hospital => ({
          hospital: hospital._id,
          distance: hospital.calculateDistance(latitude, longitude),
          responseCapability: hospital.canHandleEmergency(),
          estimatedArrivalTime: this.estimateArrivalTime(hospital, emergency)
        }));
        
        await emergency.save();
        
        // Notify assigned hospital
        this.notifyHospital(nearbyHospitals[0], emergency);
      }
      
    } catch (error) {
      console.error('Error assigning hospital:', error);
    }
  }
  
  // Send real-time updates via WebSocket
  sendRealTimeUpdate(healthData, emergencyResponse) {
    // Send to patient's room
    this.io.to(`patient-${healthData.patientId}`).emit('health-update', {
      ...healthData,
      emergency: emergencyResponse.emergency
    });
    
    // Send to hospital's room if emergency
    if (emergencyResponse.emergency && emergencyResponse.assignedHospital) {
      this.io.to(`hospital-${emergencyResponse.assignedHospital}`).emit('emergency-alert', {
        ...emergencyResponse,
        healthData: healthData
      });
    }
  }
  
  // Notify hospital about emergency
  notifyHospital(hospital, emergency) {
    this.io.to(`hospital-${hospital._id}`).emit('new-emergency', {
      emergencyId: emergency.emergencyId,
      patientId: emergency.patientId,
      type: emergency.type,
      severity: emergency.severity,
      location: emergency.location,
      timestamp: emergency.detectedAt
    });
  }
  
  // Helper methods
  determinePrimaryEmergencyType(emergencyTypes) {
    // Priority order for emergency types
    const priority = {
      'fall_detected': 1,
      'heart_rate_anomaly': 2,
      'temperature_anomaly': 3,
      'blood_pressure_anomaly': 4,
      'inactivity_alert': 5
    };
    
    return emergencyTypes.sort((a, b) => 
      (priority[a] || 999) - (priority[b] || 999)
    )[0];
  }
  
  calculateSeverity(healthData, emergencyTypes) {
    if (emergencyTypes.includes('fall_detected') && healthData.motion.fallConfidence > 0.9) {
      return 'critical';
    }
    
    if (emergencyTypes.includes('heart_rate_anomaly')) {
      const hr = healthData.vitals.heartRate.value;
      if (hr < 40 || hr > 150) return 'critical';
      if (hr < 50 || hr > 120) return 'high';
    }
    
    if (emergencyTypes.includes('temperature_anomaly')) {
      const temp = healthData.vitals.temperature.value;
      if (temp > 39 || temp < 35) return 'critical';
      if (temp > 38 || temp < 36) return 'high';
    }
    
    return 'medium';
  }
  
  generateEmergencyDescription(emergencyTypes, healthData) {
    const descriptions = [];
    
    if (emergencyTypes.includes('fall_detected')) {
      descriptions.push(`Fall detected (${Math.round(healthData.motion.fallConfidence * 100)}% confidence)`);
    }
    
    if (emergencyTypes.includes('heart_rate_anomaly')) {
      descriptions.push(`Heart rate anomaly: ${healthData.vitals.heartRate.value} bpm`);
    }
    
    if (emergencyTypes.includes('temperature_anomaly')) {
      descriptions.push(`Temperature anomaly: ${healthData.vitals.temperature.value}°C`);
    }
    
    return descriptions.join('; ');
  }
  
  estimateArrivalTime(hospital, emergency) {
    // Simple estimation based on distance and average speed
    const distance = hospital.calculateDistance(
      emergency.location.coordinates[1],
      emergency.location.coordinates[0]
    );
    
    const averageSpeed = 40; // km/h for ambulance in urban areas
    return Math.round((distance / averageSpeed) * 60); // minutes
  }
  
  // Method to get emergency statistics
  async getEmergencyStats(timeframe = 24) {
    const cutoffTime = new Date(Date.now() - timeframe * 60 * 60 * 1000);
    
    const stats = await Emergency.aggregate([
      { $match: { detectedAt: { $gte: cutoffTime } } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          active: { $sum: { $cond: [{ $in: ['$status', ['active', 'responding']] }, 1, 0] } }
        }
      }
    ]);
    
    return stats[0] || { total: 0, critical: 0, high: 0, resolved: 0, active: 0 };
  }
}

module.exports = EmergencyService;
