# AI Service - Real-time Health Analysis API
# Flask API service that integrates all AI models for health monitoring
# Connects with Node.js backend to provide AI predictions and emergency detection

import os
import sys
import json
import logging
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import numpy as np
import warnings
warnings.filterwarnings('ignore')

# Setup logging for health monitoring
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [AI-SERVICE] %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Import our health monitoring system
from health_monitor import HealthMonitor

app = Flask(__name__)
CORS(app)

# Initialize health monitor
health_monitor = HealthMonitor(enable_ai_models=True)

# Store recent health data for trend analysis
recent_health_data = {}
emergency_alerts = []

@app.route('/health', methods=['GET'])
def service_health():
    """Health check endpoint for the AI service"""
    return jsonify({
        'status': 'healthy',
        'service': 'Rescue.net AI Service',
        'timestamp': datetime.now().isoformat(),
        'models_loaded': health_monitor.models_available,
        'version': '1.0.0'
    })

@app.route('/analyze/health-data', methods=['POST'])
def analyze_health_data():
    """
    Analyze health data and detect anomalies/emergencies
    Expected input: {
        "patientId": "string",
        "healthData": {
            "heartRate": number,
            "temperature": number,
            "bloodPressureSystolic": number,
            "bloodPressureDiastolic": number,
            "oxygenSaturation": number,
            "timestamp": "ISO string"
        }
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'patientId' not in data or 'healthData' not in data:
            return jsonify({'error': 'Missing required fields'}), 400
        
        patient_id = data['patientId']
        health_data = data['healthData']
        
        # Log incoming data
        logger.info(f"Analyzing health data for patient: {patient_id}")
        
        # Store in recent data for trend analysis
        if patient_id not in recent_health_data:
            recent_health_data[patient_id] = []
        
        recent_health_data[patient_id].append({
            'timestamp': datetime.now().isoformat(),
            **health_data
        })
        
        # Keep only last 100 readings per patient
        if len(recent_health_data[patient_id]) > 100:
            recent_health_data[patient_id] = recent_health_data[patient_id][-100:]
        
        # Get comprehensive analysis
        analysis = health_monitor.analyze_health_data(patient_id, health_data)
        
        # Check for emergency
        if analysis.get('emergency_detected', False):
            emergency_alert = {
                'patientId': patient_id,
                'emergencyType': analysis.get('emergency_type', 'unknown'),
                'severity': analysis.get('severity', 'medium'),
                'timestamp': datetime.now().isoformat(),
                'healthData': health_data,
                'aiConfidence': analysis.get('confidence', 0.5)
            }
            emergency_alerts.append(emergency_alert)
            logger.warning(f"EMERGENCY DETECTED for {patient_id}: {analysis.get('emergency_type')}")
        
        # Return comprehensive analysis
        response = {
            'patientId': patient_id,
            'analysis': analysis,
            'timestamp': datetime.now().isoformat(),
            'status': 'success'
        }
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"Error analyzing health data: {str(e)}")
        return jsonify({'error': 'Analysis failed', 'details': str(e)}), 500

@app.route('/predict/risk', methods=['POST'])
def predict_risk():
    """
    Predict health risks for a patient based on recent data
    """
    try:
        data = request.get_json()
        patient_id = data.get('patientId')
        
        if not patient_id:
            return jsonify({'error': 'Patient ID required'}), 400
        
        # Get recent health data for this patient
        patient_data = recent_health_data.get(patient_id, [])
        
        if len(patient_data) < 5:
            return jsonify({
                'error': 'Insufficient data for risk prediction',
                'message': 'Need at least 5 health readings'
            }), 400
        
        # Get risk prediction
        risk_analysis = health_monitor.predict_health_risks(patient_data)
        
        logger.info(f"Risk prediction for {patient_id}: {risk_analysis.get('overall_risk', 'unknown')}")
        
        return jsonify({
            'patientId': patient_id,
            'riskPrediction': risk_analysis,
            'timestamp': datetime.now().isoformat(),
            'dataPoints': len(patient_data)
        })
        
    except Exception as e:
        logger.error(f"Error predicting risk: {str(e)}")
        return jsonify({'error': 'Risk prediction failed', 'details': str(e)}), 500

@app.route('/emergencies/active', methods=['GET'])
def get_active_emergencies():
    """Get list of active emergency alerts"""
    try:
        # Return recent emergencies (last 24 hours)
        recent_emergencies = [
            alert for alert in emergency_alerts
            if datetime.fromisoformat(alert['timestamp']) > datetime.now() - timedelta(hours=24)
        ]
        
        return jsonify({
            'emergencies': recent_emergencies,
            'count': len(recent_emergencies),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting emergencies: {str(e)}")
        return jsonify({'error': 'Failed to get emergencies'}), 500

@app.route('/patient/<patient_id>/trends', methods=['GET'])
def get_health_trends(patient_id):
    """Get health trends and insights for a specific patient"""
    try:
        patient_data = recent_health_data.get(patient_id, [])
        
        if len(patient_data) < 10:
            return jsonify({
                'error': 'Insufficient data for trend analysis',
                'message': 'Need at least 10 health readings'
            }), 400
        
        # Get trend analysis
        trends = health_monitor.analyze_health_trends(patient_data)
        
        return jsonify({
            'patientId': patient_id,
            'trends': trends,
            'dataPoints': len(patient_data),
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error analyzing trends: {str(e)}")
        return jsonify({'error': 'Trend analysis failed'}), 500

@app.route('/models/retrain', methods=['POST'])
def retrain_models():
    """Retrain AI models with recent data (admin only)"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or auth_header != 'Bearer admin-token-demo':
            return jsonify({'error': 'Unauthorized'}), 401
        
        # Collect training data from recent health data
        training_data = []
        for patient_id, data_list in recent_health_data.items():
            training_data.extend(data_list)
        
        if len(training_data) < 50:
            return jsonify({
                'error': 'Insufficient training data',
                'message': 'Need at least 50 data points across all patients'
            }), 400
        
        # Retrain models
        retrain_result = health_monitor.retrain_models(training_data)
        
        logger.info(f"Model retraining completed: {retrain_result}")
        
        return jsonify({
            'status': 'success',
            'message': 'Models retrained successfully',
            'trainingData': len(training_data),
            'result': retrain_result,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error retraining models: {str(e)}")
        return jsonify({'error': 'Model retraining failed'}), 500

@app.route('/simulate/emergency', methods=['POST'])
def simulate_emergency():
    """Simulate an emergency for testing purposes"""
    try:
        data = request.get_json()
        patient_id = data.get('patientId', 'demo-patient-001')
        emergency_type = data.get('emergencyType', 'cardiac_stress')
        
        # Generate emergency health data
        emergency_data = health_monitor.generate_emergency_scenario(emergency_type)
        
        # Analyze the simulated emergency
        analysis = health_monitor.analyze_health_data(patient_id, emergency_data)
        
        # Create emergency alert
        emergency_alert = {
            'patientId': patient_id,
            'emergencyType': emergency_type,
            'severity': 'high',
            'timestamp': datetime.now().isoformat(),
            'healthData': emergency_data,
            'aiConfidence': 0.95,
            'simulated': True
        }
        emergency_alerts.append(emergency_alert)
        
        logger.info(f"Simulated emergency: {emergency_type} for {patient_id}")
        
        return jsonify({
            'status': 'emergency_simulated',
            'alert': emergency_alert,
            'analysis': analysis
        })
        
    except Exception as e:
        logger.error(f"Error simulating emergency: {str(e)}")
        return jsonify({'error': 'Emergency simulation failed'}), 500

@app.route('/stats', methods=['GET'])
def get_service_stats():
    """Get AI service statistics"""
    try:
        total_patients = len(recent_health_data)
        total_readings = sum(len(data) for data in recent_health_data.values())
        total_emergencies = len(emergency_alerts)
        
        # Calculate last hour activity
        one_hour_ago = datetime.now() - timedelta(hours=1)
        recent_emergencies = [
            alert for alert in emergency_alerts
            if datetime.fromisoformat(alert['timestamp']) > one_hour_ago
        ]
        
        return jsonify({
            'stats': {
                'totalPatients': total_patients,
                'totalHealthReadings': total_readings,
                'totalEmergencies': total_emergencies,
                'emergenciesLastHour': len(recent_emergencies),
                'modelsActive': health_monitor.models_available,
                'uptime': str(datetime.now() - health_monitor.start_time),
                'serviceName': 'Rescue.net AI Service'
            },
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        return jsonify({'error': 'Failed to get stats'}), 500

if __name__ == '__main__':
    logger.info("Starting Rescue.net AI Service...")
    logger.info("Integrating with health monitoring models...")
    
    # Test model availability
    if health_monitor.models_available:
        logger.info("✅ AI models loaded successfully")
    else:
        logger.warning("⚠️  Running in simulation mode (install ML dependencies for full AI features)")
    
    # Start Flask app
    app.run(
        host='127.0.0.1',
        port=5000,
        debug=False,
        threaded=True
    )
