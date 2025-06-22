/*
 * AI Service - Local Ollama integration for health prediction and analysis
 * Handles real-time health data analysis and emergency prediction using local AI models
 * 
 * Uses Ollama running locally for privacy and offline capability
 */

const axios = require('axios');

class AIService {
  constructor() {
    this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama2';
    this.isInitialized = false;
    
    this.initialize();
  }
  
  // Initialize AI service and check Ollama connectivity
  async initialize() {
    try {
      await this.checkOllamaConnection();
      this.isInitialized = true;
      console.log('✅ AI service initialized successfully');
    } catch (error) {
      console.warn('⚠️ AI service initialization failed:', error.message);
      console.warn('AI predictions will be disabled');
    }
  }
  
  // Check if Ollama is running and accessible
  async checkOllamaConnection() {
    try {
      const response = await axios.get(`${this.ollamaBaseUrl}/api/tags`, {
        timeout: 5000
      });
      
      const models = response.data.models || [];
      const hasRequiredModel = models.some(model => model.name.includes(this.model));
      
      if (!hasRequiredModel) {
        throw new Error(`Required model '${this.model}' not found in Ollama`);
      }
      
      return true;
    } catch (error) {
      throw new Error(`Ollama connection failed: ${error.message}`);
    }
  }
  
  // Analyze health data and predict emergency risk
  async analyzeHealthData(healthData, patientProfile) {
    if (!this.isInitialized) {
      return this.getFallbackAnalysis(healthData);
    }
    
    try {
      const prompt = this.buildHealthAnalysisPrompt(healthData, patientProfile);
      const analysis = await this.queryOllama(prompt);
      
      return this.parseHealthAnalysis(analysis, healthData);
      
    } catch (error) {
      console.error('AI analysis failed:', error);
      return this.getFallbackAnalysis(healthData);
    }
  }
  
  // Build prompt for health data analysis
  buildHealthAnalysisPrompt(healthData, patientProfile) {
    const age = patientProfile.age || 'unknown';
    const gender = patientProfile.gender || 'unknown';
    const medicalHistory = patientProfile.medicalHistory || [];
    const medications = patientProfile.medications || [];
    
    let prompt = `You are an emergency medical AI assistant analyzing real-time health data from a wearable device. `;
    prompt += `Provide a brief risk assessment and recommendations.\n\n`;
    
    prompt += `PATIENT PROFILE:\n`;
    prompt += `Age: ${age}\n`;
    prompt += `Gender: ${gender}\n`;
    prompt += `Medical History: ${medicalHistory.map(h => h.condition).join(', ') || 'None reported'}\n`;
    prompt += `Current Medications: ${medications.map(m => m.name).join(', ') || 'None reported'}\n\n`;
    
    prompt += `CURRENT VITAL SIGNS:\n`;
    if (healthData.vitals.heartRate?.value) {
      prompt += `Heart Rate: ${healthData.vitals.heartRate.value} bpm\n`;
    }
    if (healthData.vitals.temperature?.value) {
      prompt += `Temperature: ${healthData.vitals.temperature.value}°C\n`;
    }
    if (healthData.vitals.bloodPressure?.systolic) {
      prompt += `Blood Pressure: ${healthData.vitals.bloodPressure.systolic}/${healthData.vitals.bloodPressure.diastolic} mmHg\n`;
    }
    
    if (healthData.motion.accelerometer) {
      const { x, y, z } = healthData.motion.accelerometer;
      prompt += `Accelerometer: X=${x}, Y=${y}, Z=${z}\n`;
    }
    
    if (healthData.motion.fallDetected) {
      prompt += `Fall Detected: Yes (Confidence: ${Math.round(healthData.motion.fallConfidence * 100)}%)\n`;
    }
    
    prompt += `\nPlease provide:\n`;
    prompt += `1. Risk Score (0.0-1.0)\n`;
    prompt += `2. Risk Level (normal/low/medium/high/critical)\n`;
    prompt += `3. Primary Concerns (max 3)\n`;
    prompt += `4. Immediate Recommendations (max 3)\n`;
    prompt += `5. Emergency Probability (0.0-1.0)\n\n`;
    
    prompt += `Format your response as JSON with these exact keys: riskScore, riskLevel, concerns, recommendations, emergencyProbability\n`;
    prompt += `Keep all text fields concise and medically accurate.`;
    
    return prompt;
  }
  
