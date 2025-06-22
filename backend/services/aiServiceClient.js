/*
 * AI Service Client - Node.js client for Rescue.net AI Service
 * Connects the backend to the Python AI service for health analysis
 * Handles real-time health monitoring and emergency prediction
 */

const axios = require('axios');
const logger = require('../utils/logger');

class AIServiceClient {
  constructor(config = {}) {
    this.baseURL = config.aiServiceUrl || 'http://127.0.0.1:5000';
    this.timeout = config.timeout || 10000;
    this.retries = config.retries || 3;
    
    // Create axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Rescue.net-Backend/1.0'
      }
    });
    
    // Setup request/response interceptors
    this.setupInterceptors();
    
    logger.info(`AI Service client initialized: ${this.baseURL}`);
  }
  
  setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(`AI Service Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('AI Service Request Error:', error);
        return Promise.reject(error);
      }
    );
    
    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug(`AI Service Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error('AI Service Response Error:', error.message);
        return Promise.reject(error);
      }
    );
  }
  
  async checkHealth() {
    try {
      const response = await this.client.get('/health');
      return {
        status: 'healthy',
        data: response.data
      };
    } catch (error) {
      logger.error('AI Service health check failed:', error.message);
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }
  
  async analyzeHealthData(patientId, healthData) {
    try {
      logger.info(`Analyzing health data for patient: ${patientId}`);
      
      const payload = {
        patientId,
        healthData: this.formatHealthData(healthData)
      };
      
      const response = await this.client.post('/analyze/health-data', payload);
      
      if (response.data.analysis && response.data.analysis.emergency_detected) {
        logger.warn(`Emergency detected for patient ${patientId}: ${response.data.analysis.emergency_type}`);
      }
      
      return {
        success: true,
        analysis: response.data.analysis,
        patientId: response.data.patientId,
        timestamp: response.data.timestamp
      };
      
    } catch (error) {
      logger.error(`Health analysis failed for patient ${patientId}:`, error.message);
      
      // Return fallback analysis
      return this.getFallbackAnalysis(patientId, healthData, error.message);
    }
  }
  
  async predictHealthRisks(patientId, historicalData = []) {
    try {
      logger.info(`Predicting health risks for patient: ${patientId}`);
      
      const payload = {
        patientId,
        historicalData: historicalData.map(data => this.formatHealthData(data))
      };
      
      const response = await this.client.post('/predict/risk', payload);
      
      return {
        success: true,
        patientId: response.data.patientId,
        riskPrediction: response.data.riskPrediction,
        dataPoints: response.data.dataPoints,
        timestamp: response.data.timestamp
      };
      
    } catch (error) {
      logger.error(`Risk prediction failed for patient ${patientId}:`, error.message);
      
      return {
        success: false,
        error: error.message,
        fallback: this.getFallbackRiskPrediction(patientId)
      };
    }
  }
  
  async getHealthTrends(patientId) {
    try {
      logger.info(`Getting health trends for patient: ${patientId}`);
      
      const response = await this.client.get(`/patient/${patientId}/trends`);
      
      return {
        success: true,
        patientId: response.data.patientId,
        trends: response.data.trends,
        dataPoints: response.data.dataPoints,
        timestamp: response.data.timestamp
      };
      
    } catch (error) {
      logger.error(`Trend analysis failed for patient ${patientId}:`, error.message);
      
      return {
        success: false,
        error: error.message,
        fallback: this.getFallbackTrends(patientId)
      };
    }
  }
  
  async getActiveEmergencies() {
    try {
      const response = await this.client.get('/emergencies/active');
      
      return {
        success: true,
        emergencies: response.data.emergencies,
        count: response.data.count,
        timestamp: response.data.timestamp
      };
      
    } catch (error) {
      logger.error('Failed to get active emergencies:', error.message);
      
      return {
        success: false,
        error: error.message,
        emergencies: []
      };
    }
  }
  
  async simulateEmergency(patientId, emergencyType = 'cardiac_stress') {
    try {
      logger.info(`Simulating emergency: ${emergencyType} for patient: ${patientId}`);
      
      const payload = {
        patientId,
        emergencyType
      };
      
      const response = await this.client.post('/simulate/emergency', payload);
      
      return {
        success: true,
        alert: response.data.alert,
        analysis: response.data.analysis
      };
      
    } catch (error) {
      logger.error('Emergency simulation failed:', error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async getServiceStats() {
    try {
      const response = await this.client.get('/stats');
      
      return {
        success: true,
        stats: response.data.stats,
        timestamp: response.data.timestamp
      };
      
    } catch (error) {
      logger.error('Failed to get AI service stats:', error.message);
      
      return {
        success: false,
        error: error.message,
        stats: null
      };
    }
  }
  
  formatHealthData(healthData) {
    // Standardize health data format for AI service
    return {
      heartRate: healthData.heartRate || healthData.heart_rate || 0,
      temperature: healthData.temperature || healthData.body_temperature || 36.5,
      bloodPressureSystolic: healthData.bloodPressureSystolic || healthData.systolic_bp || 120,
      bloodPressureDiastolic: healthData.bloodPressureDiastolic || healthData.diastolic_bp || 80,
      oxygenSaturation: healthData.oxygenSaturation || healthData.spo2 || 98,
      respiratoryRate: healthData.respiratoryRate || healthData.respiratory_rate || 16,
      timestamp: healthData.timestamp || new Date().toISOString()
    };
  }
  
  getFallbackAnalysis(patientId, healthData, error) {
    // Basic rule-based analysis when AI service is unavailable
    const analysis = {
      overall_status: 'stable',
      anomaly_score: 0.1,
      emergency_detected: false,
      confidence: 0.3,
      fallback: true,
      error: error
    };
    
    // Basic threshold checks
    const hr = healthData.heartRate || 0;
    const temp = healthData.temperature || 36.5;
    const spo2 = healthData.oxygenSaturation || 98;
    
    if (hr > 120 || hr < 50) {
      analysis.overall_status = 'concerning';
      analysis.anomaly_score = 0.6;
      analysis.emergency_detected = hr > 150 || hr < 40;
    }
    
    if (temp > 38.5 || temp < 35.0) {
      analysis.overall_status = 'concerning';
      analysis.anomaly_score = Math.max(analysis.anomaly_score, 0.7);
      analysis.emergency_detected = analysis.emergency_detected || temp > 40.0;
    }
    
    if (spo2 < 90) {
      analysis.overall_status = 'critical';
      analysis.anomaly_score = 0.9;
      analysis.emergency_detected = true;
    }
    
    return {
      success: true,
      analysis,
      patientId,
      timestamp: new Date().toISOString(),
      fallback: true
    };
  }
  
  getFallbackRiskPrediction(patientId) {
    return {
      overall_risk: 'medium',
      risk_score: 0.4,
      risk_factors: ['ai_service_unavailable'],
      recommendations: ['Monitor vitals manually', 'Contact healthcare provider if symptoms worsen'],
      fallback: true
    };
  }
  
  getFallbackTrends(patientId) {
    return {
      overall_trajectory: 'stable',
      vital_trends: {},
      analysis_period: 0,
      fallback: true
    };
  }
}

module.exports = AIServiceClient;
