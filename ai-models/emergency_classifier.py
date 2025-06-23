# Emergency Classifier for Rescue.net AI
# Classifies types of medical emergencies based on vital signs and symptoms
# Uses ensemble methods for high accuracy emergency detection

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.svm import SVC
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix
import joblib
import json
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')

class EmergencyClassifier:
    """
    Multi-class emergency classifier for medical conditions.
    Identifies specific types of emergencies from health data.
    """
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        self.ensemble_model = None
        self.is_trained = False
        
        # Emergency categories
        self.emergency_types = [
            'normal',
            'cardiac_arrest',
            'stroke', 
            'hyperthermia',
            'hypothermia',
            'severe_hypotension',
            'severe_hypertension',
            'respiratory_distress',
            'hypoglycemia',
            'seizure',
            'fall_detected',
            'medication_reaction'
        ]
        
        # Feature importance for interpretability
        self.feature_names = [
            'heart_rate', 'temperature', 'systolic_bp', 'diastolic_bp',
            'spo2', 'respiratory_rate', 'activity_level', 'fall_detected',
            'medication_taken', 'stress_level'
        ]
    
    def generate_emergency_training_data(self, n_samples=15000):
        """Generate synthetic emergency data for each category"""
        np.random.seed(42)
        
        data = []
        labels = []
        
        # Sample distribution across emergency types
        samples_per_type = n_samples // len(self.emergency_types)
        
        for emergency_type in self.emergency_types:
            for _ in range(samples_per_type):
                sample = self._generate_sample_for_emergency(emergency_type)
                data.append(sample)
                labels.append(emergency_type)
        
        return np.array(data), np.array(labels)
    
    def _generate_sample_for_emergency(self, emergency_type):
        """Generate realistic health data for specific emergency type"""
        
        if emergency_type == 'normal':
            return [
                np.random.normal(75, 10),      # heart_rate
                np.random.normal(36.8, 0.5),   # temperature
                np.random.normal(120, 15),     # systolic_bp
                np.random.normal(80, 10),      # diastolic_bp
                np.random.normal(98, 2),       # spo2
                np.random.normal(16, 3),       # respiratory_rate
                np.random.choice([0, 1, 2]),   # activity_level (0=low, 1=moderate, 2=high)
                0,                             # fall_detected
                np.random.choice([0, 1]),      # medication_taken
                np.random.normal(3, 2)         # stress_level (1-10)
            ]
        
        elif emergency_type == 'cardiac_arrest':
            return [
                np.random.choice([0, np.random.normal(200, 30)]),  # Very high or no pulse
                np.random.normal(36.5, 1),
                np.random.normal(60, 20),      # Low BP
                np.random.normal(40, 15),
                np.random.normal(85, 10),      # Low oxygen
                np.random.normal(25, 8),       # High respiratory rate
                0,                             # No activity
                np.random.choice([0, 1]),
                np.random.choice([0, 1]),
                np.random.normal(9, 1)         # High stress
            ]
        
        elif emergency_type == 'stroke':
            return [
                np.random.normal(90, 20),      # Irregular heart rate
                np.random.normal(37.2, 0.8),
                np.random.normal(180, 25),     # High BP
                np.random.normal(110, 15),
                np.random.normal(95, 5),
                np.random.normal(18, 4),
                0,                             # Reduced activity
                np.random.choice([0, 1]),
                np.random.choice([0, 1]),
                np.random.normal(8, 1)
            ]
        
        elif emergency_type == 'hyperthermia':
            return [
                np.random.normal(110, 15),     # High heart rate
                np.random.normal(40.5, 1.5),   # Very high temperature
                np.random.normal(100, 20),     # Low BP from dehydration
                np.random.normal(65, 12),
                np.random.normal(96, 3),
                np.random.normal(22, 5),       # High respiratory rate
                0,                             # Low activity
                0,
                np.random.choice([0, 1]),
                np.random.normal(7, 1)
            ]
        
        elif emergency_type == 'hypothermia':
            return [
                np.random.normal(45, 10),      # Very low heart rate
                np.random.normal(32, 2),       # Very low temperature
                np.random.normal(90, 15),      # Low BP
                np.random.normal(60, 10),
                np.random.normal(90, 8),       # Low oxygen
                np.random.normal(10, 3),       # Low respiratory rate
                0,                             # No activity
                0,
                np.random.choice([0, 1]),
                np.random.normal(8, 1)
            ]
        
        elif emergency_type == 'severe_hypotension':
            return [
                np.random.normal(110, 20),     # Compensatory tachycardia
                np.random.normal(36.5, 0.8),
                np.random.normal(70, 10),      # Very low systolic BP
                np.random.normal(45, 8),       # Very low diastolic BP
                np.random.normal(92, 5),       # Low oxygen
                np.random.normal(20, 5),
                0,
                0,
                np.random.choice([0, 1]),
                np.random.normal(7, 1)
            ]
        
        elif emergency_type == 'severe_hypertension':
            return [
                np.random.normal(95, 15),
                np.random.normal(37.5, 1),
                np.random.normal(200, 20),     # Very high systolic BP
                np.random.normal(120, 15),     # Very high diastolic BP
                np.random.normal(96, 3),
                np.random.normal(18, 4),
                1,
                0,
                np.random.choice([0, 1]),
                np.random.normal(8, 1)
            ]
        
        elif emergency_type == 'respiratory_distress':
            return [
                np.random.normal(100, 15),     # High heart rate
                np.random.normal(37, 1),
                np.random.normal(140, 20),     # High BP from stress
                np.random.normal(90, 12),
                np.random.normal(88, 8),       # Very low oxygen
                np.random.normal(30, 8),       # Very high respiratory rate
                0,
                0,
                np.random.choice([0, 1]),
                np.random.normal(9, 1)         # High stress
            ]
        
        elif emergency_type == 'hypoglycemia':
            return [
                np.random.normal(55, 12),      # Low heart rate
                np.random.normal(36.2, 0.8),   # Low temperature
                np.random.normal(100, 15),     # Low BP
                np.random.normal(65, 10),
                np.random.normal(95, 4),
                np.random.normal(14, 3),
                0,                             # Low activity
                np.random.choice([0, 1]),
                1,                             # Often medication related
                np.random.normal(6, 2)
            ]
        
        elif emergency_type == 'seizure':
            return [
                np.random.normal(130, 25),     # High heart rate during/after
                np.random.normal(37.8, 1.2),   # Elevated temperature
                np.random.normal(150, 25),     # High BP
                np.random.normal(95, 15),
                np.random.normal(93, 6),       # Low oxygen
                np.random.normal(22, 6),
                2,                             # High activity during seizure
                np.random.choice([0, 1]),
                np.random.choice([0, 1]),
                np.random.normal(9, 1)
            ]
        
        elif emergency_type == 'fall_detected':
            return [
                np.random.normal(85, 15),
                np.random.normal(36.8, 0.8),
                np.random.normal(130, 20),     # Elevated from stress/injury
                np.random.normal(85, 12),
                np.random.normal(96, 4),
                np.random.normal(18, 4),
                0,                             # No activity after fall
                1,                             # Fall detected
                np.random.choice([0, 1]),
                np.random.normal(7, 2)
            ]
        
        else:  # medication_reaction
            return [
                np.random.normal(120, 25),     # Variable heart rate
                np.random.normal(37.5, 1.5),   # Variable temperature
                np.random.normal(110, 30),     # Variable BP
                np.random.normal(75, 20),
                np.random.normal(94, 6),       # Reduced oxygen
                np.random.normal(20, 6),       # Elevated respiratory rate
                0,                             # Low activity
                0,
                1,                             # Medication taken
                np.random.normal(8, 1)         # High stress
            ]
    
    def train(self):
        """Train the emergency classification ensemble"""
        print("Generating emergency training data...")
        X, y = self.generate_emergency_training_data()
        
        # Encode labels
        y_encoded = self.label_encoder.fit_transform(y)
        
        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
        )
        
        print("Training ensemble models...")
        
        # Create ensemble of classifiers
        rf_classifier = RandomForestClassifier(
            n_estimators=200,
            max_depth=15,
            random_state=42,
            class_weight='balanced'
        )
        
        svm_classifier = SVC(
            kernel='rbf',
            probability=True,
            random_state=42,
            class_weight='balanced'
        )
        
        # Create voting ensemble
        self.ensemble_model = VotingClassifier(
            estimators=[
                ('rf', rf_classifier),
                ('svm', svm_classifier)
            ],
            voting='soft'  # Use probability predictions
        )
        
        # Train ensemble
        self.ensemble_model.fit(X_train, y_train)
        
        # Evaluate model
        train_score = self.ensemble_model.score(X_train, y_train)
        test_score = self.ensemble_model.score(X_test, y_test)
        
        print(f"Training Accuracy: {train_score:.3f}")
        print(f"Test Accuracy: {test_score:.3f}")
        
        # Cross-validation
        cv_scores = cross_val_score(self.ensemble_model, X_scaled, y_encoded, cv=5)
        print(f"Cross-validation Accuracy: {cv_scores.mean():.3f} (+/- {cv_scores.std() * 2:.3f})")
        
        # Detailed evaluation on test set
        y_pred = self.ensemble_model.predict(X_test)
        print("\nClassification Report:")
        print(classification_report(y_test, y_pred, target_names=self.emergency_types))
        
        self.is_trained = True
        print("Emergency Classifier training completed!")
        
        return {
            'train_accuracy': train_score,
            'test_accuracy': test_score,
            'cv_mean': cv_scores.mean(),
            'cv_std': cv_scores.std()
        }
    
    def predict_emergency(self, health_data):
        """Predict emergency type from health data"""
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
        
        # Preprocess data
        if isinstance(health_data, dict):
            features = [
                health_data.get('heart_rate', 70),
                health_data.get('temperature', 36.8),
                health_data.get('systolic_bp', 120),
                health_data.get('diastolic_bp', 80),
                health_data.get('spo2', 98),
                health_data.get('respiratory_rate', 16),
                health_data.get('activity_level', 1),
                health_data.get('fall_detected', 0),
                health_data.get('medication_taken', 0),
                health_data.get('stress_level', 3)
            ]
            features = np.array(features).reshape(1, -1)
        else:
            features = np.array(health_data).reshape(1, -1)
        
        # Scale features
        features_scaled = self.scaler.transform(features)
        
        # Make predictions
        prediction = self.ensemble_model.predict(features_scaled)[0]
        probabilities = self.ensemble_model.predict_proba(features_scaled)[0]
        
        # Get emergency type
        emergency_type = self.label_encoder.inverse_transform([prediction])[0]
        
        # Get confidence (maximum probability)
        confidence = np.max(probabilities)
        
        # Get top 3 most likely emergencies
        top_indices = np.argsort(probabilities)[-3:][::-1]
        top_emergencies = []
        
        for idx in top_indices:
            emergency_name = self.label_encoder.inverse_transform([idx])[0]
            probability = probabilities[idx]
            top_emergencies.append({
                'type': emergency_name,
                'probability': float(probability),
                'confidence': 'high' if probability > 0.7 else 'medium' if probability > 0.4 else 'low'
            })
        
        # Determine severity and actions
        severity = self._determine_severity(emergency_type, confidence)
        actions = self._get_emergency_actions(emergency_type)
        
        result = {
            'predicted_emergency': emergency_type,
            'confidence': float(confidence),
            'severity': severity,
            'top_predictions': top_emergencies,
            'recommended_actions': actions,
            'requires_immediate_attention': emergency_type != 'normal' and confidence > 0.6,
            'timestamp': datetime.now().isoformat()
        }
        
        return result
    
    def _determine_severity(self, emergency_type, confidence):
        """Determine severity level of predicted emergency"""
        critical_emergencies = ['cardiac_arrest', 'stroke', 'severe_hypotension', 'respiratory_distress']
        high_emergencies = ['severe_hypertension', 'hyperthermia', 'hypothermia', 'seizure']
        medium_emergencies = ['fall_detected', 'medication_reaction']
        
        if emergency_type in critical_emergencies and confidence > 0.7:
            return 'critical'
        elif emergency_type in critical_emergencies or (emergency_type in high_emergencies and confidence > 0.8):
            return 'high'
        elif emergency_type in high_emergencies or (emergency_type in medium_emergencies and confidence > 0.7):
            return 'medium'
        elif emergency_type != 'normal':
            return 'low'
        else:
            return 'normal'
    
    def _get_emergency_actions(self, emergency_type):
        """Get recommended actions for each emergency type"""
        actions = {
            'normal': [
                "Continue normal monitoring",
                "Maintain healthy lifestyle"
            ],
            'cardiac_arrest': [
                "CALL 108 IMMEDIATELY",
                "Begin CPR if trained",
                "Use AED if available",
                "Notify nearest hospital"
            ],
            'stroke': [
                "CALL 108 IMMEDIATELY",
                "Note time of symptom onset",
                "Keep patient calm and still",
                "Check for FAST symptoms"
            ],
            'hyperthermia': [
                "Move to cool environment",
                "Remove excess clothing",
                "Apply cool water to skin",
                "Seek immediate medical attention"
            ],
            'hypothermia': [
                "Move to warm environment",
                "Remove wet clothing",
                "Wrap in warm blankets",
                "Seek immediate medical attention"
            ],
            'severe_hypotension': [
                "Elevate legs",
                "Increase fluid intake if conscious",
                "Call emergency services",
                "Monitor vital signs"
            ],
            'severe_hypertension': [
                "Keep patient calm",
                "Avoid sudden movements",
                "Call emergency services",
                "Monitor for stroke symptoms"
            ],
            'respiratory_distress': [
                "Help patient sit upright",
                "Ensure airway is clear",
                "Call emergency services",
                "Use rescue inhaler if available"
            ],
            'hypoglycemia': [
                "Give glucose or sugar if conscious",
                "Call emergency services if severe",
                "Monitor blood sugar",
                "Contact healthcare provider"
            ],
            'seizure': [
                "Keep patient safe from injury",
                "Time the seizure",
                "Call 108 if seizure lasts >5 minutes",
                "Stay with patient until recovery"
            ],
            'fall_detected': [
                "Check for injuries",
                "Do not move if spinal injury suspected",
                "Call emergency services if needed",
                "Monitor vital signs"
            ],
            'medication_reaction': [
                "Stop suspected medication",
                "Call poison control or emergency services",
                "Note medication and time taken",
                "Monitor symptoms"
            ]
        }
        
        return actions.get(emergency_type, ["Seek medical attention"])
    
    def save_model(self, filepath_prefix='emergency_classifier'):
        """Save trained model to disk"""
        if not self.is_trained:
            raise ValueError("No trained model to save")
        
        # Save model components
        joblib.dump(self.ensemble_model, f'{filepath_prefix}_ensemble.pkl')
        joblib.dump(self.scaler, f'{filepath_prefix}_scaler.pkl')
        joblib.dump(self.label_encoder, f'{filepath_prefix}_label_encoder.pkl')
        
        # Save metadata
        metadata = {
            'emergency_types': self.emergency_types,
            'feature_names': self.feature_names,
            'is_trained': self.is_trained,
            'trained_date': datetime.now().isoformat()
        }
        
        with open(f'{filepath_prefix}_metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"Emergency Classifier saved with prefix: {filepath_prefix}")
    
    def load_model(self, filepath_prefix='emergency_classifier'):
        """Load trained model from disk"""
        try:
            # Load model components
            self.ensemble_model = joblib.load(f'{filepath_prefix}_ensemble.pkl')
            self.scaler = joblib.load(f'{filepath_prefix}_scaler.pkl')
            self.label_encoder = joblib.load(f'{filepath_prefix}_label_encoder.pkl')
            
            # Load metadata
            with open(f'{filepath_prefix}_metadata.json', 'r') as f:
                metadata = json.load(f)
            
            self.emergency_types = metadata['emergency_types']
            self.feature_names = metadata['feature_names']
            self.is_trained = metadata['is_trained']
            
            print(f"Emergency Classifier loaded successfully from {filepath_prefix}")
            
        except Exception as e:
            print(f"Error loading model: {e}")
            self.is_trained = False
    
    def retrain(self, new_training_data):
        """
        Retrain the emergency classifier with new data
        Args:
            new_training_data: List of health data dictionaries with emergency labels
        Returns:
            Training results dictionary
        """
        try:
            print(f"Retraining emergency classifier with {len(new_training_data)} samples...")
            
            if isinstance(new_training_data, list) and len(new_training_data) > 0:
                # Convert to DataFrame
                import pandas as pd
                df = pd.DataFrame(new_training_data)
                
                # Check for required columns
                required_features = ['heart_rate', 'temperature', 'systolic_bp', 'diastolic_bp', 'spo2', 'respiratory_rate']
                missing_cols = [col for col in required_features if col not in df.columns]
                
                if missing_cols:
                    return {'error': f'Missing required columns: {missing_cols}'}
                
                # If no emergency_type column, assume normal for all
                if 'emergency_type' not in df.columns:
                    df['emergency_type'] = 'normal'
                
                # Generate additional features if missing
                if 'activity_level' not in df.columns:
                    df['activity_level'] = 5  # Default moderate activity
                if 'fall_detected' not in df.columns:
                    df['fall_detected'] = 0
                if 'medication_taken' not in df.columns:
                    df['medication_taken'] = 0
                if 'stress_level' not in df.columns:
                    df['stress_level'] = 3  # Default low stress
                
                # Prepare features and labels
                feature_cols = self.feature_names
                X = df[feature_cols].values
                y = df['emergency_type'].values
                
                # Scale features
                X_scaled = self.scaler.fit_transform(X)
                
                # Encode labels
                y_encoded = self.label_encoder.fit_transform(y)
                
                # Retrain the ensemble model
                if self.ensemble_model is None:
                    # Initialize the ensemble if not already done
                    from sklearn.ensemble import RandomForestClassifier, VotingClassifier
                    from sklearn.svm import SVC
                    
                    rf_classifier = RandomForestClassifier(
                        n_estimators=100, max_depth=10, random_state=42, class_weight='balanced'
                    )
                    svm_classifier = SVC(
                        kernel='rbf', probability=True, random_state=42, class_weight='balanced'
                    )
                    self.ensemble_model = VotingClassifier(
                        estimators=[('rf', rf_classifier), ('svm', svm_classifier)],
                        voting='soft'
                    )
                
                self.ensemble_model.fit(X_scaled, y_encoded)
                self.is_trained = True
                
                return {
                    'status': 'success',
                    'samples_used': len(new_training_data),
                    'unique_emergency_types': len(set(y)),
                    'retrained_at': datetime.now().isoformat()
                }
            else:
                return {'error': 'Training data must be a non-empty list of dictionaries'}
                
        except Exception as e:
            return {'error': f'Retraining failed: {str(e)}'}

# Demo usage and testing
if __name__ == "__main__":
    # Initialize classifier
    classifier = EmergencyClassifier()
    
    # Train the model
    print("Training Emergency Classifier...")
    results = classifier.train()
    
    # Test with various scenarios
    test_cases = [
        {
            'name': 'Normal Health',
            'data': {
                'heart_rate': 72, 'temperature': 36.9, 'systolic_bp': 118,
                'diastolic_bp': 78, 'spo2': 98, 'respiratory_rate': 15,
                'activity_level': 1, 'fall_detected': 0, 'medication_taken': 0, 'stress_level': 3
            }
        },
        {
            'name': 'Cardiac Emergency',
            'data': {
                'heart_rate': 180, 'temperature': 36.5, 'systolic_bp': 70,
                'diastolic_bp': 45, 'spo2': 85, 'respiratory_rate': 28,
                'activity_level': 0, 'fall_detected': 0, 'medication_taken': 0, 'stress_level': 9
            }
        },
        {
            'name': 'Fall Detected',
            'data': {
                'heart_rate': 95, 'temperature': 36.8, 'systolic_bp': 140,
                'diastolic_bp': 90, 'spo2': 96, 'respiratory_rate': 18,
                'activity_level': 0, 'fall_detected': 1, 'medication_taken': 0, 'stress_level': 7
            }
        },
        {
            'name': 'Hyperthermia',
            'data': {
                'heart_rate': 115, 'temperature': 41.2, 'systolic_bp': 95,
                'diastolic_bp': 60, 'spo2': 94, 'respiratory_rate': 24,
                'activity_level': 0, 'fall_detected': 0, 'medication_taken': 0, 'stress_level': 8
            }
        }
    ]
    
    print("\n" + "="*60)
    print("EMERGENCY CLASSIFICATION TEST RESULTS")
    print("="*60)
    
    for test_case in test_cases:
        print(f"\nTest Case: {test_case['name']}")
        print("-" * 40)
        
        result = classifier.predict_emergency(test_case['data'])
        
        print(f"Predicted Emergency: {result['predicted_emergency']}")
        print(f"Confidence: {result['confidence']:.3f}")
        print(f"Severity: {result['severity']}")
        print(f"Immediate Attention Required: {result['requires_immediate_attention']}")
        
        print("\nTop Predictions:")
        for i, pred in enumerate(result['top_predictions'][:3], 1):
            print(f"  {i}. {pred['type']}: {pred['probability']:.3f} ({pred['confidence']})")
        
        print("\nRecommended Actions:")
        for action in result['recommended_actions']:
            print(f"  • {action}")
    
    # Save the trained model
    classifier.save_model()
    print(f"\n{'='*60}")
    print("Emergency Classifier saved successfully!")
    print("Ready for real-time emergency detection in Rescue.net AI system.")
