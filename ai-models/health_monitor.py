# Health Monitor Integration - Rescue.net AI
# Main system that integrates all AI models for comprehensive health monitoring
# Real-time health analysis, emergency detection, and risk prediction

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import warnings
warnings.filterwarnings('ignore')

# Import our AI models (will work once dependencies are installed)
try:
    from .anomaly_detector import HealthAnomalyDetector
    from .emergency_classifier import EmergencyClassifier
    from .risk_predictor import RiskPredictor
    AI_MODELS_AVAILABLE = True
except ImportError:
    # Try importing without relative imports
    try:
        from anomaly_detector import HealthAnomalyDetector
        from emergency_classifier import EmergencyClassifier
        from risk_predictor import RiskPredictor
        AI_MODELS_AVAILABLE = True
    except ImportError:
        # Fallback for when running standalone or during development
        print("Note: AI model dependencies not installed. Using simulation mode.")
        HealthAnomalyDetector = None
        EmergencyClassifier = None
        RiskPredictor = None
        AI_MODELS_AVAILABLE = False

class HealthMonitor:
    """
    Comprehensive health monitoring system that integrates all AI models.
    Provides real-time health analysis, emergency detection, and risk prediction.
    """
    
    def __init__(self, enable_ai_models=True):
        self.enable_ai_models = enable_ai_models
        self.logger = self._setup_logging()
        self.start_time = datetime.now()  # Track service uptime
        
        # Initialize AI models
        self.anomaly_detector = None
        self.emergency_classifier = None
        self.risk_predictor = None
        
        # Health data storage (in production, this would be a database)
        self.health_history = {}
        self.patient_profiles = {}
        
        # Emergency thresholds for immediate alerts
        self.critical_thresholds = {
            'heart_rate': {'min': 40, 'max': 150},
            'temperature': {'min': 35.0, 'max': 39.0},
            'systolic_bp': {'min': 80, 'max': 180},
            'diastolic_bp': {'min': 50, 'max': 110},
            'spo2': {'min': 90, 'max': 100},
            'respiratory_rate': {'min': 8, 'max': 30}
        }
        
        if self.enable_ai_models and HealthAnomalyDetector:
            self._initialize_ai_models()
    
    @property
    def models_available(self):
        """Check if AI models are available and trained"""
        if not self.enable_ai_models:
            return False
        
        return (
            self.anomaly_detector is not None and
            self.emergency_classifier is not None and
            self.risk_predictor is not None
        )
    
    def _setup_logging(self):
        """Setup logging for health monitoring"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('health_monitor.log'),
                logging.StreamHandler()
            ]
        )
        return logging.getLogger('HealthMonitor')
    
    def _initialize_ai_models(self):
        """Initialize and load trained AI models"""
        try:
            self.logger.info("Initializing AI models...")
            
            # Initialize models only if classes are available
            if AI_MODELS_AVAILABLE and HealthAnomalyDetector and EmergencyClassifier and RiskPredictor:
                self.anomaly_detector = HealthAnomalyDetector()
                self.emergency_classifier = EmergencyClassifier()
                self.risk_predictor = RiskPredictor()
                
                # Try to load pre-trained models
                try:
                    self.anomaly_detector.load_models()
                    self.emergency_classifier.load_model()
                    self.risk_predictor.load_model()
                    self.logger.info("Pre-trained models loaded successfully")
                except Exception as e:
                    self.logger.warning(f"Could not load pre-trained models: {e}")
                    self.logger.info("Training new models...")
                    self._train_models()
            else:
                self.logger.warning("AI model classes not available. Using simulation mode.")
                self.anomaly_detector = None
                self.emergency_classifier = None
                self.risk_predictor = None
                self.enable_ai_models = False
            
        except Exception as e:
            self.logger.error(f"Failed to initialize AI models: {e}")
            self.enable_ai_models = False
    
    def _train_models(self):
        """Train all AI models"""
        try:
            if self.anomaly_detector:
                self.anomaly_detector.train()
                self.anomaly_detector.save_models()
            
            if self.emergency_classifier:
                self.emergency_classifier.train()
                self.emergency_classifier.save_model()
            
            if self.risk_predictor:
                self.risk_predictor.train()
                self.risk_predictor.save_model()
            
            self.logger.info("All models trained and saved successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to train models: {e}")
            self.enable_ai_models = False
    
    def analyze_health_data(self, device_id: str, health_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Comprehensive health data analysis combining all AI models.
        
        Args:
            device_id: Unique identifier for the wearable device
            health_data: Current health readings from the device
            
        Returns:
            Complete health analysis including anomalies, emergency classification, and risk prediction
        """
        analysis_start_time = datetime.now()
        
        try:
            # Store health data
            self._store_health_data(device_id, health_data)
            
            # Basic vital signs check
            immediate_alerts = self._check_immediate_alerts(health_data)
            
            # AI-powered analysis
            anomaly_result = None
            emergency_result = None
            risk_result = None
            
            if self.enable_ai_models:
                # Anomaly detection
                if self.anomaly_detector and self.anomaly_detector.is_trained:
                    anomaly_result = self.anomaly_detector.predict_anomaly(health_data)
                
                # Emergency classification
                if self.emergency_classifier and self.emergency_classifier.is_trained:
                    emergency_result = self.emergency_classifier.predict_emergency(health_data)
                
                # Risk prediction
                if self.risk_predictor and self.risk_predictor.is_trained:
                    patient_history = self.health_history.get(device_id, [])
                    risk_result = self.risk_predictor.predict_risk(health_data, patient_history)
            
            # Combine results
            analysis_result = self._combine_analysis_results(
                health_data, immediate_alerts, anomaly_result, emergency_result, risk_result
            )
            
            # Add metadata
            analysis_result.update({
                'device_id': device_id,
                'analysis_timestamp': analysis_start_time.isoformat(),
                'processing_time_ms': (datetime.now() - analysis_start_time).total_seconds() * 1000,
                'ai_models_enabled': self.enable_ai_models
            })
            
            # Log analysis
            self._log_analysis(device_id, analysis_result)
            
            return analysis_result
    
        except Exception as e:
            self.logger.error(f"Health analysis failed for device {device_id}: {e}")
            return self._create_error_response(device_id, str(e))
    
    def _store_health_data(self, device_id: str, health_data: Dict[str, Any]):
        """Store health data for trend analysis"""
        if device_id not in self.health_history:
            self.health_history[device_id] = []
        
        # Add timestamp to health data
        timestamped_data = {
            **health_data,
            'timestamp': datetime.now().isoformat()
        }
        
        # Store data (keep last 100 readings)
        self.health_history[device_id].append(timestamped_data)
        if len(self.health_history[device_id]) > 100:
            self.health_history[device_id] = self.health_history[device_id][-100:]
    
    def _check_immediate_alerts(self, health_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check for immediate critical alerts based on thresholds"""
        alerts = []
        
        for vital, thresholds in self.critical_thresholds.items():
            if vital in health_data:
                value = health_data[vital]
                
                if value < thresholds['min']:
                    alerts.append({
                        'type': 'critical_low',
                        'vital_sign': vital,
                        'current_value': value,
                        'threshold': thresholds['min'],
                        'severity': 'critical',
                        'message': f"{vital} critically low: {value}"
                    })
                elif value > thresholds['max']:
                    alerts.append({
                        'type': 'critical_high',
                        'vital_sign': vital,
                        'current_value': value,
                        'threshold': thresholds['max'],
                        'severity': 'critical',
                        'message': f"{vital} critically high: {value}"
                    })
        
        return alerts
    
    def _combine_analysis_results(self, health_data, immediate_alerts, anomaly_result, 
                                emergency_result, risk_result) -> Dict[str, Any]:
        """Combine results from all analysis components"""
        
        # Determine overall status
        overall_status = self._determine_overall_status(
            immediate_alerts, anomaly_result, emergency_result, risk_result
        )
        
        # Combine recommendations
        all_recommendations = []
        if immediate_alerts:
            all_recommendations.extend(["IMMEDIATE MEDICAL ATTENTION REQUIRED"])
        
        if anomaly_result and 'recommendations' in anomaly_result:
            all_recommendations.extend(anomaly_result['recommendations'])
        
        if emergency_result and 'recommended_actions' in emergency_result:
            all_recommendations.extend(emergency_result['recommended_actions'])
        
        if risk_result and 'recommendations' in risk_result:
            all_recommendations.extend(risk_result['recommendations'])
        
        # Remove duplicates while preserving order
        unique_recommendations = []
        for rec in all_recommendations:
            if rec not in unique_recommendations:
                unique_recommendations.append(rec)
        
        # Create comprehensive analysis
        analysis = {
            'current_vitals': health_data,
            'overall_status': overall_status,
            'immediate_alerts': immediate_alerts,
            'recommendations': unique_recommendations[:10],  # Top 10 recommendations
            'requires_emergency_response': overall_status['severity'] in ['critical', 'high'],
            'confidence_score': overall_status.get('confidence', 0.8)
        }
        
        # Add AI analysis results if available
        if anomaly_result:
            analysis['anomaly_detection'] = {
                'is_anomaly': anomaly_result.get('is_anomaly', False),
                'risk_score': anomaly_result.get('risk_score', 0),
                'risk_level': anomaly_result.get('risk_level', 'unknown')
            }
        
        if emergency_result:
            analysis['emergency_classification'] = {
                'predicted_emergency': emergency_result.get('predicted_emergency', 'unknown'),
                'confidence': emergency_result.get('confidence', 0),
                'severity': emergency_result.get('severity', 'unknown'),
                'top_predictions': emergency_result.get('top_predictions', [])
            }
        
        if risk_result:
            analysis['risk_prediction'] = {
                'overall_risk_score': risk_result.get('overall_risk_score', 0),
                'risk_level': risk_result.get('risk_level', 'unknown'),
                'time_predictions': risk_result.get('time_predictions', {}),
                'key_risk_factors': risk_result.get('key_risk_factors', [])
            }
        
        return analysis
    
    def _determine_overall_status(self, immediate_alerts, anomaly_result, 
                                emergency_result, risk_result) -> Dict[str, Any]:
        """Determine overall health status from all analysis components"""
        
        # Start with normal status
        status = {
            'level': 'normal',
            'severity': 'normal',
            'confidence': 0.8,
            'primary_concern': None,
            'summary': 'All vital signs within normal range'
        }
        
        # Check immediate alerts (highest priority)
        if immediate_alerts:
            critical_alerts = [a for a in immediate_alerts if a['severity'] == 'critical']
            if critical_alerts:
                status.update({
                    'level': 'emergency',
                    'severity': 'critical',
                    'confidence': 0.95,
                    'primary_concern': critical_alerts[0]['message'],
                    'summary': 'Critical vital signs detected - immediate medical attention required'
                })
                return status
        
        # Check emergency classification
        if emergency_result:
            emergency_type = emergency_result.get('predicted_emergency', 'normal')
            confidence = emergency_result.get('confidence', 0)
            
            if emergency_type != 'normal' and confidence > 0.7:
                severity_map = {
                    'critical': 'critical',
                    'high': 'high', 
                    'medium': 'medium',
                    'low': 'low'
                }
                
                emergency_severity = emergency_result.get('severity', 'medium')
                status.update({
                    'level': 'emergency' if emergency_severity == 'critical' else 'warning',
                    'severity': severity_map.get(emergency_severity, 'medium'),
                    'confidence': confidence,
                    'primary_concern': f"Potential {emergency_type.replace('_', ' ')} detected",
                    'summary': f"Emergency classification: {emergency_type} (confidence: {confidence:.2f})"
                })
                return status
        
        # Check anomaly detection
        if anomaly_result:
            is_anomaly = anomaly_result.get('is_anomaly', False)
            risk_level = anomaly_result.get('risk_level', 'normal')
            
            if is_anomaly and risk_level in ['high', 'critical']:
                status.update({
                    'level': 'warning',
                    'severity': risk_level,
                    'confidence': anomaly_result.get('confidence', 0.7),
                    'primary_concern': 'Abnormal vital sign patterns detected',
                    'summary': f"Health anomaly detected - risk level: {risk_level}"
                })
                return status
        
        # Check risk prediction
        if risk_result:
            risk_score = risk_result.get('overall_risk_score', 0)
            risk_level = risk_result.get('risk_level', 'minimal')
            
            if risk_score > 0.6:
                status.update({
                    'level': 'caution',
                    'severity': risk_level,
                    'confidence': risk_result.get('confidence', 0.7),
                    'primary_concern': 'Elevated risk for future health events',
                    'summary': f"Increased health risk detected - level: {risk_level}"
                })
                return status
        
        return status
    
    def _log_analysis(self, device_id: str, analysis_result: Dict[str, Any]):
        """Log analysis results"""
        status = analysis_result.get('overall_status', {})
        severity = status.get('severity', 'normal')
        
        if severity in ['critical', 'high']:
            self.logger.warning(
                f"Device {device_id}: {severity.upper()} - {status.get('summary', 'Unknown issue')}"
            )
        elif severity in ['medium', 'low']:
            self.logger.info(
                f"Device {device_id}: {severity.upper()} - {status.get('summary', 'Health concern')}"
            )
        else:
            self.logger.debug(f"Device {device_id}: Normal health status")
    
    def _create_error_response(self, device_id: str, error_message: str) -> Dict[str, Any]:
        """Create error response when analysis fails"""
        return {
            'device_id': device_id,
            'overall_status': {
                'level': 'error',
                'severity': 'unknown',
                'confidence': 0.0,
                'primary_concern': 'Analysis failed',
                'summary': f"Health analysis error: {error_message}"
            },
            'immediate_alerts': [],
            'recommendations': ['Contact technical support', 'Retry health monitoring'],
            'requires_emergency_response': False,
            'confidence_score': 0.0,
            'analysis_timestamp': datetime.now().isoformat(),
            'ai_models_enabled': self.enable_ai_models,
            'error': error_message
        }
    
    def get_patient_health_summary(self, device_id: str, days: int = 7) -> Dict[str, Any]:
        """Get comprehensive health summary for a patient over specified days"""
        if device_id not in self.health_history:
            return {'error': 'No health data available for this device'}
        
        # Get recent data
        cutoff_date = datetime.now() - timedelta(days=days)
        recent_data = []
        
        for record in self.health_history[device_id]:
            record_time = datetime.fromisoformat(record['timestamp'])
            if record_time > cutoff_date:
                recent_data.append(record)
        
        if not recent_data:
            return {'error': 'No recent health data available'}
        
        # Calculate statistics
        summary = self._calculate_health_statistics(recent_data)
        summary.update({
            'device_id': device_id,
            'summary_period_days': days,
            'total_readings': len(recent_data),
            'first_reading': recent_data[0]['timestamp'],
            'last_reading': recent_data[-1]['timestamp'],
            'generated_at': datetime.now().isoformat()
        })
        
        return summary
    
    def _calculate_health_statistics(self, health_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate comprehensive health statistics"""
        if not health_data:
            return {}
        
        # Extract vital signs
        vitals = {
            'heart_rate': [],
            'temperature': [],
            'systolic_bp': [],
            'diastolic_bp': [],
            'spo2': [],
            'respiratory_rate': []
        }
        
        for record in health_data:
            for vital in vitals.keys():
                if vital in record and record[vital] is not None:
                    vitals[vital].append(record[vital])
        
        # Calculate statistics for each vital
        statistics = {}
        for vital, values in vitals.items():
            if values:
                statistics[vital] = {
                    'average': sum(values) / len(values),
                    'minimum': min(values),
                    'maximum': max(values),
                    'readings_count': len(values)
                }
        
        return {
            'vital_signs_summary': statistics,
            'health_trends': self._analyze_trends(vitals),
            'alert_frequency': self._calculate_alert_frequency(health_data),
            'overall_health_score': self._calculate_overall_health_score(statistics)
        }
    
    def _analyze_trends(self, vitals: Dict[str, List[float]]) -> Dict[str, str]:
        """Analyze trends in vital signs"""
        trends = {}
        
        for vital, values in vitals.items():
            if len(values) >= 5:  # Need at least 5 readings for trend
                # Simple trend analysis using first and last quartiles
                first_quarter = values[:len(values)//4] if len(values) >= 4 else values[:1]
                last_quarter = values[-len(values)//4:] if len(values) >= 4 else values[-1:]
                
                avg_first = sum(first_quarter) / len(first_quarter)
                avg_last = sum(last_quarter) / len(last_quarter)
                
                if avg_last > avg_first * 1.05:  # 5% increase
                    trends[vital] = 'increasing'
                elif avg_last < avg_first * 0.95:  # 5% decrease
                    trends[vital] = 'decreasing'
                else:
                    trends[vital] = 'stable'
            else:
                trends[vital] = 'insufficient_data'
        
        return trends
    
    def _calculate_alert_frequency(self, health_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate frequency of health alerts"""
        # This would be more sophisticated in a real implementation
        return {
            'total_readings': len(health_data),
            'estimated_alerts': len(health_data) // 20,  # Rough estimate
            'alert_rate_percentage': 5.0  # Placeholder
        }
    
    def _calculate_overall_health_score(self, statistics: Dict[str, Any]) -> float:
        """Calculate overall health score (0-100)"""
        if not statistics:
            return 50.0  # Neutral score
        
        # Simple scoring based on how close vitals are to normal ranges
        normal_ranges = {
            'heart_rate': (60, 100),
            'temperature': (36.1, 37.2),
            'systolic_bp': (90, 140),
            'diastolic_bp': (60, 90),
            'spo2': (95, 100),
            'respiratory_rate': (12, 20)
        }
        
        scores = []
        for vital, ranges in normal_ranges.items():
            if vital in statistics:
                avg_value = statistics[vital]['average']
                min_normal, max_normal = ranges
                
                if min_normal <= avg_value <= max_normal:
                    scores.append(100)  # Perfect score
                else:
                    # Calculate how far outside normal range
                    if avg_value < min_normal:
                        deviation = (min_normal - avg_value) / min_normal
                    else:
                        deviation = (avg_value - max_normal) / max_normal
                    
                    # Score decreases with deviation
                    score = max(0, 100 - (deviation * 100))
                    scores.append(score)
        
        return sum(scores) / len(scores) if scores else 50.0

    def predict_health_risks(self, patient_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Predict health risks based on historical patient data
        """
        try:
            if len(patient_data) < 5:
                return {
                    'overall_risk': 'insufficient_data',
                    'risk_score': 0.0,
                    'message': 'Need at least 5 data points for risk prediction'
                }
            
            # Calculate basic risk indicators
            latest_data = patient_data[-1]
            
            # Risk factors based on vital trends
            risk_factors = []
            risk_score = 0.0
            
            # Heart rate trends
            hr_values = [d.get('heartRate', 0) for d in patient_data[-10:]]
            if any(hr > 120 for hr in hr_values):
                risk_factors.append('elevated_heart_rate')
                risk_score += 0.2
            
            # Temperature trends
            temp_values = [d.get('temperature', 36.5) for d in patient_data[-10:]]
            if any(temp > 38.0 for temp in temp_values):
                risk_factors.append('fever_pattern')
                risk_score += 0.3
            
            # Blood pressure trends
            sys_values = [d.get('bloodPressureSystolic', 120) for d in patient_data[-10:]]
            if any(sys > 160 for sys in sys_values):
                risk_factors.append('hypertension_risk')
                risk_score += 0.4
            
            # Oxygen saturation
            spo2_values = [d.get('oxygenSaturation', 98) for d in patient_data[-10:]]
            if any(spo2 < 94 for spo2 in spo2_values):
                risk_factors.append('respiratory_concern')
                risk_score += 0.5
            
            # Determine overall risk level
            if risk_score >= 0.7:
                overall_risk = 'high'
            elif risk_score >= 0.4:
                overall_risk = 'medium'
            elif risk_score >= 0.2:
                overall_risk = 'low'
            else:
                overall_risk = 'minimal'
            
            return {
                'overall_risk': overall_risk,
                'risk_score': min(risk_score, 1.0),
                'risk_factors': risk_factors,
                'recommendations': self._get_risk_recommendations(overall_risk, risk_factors),
                'prediction_confidence': 0.75,
                'data_points_analyzed': len(patient_data)
            }
            
        except Exception as e:
            self.logger.error(f"Risk prediction failed: {e}")
            return {
                'overall_risk': 'error',
                'risk_score': 0.0,
                'message': f'Risk prediction failed: {str(e)}'
            }
    
    def analyze_health_trends(self, patient_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze health trends over time
        """
        try:
            if len(patient_data) < 10:
                return {
                    'status': 'insufficient_data',
                    'message': 'Need at least 10 data points for trend analysis'
                }
            
            trends = {}
            
            # Analyze each vital sign trend
            vitals = ['heartRate', 'temperature', 'bloodPressureSystolic', 'oxygenSaturation']
            
            for vital in vitals:
                values = [d.get(vital, 0) for d in patient_data if vital in d]
                if len(values) >= 5:
                    trends[vital] = self._calculate_trend(values)
            
            # Overall health trajectory
            improving_trends = sum(1 for trend in trends.values() if trend.get('direction') == 'improving')
            stable_trends = sum(1 for trend in trends.values() if trend.get('direction') == 'stable')
            declining_trends = sum(1 for trend in trends.values() if trend.get('direction') == 'declining')
            
            if improving_trends > declining_trends:
                overall_trajectory = 'improving'
            elif declining_trends > improving_trends:
                overall_trajectory = 'declining'
            else:
                overall_trajectory = 'stable'
            
            return {
                'overall_trajectory': overall_trajectory,
                'vital_trends': trends,
                'trend_summary': {
                    'improving': improving_trends,
                    'stable': stable_trends,
                    'declining': declining_trends
                },
                'analysis_period': len(patient_data),
                'last_updated': datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Trend analysis failed: {e}")
            return {
                'status': 'error',
                'message': f'Trend analysis failed: {str(e)}'
            }
    
    def retrain_models(self, training_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Retrain AI models with new data
        """
        try:
            if len(training_data) < 50:
                return {
                    'status': 'insufficient_data',
                    'message': 'Need at least 50 data points for retraining'
                }
            
            retrain_results = {}
            
            # Retrain each model if available
            if self.anomaly_detector:
                try:
                    if hasattr(self.anomaly_detector, 'retrain'):
                        result = self.anomaly_detector.retrain(training_data)
                        retrain_results['anomaly_detector'] = result
                    else:
                        retrain_results['anomaly_detector'] = 'Retrain method not available'
                except Exception as e:
                    retrain_results['anomaly_detector'] = f'Failed: {str(e)}'
            
            if self.emergency_classifier:
                try:
                    if hasattr(self.emergency_classifier, 'retrain'):
                        result = self.emergency_classifier.retrain(training_data)
                        retrain_results['emergency_classifier'] = result
                    else:
                        retrain_results['emergency_classifier'] = 'Retrain method not available'
                except Exception as e:
                    retrain_results['emergency_classifier'] = f'Failed: {str(e)}'
            
            if self.risk_predictor:
                try:
                    if hasattr(self.risk_predictor, 'retrain'):
                        result = self.risk_predictor.retrain(training_data)
                        retrain_results['risk_predictor'] = result
                    else:
                        retrain_results['risk_predictor'] = 'Retrain method not available'
                except Exception as e:
                    retrain_results['risk_predictor'] = f'Failed: {str(e)}'
            
            return {
                'status': 'completed',
                'training_data_size': len(training_data),
                'model_results': retrain_results,
                'retrain_timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Model retraining failed: {e}")
            return {
                'status': 'error',
                'message': f'Retraining failed: {str(e)}'
            }
    
    def generate_emergency_scenario(self, emergency_type: str) -> Dict[str, Any]:
        """
        Generate emergency health data for testing
        """
        emergency_scenarios = {
            'cardiac_stress': {
                'heartRate': 145,
                'temperature': 37.8,
                'bloodPressureSystolic': 170,
                'bloodPressureDiastolic': 105,
                'oxygenSaturation': 92,
                'respiratoryRate': 28
            },
            'hyperthermia': {
                'heartRate': 120,
                'temperature': 40.2,
                'bloodPressureSystolic': 155,
                'bloodPressureDiastolic': 95,
                'oxygenSaturation': 94,
                'respiratoryRate': 24
            },
            'respiratory_distress': {
                'heartRate': 110,
                'temperature': 37.5,
                'bloodPressureSystolic': 140,
                'bloodPressureDiastolic': 85,
                'oxygenSaturation': 87,
                'respiratoryRate': 32
            },
            'fall_detected': {
                'heartRate': 130,
                'temperature': 36.8,
                'bloodPressureSystolic': 160,
                'bloodPressureDiastolic': 98,
                'oxygenSaturation': 95,
                'accelerometerData': {'impact': True, 'magnitude': 8.5}
            }
        }
        
        return emergency_scenarios.get(emergency_type, emergency_scenarios['cardiac_stress'])
    
    def _calculate_trend(self, values: List[float]) -> Dict[str, Any]:
        """Calculate trend direction and statistics for a series of values"""
        if len(values) < 2:
            return {'direction': 'unknown', 'change': 0}
        
        # Simple trend calculation
        recent_avg = sum(values[-3:]) / len(values[-3:])
        older_avg = sum(values[:3]) / len(values[:3])
        
        change_percent = ((recent_avg - older_avg) / older_avg) * 100 if older_avg != 0 else 0
        
        if abs(change_percent) < 5:
            direction = 'stable'
        elif change_percent > 0:
            direction = 'increasing'
        else:
            direction = 'decreasing'
        
        # Determine if increasing/decreasing is good or bad based on the vital
        if direction == 'increasing':
            trend_quality = 'concerning'  # Generally, increasing vitals are concerning
        elif direction == 'decreasing':
            trend_quality = 'improving'  # Generally, decreasing abnormal vitals is good
        else:
            trend_quality = 'stable'
        
        return {
            'direction': trend_quality,
            'change_percent': round(change_percent, 2),
            'recent_average': round(recent_avg, 2),
            'historical_average': round(older_avg, 2)
        }
    
    def _get_risk_recommendations(self, risk_level: str, risk_factors: List[str]) -> List[str]:
        """Get recommendations based on risk level and factors"""
        recommendations = []
        
        if risk_level == 'high':
            recommendations.append('Immediate medical attention recommended')
            recommendations.append('Contact emergency services if symptoms worsen')
        elif risk_level == 'medium':
            recommendations.append('Monitor vitals closely')
            recommendations.append('Consider consulting healthcare provider')
        
        if 'elevated_heart_rate' in risk_factors:
            recommendations.append('Reduce physical activity and stress')
        
        if 'fever_pattern' in risk_factors:
            recommendations.append('Stay hydrated and monitor temperature')
        
        if 'hypertension_risk' in risk_factors:
            recommendations.append('Reduce sodium intake and monitor blood pressure')
        
        if 'respiratory_concern' in risk_factors:
            recommendations.append('Ensure adequate ventilation and avoid pollutants')
        
        return recommendations

# Simulation mode for when AI dependencies are not available
class HealthMonitorSimulation(HealthMonitor):
    """Simulation version of HealthMonitor for demo purposes"""
    
    def __init__(self):
        super().__init__(enable_ai_models=False)
        self.logger.info("Running in simulation mode - AI models disabled")
    
    def analyze_health_data(self, device_id: str, health_data: Dict[str, Any]) -> Dict[str, Any]:
        """Simplified analysis using rule-based approach"""
        analysis_start_time = datetime.now()
        
        # Store health data
        self._store_health_data(device_id, health_data)
        
        # Basic checks
        immediate_alerts = self._check_immediate_alerts(health_data)
        
        # Simulate AI analysis results
        simulated_analysis = self._simulate_ai_analysis(health_data)
        
        # Combine results
        analysis_result = self._combine_analysis_results(
            health_data, immediate_alerts, 
            simulated_analysis['anomaly'], 
            simulated_analysis['emergency'], 
            simulated_analysis['risk']
        )
        
        # Add metadata
        analysis_result.update({
            'device_id': device_id,
            'analysis_timestamp': analysis_start_time.isoformat(),
            'processing_time_ms': (datetime.now() - analysis_start_time).total_seconds() * 1000,
            'ai_models_enabled': False,
            'simulation_mode': True
        })
        
        return analysis_result
    
    def _simulate_ai_analysis(self, health_data: Dict[str, Any]) -> Dict[str, Any]:
        """Simulate AI analysis results for demo purposes"""
        hr = health_data.get('heart_rate', 70)
        temp = health_data.get('temperature', 36.8)
        spo2 = health_data.get('spo2', 98)
        
        # Simple rule-based simulation
        is_concerning = hr > 100 or hr < 50 or temp > 38 or temp < 35 or spo2 < 95
        
        if is_concerning:
            risk_score = 0.7
            risk_level = 'high'
            emergency_type = 'respiratory_distress' if spo2 < 95 else 'tachycardia' if hr > 100 else 'fever'
        else:
            risk_score = 0.2
            risk_level = 'low'
            emergency_type = 'normal'
        
        return {
            'anomaly': {
                'is_anomaly': is_concerning,
                'risk_score': risk_score * 100,
                'risk_level': risk_level,
                'recommendations': ['Monitor closely'] if is_concerning else ['Continue normal monitoring']
            },
            'emergency': {
                'predicted_emergency': emergency_type,
                'confidence': 0.8 if is_concerning else 0.9,
                'severity': 'high' if is_concerning else 'normal',
                'recommended_actions': ['Seek medical attention'] if is_concerning else ['Continue monitoring']
            },
            'risk': {
                'overall_risk_score': risk_score,
                'risk_level': risk_level,
                'confidence': 0.8,
                'recommendations': ['Contact healthcare provider'] if is_concerning else ['Maintain healthy habits']
            }
        }

# Factory function to create appropriate monitor instance
def create_health_monitor(enable_ai=True):
    """
    Create a HealthMonitor instance.
    Falls back to simulation mode if AI dependencies are not available.
    """
    try:
        if enable_ai and HealthAnomalyDetector:
            return HealthMonitor(enable_ai_models=True)
        else:
            return HealthMonitorSimulation()
    except Exception as e:
        print(f"Could not create AI-enabled monitor: {e}")
        print("Falling back to simulation mode")
        return HealthMonitorSimulation()

# Demo usage
if __name__ == "__main__":
    # Create health monitor
    monitor = create_health_monitor()
    
    # Test with sample health data
    test_data = {
        'heart_rate': 85,
        'temperature': 37.2,
        'systolic_bp': 145,
        'diastolic_bp': 92,
        'spo2': 96,
        'respiratory_rate': 18,
        'activity_level': 1,
        'stress_level': 6
    }
    
    print("Analyzing health data...")
    result = monitor.analyze_health_data('demo-device-001', test_data)
    
    print(f"\nOverall Status: {result['overall_status']['level']} ({result['overall_status']['severity']})")
    print(f"Summary: {result['overall_status']['summary']}")
    print(f"Emergency Response Required: {result['requires_emergency_response']}")
    
    if result['immediate_alerts']:
        print(f"\nImmediate Alerts: {len(result['immediate_alerts'])}")
        for alert in result['immediate_alerts']:
            print(f"  • {alert['message']}")
    
    print(f"\nRecommendations:")
    for rec in result['recommendations'][:5]:
        print(f"  • {rec}")
    
    print(f"\nAnalysis completed in {result['processing_time_ms']:.2f}ms")
    print(f"AI Models Enabled: {result['ai_models_enabled']}")
    
    if 'simulation_mode' in result:
        print("Running in simulation mode for demo purposes")
    
    print("\nRescue.net AI Health Monitor is ready for real-time health monitoring!")
