# Health Anomaly Detection Model for Rescue.net AI
# Detects unusual patterns in vital signs that may indicate medical emergencies
# Uses Isolation Forest and LSTM for real-time anomaly detection

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
import joblib
import json
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

class HealthAnomalyDetector:
    """
    Real-time health anomaly detection system for emergency prediction.
    Combines statistical and deep learning approaches for robust detection.
    """
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.isolation_forest = None
        self.lstm_model = None
        self.is_trained = False
        self.feature_names = [
            'heart_rate', 'temperature', 'systolic_bp', 
            'diastolic_bp', 'spo2', 'respiratory_rate'
        ]
        
    def preprocess_data(self, data):
        """Preprocess health data for model input"""
        if isinstance(data, dict):
            # Convert single reading to array
            features = [
                data.get('heart_rate', 70),
                data.get('temperature', 36.8),
                data.get('systolic_bp', 120),
                data.get('diastolic_bp', 80),
                data.get('spo2', 98),
                data.get('respiratory_rate', 16)
            ]
            return np.array(features).reshape(1, -1)
        
        return np.array(data)
    
    def generate_training_data(self, n_samples=10000):
        """Generate synthetic health data for training"""
        np.random.seed(42)
        
        # Normal health ranges
        normal_data = []
        for _ in range(int(n_samples * 0.8)):  # 80% normal data
            sample = [
                np.random.normal(75, 10),      # heart_rate
                np.random.normal(36.8, 0.5),   # temperature
                np.random.normal(120, 15),     # systolic_bp
                np.random.normal(80, 10),      # diastolic_bp
                np.random.normal(98, 2),       # spo2
                np.random.normal(16, 3)        # respiratory_rate
            ]
            normal_data.append(sample)
        
        # Anomalous data (emergency conditions)
        anomaly_data = []
        for _ in range(int(n_samples * 0.2)):  # 20% anomalous data
            # Simulate various emergency conditions
            emergency_type = np.random.choice(['tachycardia', 'fever', 'hypotension', 'hypoxia'])
            
            if emergency_type == 'tachycardia':
                sample = [
                    np.random.normal(150, 20),     # high heart rate
                    np.random.normal(36.8, 0.5),
                    np.random.normal(120, 15),
                    np.random.normal(80, 10),
                    np.random.normal(98, 2),
                    np.random.normal(16, 3)
                ]
            elif emergency_type == 'fever':
                sample = [
                    np.random.normal(75, 10),
                    np.random.normal(39.5, 1),     # high temperature
                    np.random.normal(120, 15),
                    np.random.normal(80, 10),
                    np.random.normal(98, 2),
                    np.random.normal(20, 5)        # increased respiratory rate
                ]
            elif emergency_type == 'hypotension':
                sample = [
                    np.random.normal(75, 10),
                    np.random.normal(36.8, 0.5),
                    np.random.normal(85, 10),      # low blood pressure
                    np.random.normal(55, 8),
                    np.random.normal(98, 2),
                    np.random.normal(16, 3)
                ]
            else:  # hypoxia
                sample = [
                    np.random.normal(90, 15),      # elevated heart rate
                    np.random.normal(36.8, 0.5),
                    np.random.normal(120, 15),
                    np.random.normal(80, 10),
                    np.random.normal(88, 5),       # low oxygen saturation
                    np.random.normal(22, 5)        # increased respiratory rate
                ]
            
            anomaly_data.append(sample)
        
        # Combine and create labels
        all_data = np.vstack([normal_data, anomaly_data])
        labels = np.concatenate([np.zeros(len(normal_data)), np.ones(len(anomaly_data))])
        
        return all_data, labels
    
    def train_isolation_forest(self, data):
        """Train Isolation Forest for anomaly detection"""
        print("Training Isolation Forest...")
        
        # Scale the data
        data_scaled = self.scaler.fit_transform(data)
        
        # Train Isolation Forest
        self.isolation_forest = IsolationForest(
            contamination=0.2,  # Expected proportion of anomalies
            random_state=42,
            n_estimators=100
        )
        
        self.isolation_forest.fit(data_scaled)
        print("Isolation Forest training completed!")
        
    def build_lstm_model(self, input_shape):
        """Build LSTM model for time series anomaly detection"""
        model = Sequential([
            LSTM(64, return_sequences=True, input_shape=input_shape),
            Dropout(0.2),
            LSTM(32, return_sequences=False),
            Dropout(0.2),
            Dense(16, activation='relu'),
            Dense(1, activation='sigmoid')  # Anomaly probability
        ])
        
        model.compile(
            optimizer='adam',
            loss='binary_crossentropy',
            metrics=['accuracy']
        )
        
        return model
    
    def create_sequences(self, data, labels, sequence_length=10):
        """Create sequences for LSTM training"""
        X, y = [], []
        
        for i in range(len(data) - sequence_length):
            X.append(data[i:(i + sequence_length)])
            y.append(labels[i + sequence_length])
        
        return np.array(X), np.array(y)
    
    def train_lstm(self, data, labels):
        """Train LSTM model for temporal anomaly detection"""
        print("Training LSTM model...")
        
        # Create sequences
        sequence_length = 10
        X_seq, y_seq = self.create_sequences(data, labels, sequence_length)
        
        # Build and train model
        self.lstm_model = self.build_lstm_model((sequence_length, data.shape[1]))
        
        history = self.lstm_model.fit(
            X_seq, y_seq,
            epochs=50,
            batch_size=32,
            validation_split=0.2,
            verbose=0
        )
        
        print("LSTM training completed!")
        return history
    
    def train(self):
        """Train both anomaly detection models"""
        print("Starting Health Anomaly Detector training...")
        
        # Generate training data
        data, labels = self.generate_training_data()
        
        # Train Isolation Forest
        self.train_isolation_forest(data)
        
        # Train LSTM
        lstm_history = self.train_lstm(data, labels)
        
        self.is_trained = True
        print("All models trained successfully!")
        
        return lstm_history
    
    def predict_anomaly(self, health_data):
        """Predict if health data contains anomalies"""
        if not self.is_trained:
            raise ValueError("Models must be trained before making predictions")
        
        # Preprocess data
        processed_data = self.preprocess_data(health_data)
        scaled_data = self.scaler.transform(processed_data)
        
        # Get Isolation Forest prediction
        if_prediction = self.isolation_forest.predict(scaled_data)[0]
        if_score = self.isolation_forest.decision_function(scaled_data)[0]
        
        # Convert IF output (-1 for anomaly, 1 for normal) to probability
        if_anomaly_prob = 1 / (1 + np.exp(if_score))  # Sigmoid transformation
        
        # Determine overall result
        is_anomaly = if_prediction == -1
        confidence = abs(if_score)
        
        # Generate risk assessment
        risk_level = self.assess_risk_level(health_data, if_anomaly_prob)
        
        result = {
            'is_anomaly': is_anomaly,
            'anomaly_probability': float(if_anomaly_prob),
            'confidence': float(confidence),
            'risk_level': risk_level,
            'risk_score': float(if_anomaly_prob * 100),
            'recommendations': self.generate_recommendations(health_data, risk_level),
            'timestamp': datetime.now().isoformat()
        }
        
        return result
    
    def assess_risk_level(self, health_data, anomaly_prob):
        """Assess risk level based on vital signs and anomaly probability"""
        if isinstance(health_data, dict):
            hr = health_data.get('heart_rate', 70)
            temp = health_data.get('temperature', 36.8)
            spo2 = health_data.get('spo2', 98)
        else:
            hr, temp, _, _, spo2, _ = health_data[0] if len(health_data.shape) > 1 else health_data
        
        # Critical thresholds
        if hr > 150 or hr < 40 or temp > 39 or spo2 < 90:
            return 'critical'
        elif anomaly_prob > 0.8:
            return 'high'
        elif anomaly_prob > 0.6:
            return 'medium'
        elif anomaly_prob > 0.3:
            return 'low'
        else:
            return 'normal'
    
    def generate_recommendations(self, health_data, risk_level):
        """Generate health recommendations based on risk assessment"""
        recommendations = []
        
        if risk_level == 'critical':
            recommendations = [
                "EMERGENCY: Seek immediate medical attention",
                "Call emergency services (108) immediately",
                "Monitor vital signs continuously"
            ]
        elif risk_level == 'high':
            recommendations = [
                "Contact healthcare provider immediately",
                "Monitor symptoms closely",
                "Avoid strenuous activities"
            ]
        elif risk_level == 'medium':
            recommendations = [
                "Consider consulting a healthcare provider",
                "Monitor vital signs regularly",
                "Stay hydrated and rest"
            ]
        elif risk_level == 'low':
            recommendations = [
                "Continue normal monitoring",
                "Maintain healthy lifestyle",
                "Stay hydrated"
            ]
        else:
            recommendations = [
                "Vital signs normal",
                "Continue regular health monitoring",
                "Maintain current health routine"
            ]
        
        return recommendations
    
    def save_models(self, filepath_prefix='health_anomaly_detector'):
        """Save trained models to disk"""
        if not self.is_trained:
            raise ValueError("No trained models to save")
        
        # Save Isolation Forest and scaler
        joblib.dump(self.isolation_forest, f'{filepath_prefix}_isolation_forest.pkl')
        joblib.dump(self.scaler, f'{filepath_prefix}_scaler.pkl')
        
        # Save LSTM model if trained
        if self.lstm_model:
            self.lstm_model.save(f'{filepath_prefix}_lstm.h5')
        
        # Save metadata
        metadata = {
            'feature_names': self.feature_names,
            'is_trained': self.is_trained,
            'trained_date': datetime.now().isoformat()
        }
        
        with open(f'{filepath_prefix}_metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"Models saved with prefix: {filepath_prefix}")
    
    def load_models(self, filepath_prefix='health_anomaly_detector'):
        """Load trained models from disk"""
        try:
            # Load Isolation Forest and scaler
            self.isolation_forest = joblib.load(f'{filepath_prefix}_isolation_forest.pkl')
            self.scaler = joblib.load(f'{filepath_prefix}_scaler.pkl')
            
            # Load metadata
            with open(f'{filepath_prefix}_metadata.json', 'r') as f:
                metadata = json.load(f)
            
            self.feature_names = metadata['feature_names']
            self.is_trained = metadata['is_trained']
            
            print(f"Models loaded successfully from {filepath_prefix}")
            
        except Exception as e:
            print(f"Error loading models: {e}")
            self.is_trained = False
    
    def retrain(self, new_training_data):
        """
        Retrain the models with new data
        Args:
            new_training_data: List of health data dictionaries
        Returns:
            Training results dictionary
        """
        try:
            print(f"Retraining anomaly detector with {len(new_training_data)} samples...")
            
            # Convert new data to DataFrame format
            if isinstance(new_training_data, list):
                import pandas as pd
                df = pd.DataFrame(new_training_data)
                
                # Ensure we have the required columns
                required_cols = ['heart_rate', 'temperature', 'systolic_bp', 'diastolic_bp', 'spo2', 'respiratory_rate']
                missing_cols = [col for col in required_cols if col not in df.columns]
                
                if missing_cols:
                    return {'error': f'Missing required columns: {missing_cols}'}
                
                # Retrain with new data
                processed_data = self.preprocess_data(df[required_cols])
                
                # Train Isolation Forest
                self.train_isolation_forest(processed_data)
                
                # Mark as trained
                self.is_trained = True
                
                return {
                    'status': 'success',
                    'samples_used': len(new_training_data),
                    'retrained_at': datetime.now().isoformat()
                }
            else:
                return {'error': 'Training data must be a list of dictionaries'}
                
        except Exception as e:
            return {'error': f'Retraining failed: {str(e)}'}

# Demo usage and testing
if __name__ == "__main__":
    # Initialize detector
    detector = HealthAnomalyDetector()
    
    # Train the models
    print("Training Health Anomaly Detection Models...")
    detector.train()
    
    # Test with normal health data
    normal_data = {
        'heart_rate': 72,
        'temperature': 36.9,
        'systolic_bp': 118,
        'diastolic_bp': 78,
        'spo2': 98,
        'respiratory_rate': 15
    }
    
    print("\nTesting with normal health data:")
    result = detector.predict_anomaly(normal_data)
    print(f"Risk Level: {result['risk_level']}")
    print(f"Anomaly Probability: {result['anomaly_probability']:.3f}")
    print(f"Recommendations: {result['recommendations']}")
    
    # Test with emergency data
    emergency_data = {
        'heart_rate': 155,  # Tachycardia
        'temperature': 39.2,  # Fever
        'systolic_bp': 85,   # Hypotension
        'diastolic_bp': 55,
        'spo2': 89,          # Hypoxia
        'respiratory_rate': 25
    }
    
    print("\nTesting with emergency health data:")
    result = detector.predict_anomaly(emergency_data)
    print(f"Risk Level: {result['risk_level']}")
    print(f"Anomaly Probability: {result['anomaly_probability']:.3f}")
    print(f"Recommendations: {result['recommendations']}")
    
    # Save the trained models
    detector.save_models()
    print("\nModels saved successfully!")
