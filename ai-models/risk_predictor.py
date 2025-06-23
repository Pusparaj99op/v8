# Risk Predictor for Rescue.net AI
# Predicts probability of medical emergencies in the next 1-24 hours
# Uses time series analysis and gradient boosting for accurate predictions

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import json
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

class RiskPredictor:
    """
    Predicts emergency risk probability based on health trends and patterns.
    Provides early warning system for medical emergencies.
    """
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.risk_model = None
        self.is_trained = False
        
        # Time windows for prediction (in hours)
        self.prediction_windows = [1, 6, 12, 24]
        
        # Feature categories
        self.vital_features = [
            'heart_rate_avg', 'heart_rate_trend', 'heart_rate_variability',
            'temperature_avg', 'temperature_trend',
            'bp_systolic_avg', 'bp_systolic_trend',
            'bp_diastolic_avg', 'bp_diastolic_trend',
            'spo2_avg', 'spo2_trend',
            'respiratory_rate_avg', 'respiratory_rate_trend'
        ]
        
        self.behavioral_features = [
            'activity_level_avg', 'sleep_quality', 'stress_level_avg',
            'medication_adherence', 'fall_frequency'
        ]
        
        self.environmental_features = [
            'ambient_temperature', 'humidity', 'air_quality',
            'time_of_day', 'day_of_week'
        ]
        
        self.all_features = (self.vital_features + 
                           self.behavioral_features + 
                           self.environmental_features)
    
    def calculate_health_trends(self, health_history):
        """Calculate trends and patterns from health history"""
        if len(health_history) < 5:
            # Not enough data for trend analysis
            return self._get_default_trends()
        
        df = pd.DataFrame(health_history)
        
        trends = {}
        
        # Calculate trends for vital signs
        for vital in ['heart_rate', 'temperature', 'systolic_bp', 'diastolic_bp', 'spo2', 'respiratory_rate']:
            if vital in df.columns:
                values = df[vital].dropna()
                if len(values) >= 3:
                    # Calculate trend (slope)
                    x = np.arange(len(values))
                    trend = np.polyfit(x, values, 1)[0]
                    
                    trends[f'{vital}_avg'] = float(values.mean())
                    trends[f'{vital}_trend'] = float(trend)
                    
                    if vital == 'heart_rate':
                        # Calculate heart rate variability
                        trends['heart_rate_variability'] = float(values.std())
        
        return trends
    
    def _get_default_trends(self):
        """Return default trends when insufficient data"""
        return {
            'heart_rate_avg': 70.0,
            'heart_rate_trend': 0.0,
            'heart_rate_variability': 5.0,
            'temperature_avg': 36.8,
            'temperature_trend': 0.0,
            'bp_systolic_avg': 120.0,
            'bp_systolic_trend': 0.0,
            'bp_diastolic_avg': 80.0,
            'bp_diastolic_trend': 0.0,
            'spo2_avg': 98.0,
            'spo2_trend': 0.0,
            'respiratory_rate_avg': 16.0,
            'respiratory_rate_trend': 0.0
        }
    
    def generate_risk_training_data(self, n_samples=20000):
        """Generate synthetic data for risk prediction training"""
        np.random.seed(42)
        
        data = []
        risk_scores = []
        
        for _ in range(n_samples):
            # Generate base health profile
            sample = self._generate_health_profile()
            
            # Calculate risk score based on profile
            risk_score = self._calculate_risk_from_profile(sample)
            
            data.append(sample)
            risk_scores.append(risk_score)
        
        return np.array(data), np.array(risk_scores)
    
    def _generate_health_profile(self):
        """Generate a realistic health profile"""
        # Determine if this is a high-risk profile
        is_high_risk = np.random.random() < 0.15  # 15% high risk profiles
        
        if is_high_risk:
            # Generate concerning health trends
            profile = [
                # Vital sign averages and trends
                np.random.normal(95, 20),      # heart_rate_avg (elevated)
                np.random.normal(2, 3),        # heart_rate_trend (increasing)
                np.random.normal(15, 8),       # heart_rate_variability (high)
                np.random.normal(37.8, 1),     # temperature_avg (elevated)
                np.random.normal(0.5, 0.3),    # temperature_trend (increasing)
                np.random.normal(145, 25),     # bp_systolic_avg (high)
                np.random.normal(1.5, 2),      # bp_systolic_trend (increasing)
                np.random.normal(95, 15),      # bp_diastolic_avg (high)
                np.random.normal(1, 1.5),      # bp_diastolic_trend (increasing)
                np.random.normal(94, 5),       # spo2_avg (low)
                np.random.normal(-0.5, 0.5),   # spo2_trend (decreasing)
                np.random.normal(20, 5),       # respiratory_rate_avg (high)
                np.random.normal(0.8, 1),      # respiratory_rate_trend (increasing)
                
                # Behavioral factors
                np.random.normal(1, 0.5),      # activity_level_avg (low)
                np.random.normal(3, 1.5),      # sleep_quality (poor)
                np.random.normal(7, 2),        # stress_level_avg (high)
                np.random.normal(0.6, 0.3),    # medication_adherence (poor)
                np.random.normal(2, 1.5),      # fall_frequency (high)
                
                # Environmental factors
                np.random.normal(32, 8),       # ambient_temperature
                np.random.normal(65, 15),      # humidity
                np.random.normal(120, 30),     # air_quality (poor)
                np.random.randint(0, 24),      # time_of_day
                np.random.randint(0, 7),       # day_of_week
            ]
        else:
            # Generate normal health profile
            profile = [
                # Vital sign averages and trends
                np.random.normal(72, 12),      # heart_rate_avg (normal)
                np.random.normal(0, 1),        # heart_rate_trend (stable)
                np.random.normal(8, 3),        # heart_rate_variability (normal)
                np.random.normal(36.8, 0.5),   # temperature_avg (normal)
                np.random.normal(0, 0.2),      # temperature_trend (stable)
                np.random.normal(118, 15),     # bp_systolic_avg (normal)
                np.random.normal(0, 1),        # bp_systolic_trend (stable)
                np.random.normal(78, 10),      # bp_diastolic_avg (normal)
                np.random.normal(0, 0.5),      # bp_diastolic_trend (stable)
                np.random.normal(98, 2),       # spo2_avg (normal)
                np.random.normal(0, 0.3),      # spo2_trend (stable)
                np.random.normal(16, 3),       # respiratory_rate_avg (normal)
                np.random.normal(0, 0.5),      # respiratory_rate_trend (stable)
                
                # Behavioral factors
                np.random.normal(2, 0.8),      # activity_level_avg (moderate)
                np.random.normal(7, 1.5),      # sleep_quality (good)
                np.random.normal(4, 2),        # stress_level_avg (moderate)
                np.random.normal(0.9, 0.1),    # medication_adherence (good)
                np.random.normal(0.1, 0.3),    # fall_frequency (low)
                
                # Environmental factors
                np.random.normal(25, 5),       # ambient_temperature
                np.random.normal(45, 10),      # humidity
                np.random.normal(50, 20),      # air_quality (good)
                np.random.randint(0, 24),      # time_of_day
                np.random.randint(0, 7),       # day_of_week
            ]
        
        return profile
    
    def _calculate_risk_from_profile(self, profile):
        """Calculate risk score (0-1) from health profile"""
        # Extract features
        hr_avg, hr_trend, hr_var = profile[0], profile[1], profile[2]
        temp_avg, temp_trend = profile[3], profile[4]
        bp_sys_avg, bp_sys_trend = profile[5], profile[6]
        bp_dia_avg, bp_dia_trend = profile[7], profile[8]
        spo2_avg, spo2_trend = profile[9], profile[10]
        resp_avg, resp_trend = profile[11], profile[12]
        
        activity_avg = profile[13]
        sleep_quality = profile[14]
        stress_avg = profile[15]
        med_adherence = profile[16]
        fall_freq = profile[17]
        
        # Calculate individual risk components
        risk_components = []
        
        # Heart rate risks
        if hr_avg > 100 or hr_avg < 50:
            risk_components.append(0.3)
        if hr_trend > 2:  # Increasing trend
            risk_components.append(0.2)
        if hr_var > 15:  # High variability
            risk_components.append(0.15)
        
        # Temperature risks
        if temp_avg > 38 or temp_avg < 35:
            risk_components.append(0.25)
        if temp_trend > 0.3:
            risk_components.append(0.1)
        
        # Blood pressure risks
        if bp_sys_avg > 160 or bp_sys_avg < 90:
            risk_components.append(0.3)
        if bp_dia_avg > 100 or bp_dia_avg < 60:
            risk_components.append(0.25)
        if bp_sys_trend > 2 or bp_dia_trend > 1.5:
            risk_components.append(0.15)
        
        # Oxygen saturation risks
        if spo2_avg < 95:
            risk_components.append(0.35)
        if spo2_trend < -0.3:
            risk_components.append(0.2)
        
        # Respiratory risks
        if resp_avg > 24 or resp_avg < 10:
            risk_components.append(0.2)
        if resp_trend > 1:
            risk_components.append(0.1)
        
        # Behavioral risks
        if activity_avg < 1:  # Very low activity
            risk_components.append(0.1)
        if sleep_quality < 5:  # Poor sleep
            risk_components.append(0.1)
        if stress_avg > 7:  # High stress
            risk_components.append(0.15)
        if med_adherence < 0.7:  # Poor medication adherence
            risk_components.append(0.2)
        if fall_freq > 1:  # Recent falls
            risk_components.append(0.25)
        
        # Calculate overall risk
        if not risk_components:
            base_risk = np.random.normal(0.05, 0.02)  # Very low risk
        else:
            base_risk = min(0.95, sum(risk_components))
        
        # Add some noise
        risk_score = max(0, min(1, base_risk + np.random.normal(0, 0.05)))
        
        return risk_score
    
    def train(self):
        """Train the risk prediction model"""
        print("Generating risk prediction training data...")
        X, y = self.generate_risk_training_data()
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42
        )
        
        print("Training Gradient Boosting risk model...")
        
        # Train model
        self.risk_model = GradientBoostingRegressor(
            n_estimators=200,
            learning_rate=0.1,
            max_depth=6,
            random_state=42
        )
        
        self.risk_model.fit(X_train, y_train)
        
        # Evaluate model
        train_pred = self.risk_model.predict(X_train)
        test_pred = self.risk_model.predict(X_test)
        
        train_r2 = r2_score(y_train, train_pred)
        test_r2 = r2_score(y_test, test_pred)
        train_rmse = np.sqrt(mean_squared_error(y_train, train_pred))
        test_rmse = np.sqrt(mean_squared_error(y_test, test_pred))
        
        print(f"Training R²: {train_r2:.3f}")
        print(f"Test R²: {test_r2:.3f}")
        print(f"Training RMSE: {train_rmse:.3f}")
        print(f"Test RMSE: {test_rmse:.3f}")
        
        # Feature importance
        feature_importance = self.risk_model.feature_importances_
        important_features = sorted(
            zip(self.all_features, feature_importance),
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        print("\nTop 10 Most Important Features:")
        for feature, importance in important_features:
            print(f"  {feature}: {importance:.3f}")
        
        self.is_trained = True
        print("Risk Predictor training completed!")
        
        return {
            'train_r2': train_r2,
            'test_r2': test_r2,
            'train_rmse': train_rmse,
            'test_rmse': test_rmse,
            'feature_importance': dict(important_features)
        }
    
    def predict_risk(self, current_health_data, health_history=None):
        """Predict emergency risk for multiple time windows"""
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
        
        # Calculate health trends
        if health_history:
            trends = self.calculate_health_trends(health_history)
        else:
            trends = self._get_default_trends()
        
        # Extract current behavioral and environmental factors
        behavioral_data = {
            'activity_level_avg': current_health_data.get('activity_level', 1),
            'sleep_quality': current_health_data.get('sleep_quality', 7),
            'stress_level_avg': current_health_data.get('stress_level', 3),
            'medication_adherence': current_health_data.get('medication_adherence', 0.9),
            'fall_frequency': current_health_data.get('fall_frequency', 0)
        }
        
        environmental_data = {
            'ambient_temperature': current_health_data.get('ambient_temperature', 25),
            'humidity': current_health_data.get('humidity', 45),
            'air_quality': current_health_data.get('air_quality', 50),
            'time_of_day': datetime.now().hour,
            'day_of_week': datetime.now().weekday()
        }
        
        # Combine all features
        feature_vector = []
        for feature in self.all_features:
            if feature in trends:
                feature_vector.append(trends[feature])
            elif feature in behavioral_data:
                feature_vector.append(behavioral_data[feature])
            elif feature in environmental_data:
                feature_vector.append(environmental_data[feature])
            else:
                feature_vector.append(0.0)  # Default value
        
        # Scale features
        features_scaled = self.scaler.transform([feature_vector])
        
        # Predict risk
        risk_score = self.risk_model.predict(features_scaled)[0]
        risk_score = max(0, min(1, risk_score))  # Clamp to [0, 1]
        
        # Calculate confidence based on feature consistency
        confidence = self._calculate_prediction_confidence(feature_vector)
        
        # Determine risk level
        risk_level = self._determine_risk_level(risk_score)
        
        # Generate recommendations
        recommendations = self._generate_risk_recommendations(risk_score, trends)
        
        # Calculate time-based predictions
        time_predictions = self._calculate_time_predictions(risk_score)
        
        result = {
            'overall_risk_score': float(risk_score),
            'risk_level': risk_level,
            'confidence': float(confidence),
            'time_predictions': time_predictions,
            'key_risk_factors': self._identify_risk_factors(feature_vector),
            'recommendations': recommendations,
            'next_assessment_time': (datetime.now() + timedelta(hours=6)).isoformat(),
            'timestamp': datetime.now().isoformat()
        }
        
        return result
    
    def _calculate_prediction_confidence(self, features):
        """Calculate confidence in prediction based on data quality"""
        # Check for missing or extreme values
        missing_count = sum(1 for f in features if f == 0.0)
        extreme_count = sum(1 for f in features if abs(f) > 3)  # Assuming normalized features
        
        # Calculate confidence (0-1)
        confidence = 1.0 - (missing_count * 0.05) - (extreme_count * 0.03)
        return max(0.5, min(1.0, confidence))
    
    def _determine_risk_level(self, risk_score):
        """Determine categorical risk level"""
        if risk_score >= 0.8:
            return 'critical'
        elif risk_score >= 0.6:
            return 'high'
        elif risk_score >= 0.4:
            return 'medium'
        elif risk_score >= 0.2:
            return 'low'
        else:
            return 'minimal'
    
    def _calculate_time_predictions(self, base_risk):
        """Calculate risk predictions for different time windows"""
        predictions = {}
        
        for window in self.prediction_windows:
            # Risk generally increases with time window
            time_factor = 1 + (window / 24) * 0.1  # 10% increase per day
            windowed_risk = min(0.95, base_risk * time_factor)
            
            predictions[f'{window}h'] = {
                'risk_score': float(windowed_risk),
                'risk_level': self._determine_risk_level(windowed_risk),
                'probability': float(windowed_risk * 100)
            }
        
        return predictions
    
    def _identify_risk_factors(self, features):
        """Identify top risk factors from feature vector"""
        if not self.is_trained:
            return []
        
        # Get feature importance from trained model
        importance = self.risk_model.feature_importances_
        
        # Find features with high importance and concerning values
        risk_factors = []
        
        for i, (feature_name, feature_value) in enumerate(zip(self.all_features, features)):
            if importance[i] > 0.05:  # Significant importance
                # Check if value is concerning
                concerning = self._is_concerning_value(feature_name, feature_value)
                if concerning:
                    risk_factors.append({
                        'factor': feature_name,
                        'importance': float(importance[i]),
                        'current_value': float(feature_value),
                        'concern_level': concerning
                    })
        
        # Sort by importance and return top 5
        risk_factors.sort(key=lambda x: x['importance'], reverse=True)
        return risk_factors[:5]
    
    def _is_concerning_value(self, feature_name, value):
        """Determine if a feature value is concerning"""
        # Define concerning thresholds for different features
        concerning_thresholds = {
            'heart_rate_avg': lambda x: 'high' if x > 100 else 'low' if x < 50 else None,
            'temperature_avg': lambda x: 'high' if x > 38 else 'low' if x < 35 else None,
            'bp_systolic_avg': lambda x: 'high' if x > 140 else 'low' if x < 90 else None,
            'bp_diastolic_avg': lambda x: 'high' if x > 90 else 'low' if x < 60 else None,
            'spo2_avg': lambda x: 'low' if x < 95 else None,
            'stress_level_avg': lambda x: 'high' if x > 7 else None,
            'medication_adherence': lambda x: 'low' if x < 0.7 else None,
        }
        
        if feature_name in concerning_thresholds:
            return concerning_thresholds[feature_name](value)
        
        return None
    
    def _generate_risk_recommendations(self, risk_score, trends):
        """Generate personalized recommendations based on risk assessment"""
        recommendations = []
        
        if risk_score >= 0.8:
            recommendations = [
                "URGENT: Contact healthcare provider immediately",
                "Monitor vital signs every 15 minutes",
                "Prepare for possible emergency",
                "Ensure emergency contacts are notified",
                "Have emergency medications ready"
            ]
        elif risk_score >= 0.6:
            recommendations = [
                "Contact healthcare provider today",
                "Monitor vital signs every hour",
                "Avoid strenuous activities",
                "Stay hydrated and rest",
                "Have someone stay with you"
            ]
        elif risk_score >= 0.4:
            recommendations = [
                "Schedule healthcare appointment within 24-48 hours",
                "Monitor vital signs every 2-3 hours",
                "Take prescribed medications as directed",
                "Reduce stress and get adequate rest",
                "Inform family members of your status"
            ]
        elif risk_score >= 0.2:
            recommendations = [
                "Continue regular health monitoring",
                "Follow medication schedule",
                "Maintain healthy lifestyle",
                "Monitor for symptom changes",
                "Stay in contact with healthcare provider"
            ]
        else:
            recommendations = [
                "Continue normal activities",
                "Maintain regular health monitoring",
                "Follow preventive care guidelines",
                "Keep emergency contacts updated"
            ]
        
        return recommendations
    
    def save_model(self, filepath_prefix='risk_predictor'):
        """Save trained model"""
        if not self.is_trained:
            raise ValueError("No trained model to save")
        
        joblib.dump(self.risk_model, f'{filepath_prefix}_model.pkl')
        joblib.dump(self.scaler, f'{filepath_prefix}_scaler.pkl')
        
        metadata = {
            'all_features': self.all_features,
            'prediction_windows': self.prediction_windows,
            'is_trained': self.is_trained,
            'trained_date': datetime.now().isoformat()
        }
        
        with open(f'{filepath_prefix}_metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"Risk Predictor saved with prefix: {filepath_prefix}")
    
    def load_model(self, filepath_prefix='risk_predictor'):
        """Load trained model"""
        try:
            self.risk_model = joblib.load(f'{filepath_prefix}_model.pkl')
            self.scaler = joblib.load(f'{filepath_prefix}_scaler.pkl')
            
            with open(f'{filepath_prefix}_metadata.json', 'r') as f:
                metadata = json.load(f)
            
            self.all_features = metadata['all_features']
            self.prediction_windows = metadata['prediction_windows']
            self.is_trained = metadata['is_trained']
            
            print(f"Risk Predictor loaded successfully from {filepath_prefix}")
            
        except Exception as e:
            print(f"Error loading model: {e}")
            self.is_trained = False
    
    def retrain(self, new_training_data):
        """
        Retrain the risk predictor with new data
        Args:
            new_training_data: List of health data dictionaries with risk labels
        Returns:
            Training results dictionary
        """
        try:
            print(f"Retraining risk predictor with {len(new_training_data)} samples...")
            
            if isinstance(new_training_data, list) and len(new_training_data) > 0:
                # Convert to DataFrame
                import pandas as pd
                df = pd.DataFrame(new_training_data)
                
                # Check for required columns
                required_features = ['heart_rate', 'temperature', 'systolic_bp', 'diastolic_bp', 'spo2', 'respiratory_rate']
                missing_cols = [col for col in required_features if col not in df.columns]
                
                if missing_cols:
                    return {'error': f'Missing required columns: {missing_cols}'}
                
                # Generate risk labels if not present
                if 'risk_score' not in df.columns:
                    # Simple risk scoring based on vital signs
                    df['risk_score'] = self._calculate_simple_risk_score(df)
                
                # Generate additional features if missing
                for feature in self.all_features:
                    if feature not in df.columns:
                        df[feature] = 0  # Default value
                
                # Prepare features and labels
                X = df[self.all_features].values
                y = df['risk_score'].values
                
                # Scale features
                X_scaled = self.scaler.fit_transform(X)
                
                # Retrain the model
                if self.risk_model is None:
                    # Initialize the model if not already done
                    from sklearn.ensemble import RandomForestRegressor
                    self.risk_model = RandomForestRegressor(
                        n_estimators=100, max_depth=10, random_state=42
                    )
                
                self.risk_model.fit(X_scaled, y)
                self.is_trained = True
                
                return {
                    'status': 'success',
                    'samples_used': len(new_training_data),
                    'feature_count': len(self.all_features),
                    'retrained_at': datetime.now().isoformat()
                }
            else:
                return {'error': 'Training data must be a non-empty list of dictionaries'}
                
        except Exception as e:
            return {'error': f'Retraining failed: {str(e)}'}
    
    def _calculate_simple_risk_score(self, df):
        """Calculate simple risk score for training data"""
        risk_scores = []
        for _, row in df.iterrows():
            score = 0
            
            # Heart rate risk
            if row.get('heart_rate', 70) > 100 or row.get('heart_rate', 70) < 60:
                score += 0.3
            
            # Temperature risk
            if row.get('temperature', 37) > 38.5 or row.get('temperature', 37) < 35:
                score += 0.3
            
            # Blood pressure risk
            if row.get('systolic_bp', 120) > 140 or row.get('systolic_bp', 120) < 90:
                score += 0.2
            
            # Oxygen saturation risk
            if row.get('spo2', 98) < 95:
                score += 0.2
            
            risk_scores.append(min(score, 1.0))  # Cap at 1.0
        
        return risk_scores

# Demo usage
if __name__ == "__main__":
    # Initialize and train model
    predictor = RiskPredictor()
    print("Training Risk Predictor...")
    results = predictor.train()
    
    # Test predictions
    test_data = {
        'heart_rate': 85,
        'temperature': 37.2,
        'systolic_bp': 145,
        'diastolic_bp': 92,
        'spo2': 96,
        'respiratory_rate': 18,
        'activity_level': 1,
        'stress_level': 6,
        'sleep_quality': 5,
        'medication_adherence': 0.8
    }
    
    # Simulate health history
    health_history = [
        {'heart_rate': 82, 'temperature': 36.9, 'systolic_bp': 140, 'diastolic_bp': 88, 'spo2': 97, 'respiratory_rate': 16},
        {'heart_rate': 84, 'temperature': 37.0, 'systolic_bp': 142, 'diastolic_bp': 90, 'spo2': 97, 'respiratory_rate': 17},
        {'heart_rate': 86, 'temperature': 37.1, 'systolic_bp': 143, 'diastolic_bp': 91, 'spo2': 96, 'respiratory_rate': 17},
        {'heart_rate': 85, 'temperature': 37.2, 'systolic_bp': 145, 'diastolic_bp': 92, 'spo2': 96, 'respiratory_rate': 18},
    ]
    
    print("\nPredicting emergency risk...")
    prediction = predictor.predict_risk(test_data, health_history)
    
    print(f"\nOverall Risk Score: {prediction['overall_risk_score']:.3f}")
    print(f"Risk Level: {prediction['risk_level']}")
    print(f"Confidence: {prediction['confidence']:.3f}")
    
    print("\nTime-based Predictions:")
    for window, pred in prediction['time_predictions'].items():
        print(f"  {window}: {pred['probability']:.1f}% ({pred['risk_level']})")
    
    print("\nKey Risk Factors:")
    for factor in prediction['key_risk_factors']:
        print(f"  • {factor['factor']}: {factor['concern_level']} (importance: {factor['importance']:.3f})")
    
    print("\nRecommendations:")
    for rec in prediction['recommendations']:
        print(f"  • {rec}")
    
    # Save model
    predictor.save_model()
    print("\nRisk Predictor saved successfully!")