  // Query Ollama with the given prompt
  async queryOllama(prompt) {
    try {
      const response = await axios.post(`${this.ollamaBaseUrl}/api/generate`, {
        model: this.model,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.1, // Low temperature for consistent medical analysis
          top_p: 0.9,
          num_predict: 500
        }
      }, {
        timeout: 30000 // 30 second timeout
      });
      
      return response.data.response;
      
    } catch (error) {
      throw new Error(`Ollama query failed: ${error.message}`);
    }
  }
  
  // Parse AI analysis response
  parseHealthAnalysis(aiResponse, healthData) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      let parsedResponse;
      
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback parsing if JSON is not properly formatted
        parsedResponse = this.extractDataFromText(aiResponse);
      }
      
      // Validate and normalize the response
      const analysis = {
        riskScore: this.normalizeScore(parsedResponse.riskScore),
        riskLevel: this.normalizeRiskLevel(parsedResponse.riskLevel),
        emergencyProbability: this.normalizeScore(parsedResponse.emergencyProbability),
        predictions: [{
          condition: 'health_risk_assessment',
          probability: this.normalizeScore(parsedResponse.emergencyProbability),
          timeframe: 'immediate',
          confidence: 0.8
        }],
        recommendations: this.normalizeRecommendations(parsedResponse.recommendations),
        modelVersion: this.model,
        analysisTimestamp: new Date()
      };
      
      return analysis;
      
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return this.getFallbackAnalysis(healthData);
    }
  }
  
  // Extract data from text response if JSON parsing fails
  extractDataFromText(text) {
    const extracted = {};
    
    // Extract risk score
    const riskScoreMatch = text.match(/risk\s*score[:\s]*([\d.]+)/i);
    extracted.riskScore = riskScoreMatch ? parseFloat(riskScoreMatch[1]) : 0.1;
    
    // Extract risk level
    const riskLevelMatch = text.match(/risk\s*level[:\s]*(normal|low|medium|high|critical)/i);
    extracted.riskLevel = riskLevelMatch ? riskLevelMatch[1].toLowerCase() : 'normal';
    
    // Extract emergency probability
    const emergencyMatch = text.match(/emergency\s*probability[:\s]*([\d.]+)/i);
    extracted.emergencyProbability = emergencyMatch ? parseFloat(emergencyMatch[1]) : 0.1;
    
    // Extract recommendations (simple pattern matching)
    const recommendations = [];
    const recLines = text.split('\n').filter(line => 
      line.includes('recommend') || line.match(/^\d+\./) || line.includes('should')
    );
    
    extracted.recommendations = recLines.slice(0, 3).map(line => 
      line.replace(/^\d+\.\s*/, '').trim()
    );
    
    return extracted;
  }
  
  // Provide fallback analysis when AI is not available
  getFallbackAnalysis(healthData) {
    let riskScore = 0.1;
    let riskLevel = 'normal';
    const recommendations = [];
    
    // Rule-based analysis
    if (healthData.vitals.heartRate?.value) {
      const hr = healthData.vitals.heartRate.value;
      if (hr < 50 || hr > 120) {
        riskScore = Math.max(riskScore, 0.7);
        riskLevel = 'high';
        recommendations.push('Monitor heart rate closely');
      }
    }
    
    if (healthData.vitals.temperature?.value) {
      const temp = healthData.vitals.temperature.value;
      if (temp > 38 || temp < 36) {
        riskScore = Math.max(riskScore, 0.6);
        riskLevel = riskLevel === 'normal' ? 'medium' : riskLevel;
        recommendations.push('Monitor temperature');
      }
    }
    
    if (healthData.motion.fallDetected) {
      riskScore = Math.max(riskScore, 0.8);
      riskLevel = 'critical';
      recommendations.push('Check for injuries immediately');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Continue regular monitoring');
    }
    
    return {
      riskScore: riskScore,
      riskLevel: riskLevel,
      emergencyProbability: riskScore,
      predictions: [{
        condition: 'rule_based_assessment',
        probability: riskScore,
        timeframe: 'immediate',
        confidence: 0.6
      }],
      recommendations: recommendations,
      modelVersion: 'fallback_rules',
      analysisTimestamp: new Date()
    };
  }
  
  // Predict emergency trends based on historical data
  async predictEmergencyTrends(patientId, historicalData) {
    if (!this.isInitialized) {
      return this.getFallbackTrendAnalysis(historicalData);
    }
    
    try {
      const prompt = this.buildTrendAnalysisPrompt(historicalData);
      const analysis = await this.queryOllama(prompt);
      
      return this.parseTrendAnalysis(analysis);
      
    } catch (error) {
      console.error('Trend analysis failed:', error);
      return this.getFallbackTrendAnalysis(historicalData);
    }
  }
  
  // Build prompt for trend analysis
  buildTrendAnalysisPrompt(historicalData) {
    let prompt = `Analyze the following health data trends and predict potential emergency scenarios:\n\n`;
    
    prompt += `HEALTH DATA OVER TIME:\n`;
    historicalData.forEach((data, index) => {
      prompt += `Time ${index + 1}: HR=${data.vitals.heartRate?.value || 'N/A'}, `;
      prompt += `Temp=${data.vitals.temperature?.value || 'N/A'}°C, `;
      prompt += `Falls=${data.motion.fallDetected ? 'Yes' : 'No'}\n`;
    });
    
    prompt += `\nProvide trend analysis with:\n`;
    prompt += `1. Trend Direction (improving/stable/deteriorating)\n`;
    prompt += `2. Risk Factors Identified\n`;
    prompt += `3. Predicted Timeline for Intervention\n`;
    prompt += `4. Recommended Actions\n\n`;
    
    prompt += `Format as JSON with keys: trendDirection, riskFactors, interventionTimeline, actions`;
    
    return prompt;
  }
  
  // Parse trend analysis response
  parseTrendAnalysis(aiResponse) {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      
      return {
        trendDirection: parsed.trendDirection || 'stable',
        riskFactors: parsed.riskFactors || [],
        interventionTimeline: parsed.interventionTimeline || 'monitor',
        recommendedActions: parsed.actions || ['Continue monitoring'],
        analysisTimestamp: new Date()
      };
      
    } catch (error) {
      return this.getFallbackTrendAnalysis();
    }
  }
  
  // Fallback trend analysis
  getFallbackTrendAnalysis(historicalData = []) {
    return {
      trendDirection: 'stable',
      riskFactors: ['Insufficient data for accurate trend analysis'],
      interventionTimeline: 'Continue monitoring',
      recommendedActions: ['Maintain regular health monitoring', 'Ensure device is functioning properly'],
      analysisTimestamp: new Date()
    };
  }
  
  // Helper methods for data normalization
  normalizeScore(score) {
    const num = parseFloat(score);
    return isNaN(num) ? 0.1 : Math.max(0, Math.min(1, num));
  }
  
  normalizeRiskLevel(level) {
    const validLevels = ['normal', 'low', 'medium', 'high', 'critical'];
    return validLevels.includes(level?.toLowerCase()) ? level.toLowerCase() : 'normal';
  }
  
  normalizeRecommendations(recommendations) {
    if (!Array.isArray(recommendations)) return ['Continue monitoring'];
    return recommendations.slice(0, 3).filter(rec => rec && rec.length > 0);
  }
  
  // Test AI service connectivity
  async testConnection() {
    try {
      await this.checkOllamaConnection();
      return {
        success: true,
        ollamaUrl: this.ollamaBaseUrl,
        model: this.model,
        status: 'connected'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        ollamaUrl: this.ollamaBaseUrl,
        model: this.model
      };
    }
  }
  
  // Get model information
  async getModelInfo() {
    if (!this.isInitialized) {
      return { available: false };
    }
    
    try {
      const response = await axios.get(`${this.ollamaBaseUrl}/api/tags`);
      const models = response.data.models || [];
      
      return {
        available: true,
        models: models.map(model => ({
          name: model.name,
          size: model.size,
          modifiedAt: model.modified_at
        })),
        currentModel: this.model
      };
      
    } catch (error) {
      return {
        available: false,
        error: error.message
      };
    }
  }
}

module.exports = AIService;
