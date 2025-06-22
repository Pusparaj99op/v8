#!/usr/bin/env python3
"""
Rescue.net AI - Environment Test Script
Tests all dependencies and AI components in the mamba environment
"""

import sys
import importlib
import warnings
warnings.filterwarnings('ignore')

def test_imports():
    """Test all required imports"""
    print("🧪 Testing Python Environment for Rescue.net AI")
    print("=" * 50)
    
    # Core dependencies
    core_deps = [
        ('numpy', 'NumPy - Numerical computing'),
        ('pandas', 'Pandas - Data manipulation'),
        ('scipy', 'SciPy - Scientific computing'),
        ('matplotlib', 'Matplotlib - Plotting'),
        ('seaborn', 'Seaborn - Statistical visualization'),
        ('plotly', 'Plotly - Interactive plots'),
    ]
    
    # ML dependencies
    ml_deps = [
        ('sklearn', 'Scikit-learn - Machine learning'),
        ('xgboost', 'XGBoost - Gradient boosting'),
        ('lightgbm', 'LightGBM - Fast gradient boosting'),
        ('imblearn', 'Imbalanced-learn - Handling imbalanced data'),
    ]
    
    # Deep learning
    dl_deps = [
        ('tensorflow', 'TensorFlow - Deep learning'),
        ('keras', 'Keras - High-level neural networks'),
    ]
    
    # Web framework
    web_deps = [
        ('flask', 'Flask - Web framework'),
        ('flask_cors', 'Flask-CORS - Cross-origin requests'),
        ('requests', 'Requests - HTTP library'),
        ('jsonschema', 'JSONSchema - Data validation'),
    ]
    
    # Utilities
    util_deps = [
        ('psutil', 'PSUtil - System monitoring'),
        ('dotenv', 'Python-dotenv - Environment variables'),
        ('yaml', 'PyYAML - YAML processing'),
        ('tqdm', 'TQDM - Progress bars'),
        ('joblib', 'Joblib - Parallel processing'),
    ]
    
    # Development tools
    dev_deps = [
        ('jupyter', 'Jupyter - Interactive notebooks'),
        ('pytest', 'PyTest - Testing framework'),
        ('IPython', 'IPython - Enhanced Python shell'),
    ]
    
    all_deps = [
        ("Core Scientific", core_deps),
        ("Machine Learning", ml_deps),
        ("Deep Learning", dl_deps),
        ("Web Framework", web_deps),
        ("Utilities", util_deps),
        ("Development", dev_deps),
    ]
    
    results = {}
    
    for category, deps in all_deps:
        print(f"\n📦 {category} Dependencies:")
        print("-" * 30)
        
        category_results = []
        for module, description in deps:
            try:
                imported_module = importlib.import_module(module)
                version = getattr(imported_module, '__version__', 'Unknown')
                print(f"✅ {description}: {version}")
                category_results.append((module, True, version))
            except ImportError as e:
                print(f"❌ {description}: Not found")
                category_results.append((module, False, str(e)))
        
        results[category] = category_results
    
    return results

def test_health_monitor():
    """Test the health monitor functionality"""
    print(f"\n🏥 Testing Health Monitor")
    print("-" * 30)
    
    try:
        from health_monitor import HealthMonitor
        
        # Initialize health monitor
        monitor = HealthMonitor(enable_ai_models=False)
        print("✅ HealthMonitor initialized")
        
        # Test health data analysis
        test_data = {
            'heartRate': 85,
            'temperature': 37.2,
            'bloodPressureSystolic': 130,
            'bloodPressureDiastolic': 85,
            'oxygenSaturation': 96
        }
        
        result = monitor.analyze_health_data('test-patient-001', test_data)
        print(f"✅ Health analysis completed: {result.get('overall_status', 'Unknown')}")
        
        # Test risk prediction
        patient_data = [test_data] * 6
        risk_result = monitor.predict_health_risks(patient_data)
        print(f"✅ Risk prediction completed: {risk_result.get('overall_risk', 'Unknown')}")
        
        # Test trend analysis
        trend_result = monitor.analyze_health_trends(patient_data)
        print(f"✅ Trend analysis completed: {trend_result.get('overall_trajectory', 'Unknown')}")
        
        return True
        
    except Exception as e:
        print(f"❌ Health monitor test failed: {e}")
        return False

def test_ai_service_components():
    """Test AI service components"""
    print(f"\n🤖 Testing AI Service Components")
    print("-" * 30)
    
    try:
        # Test individual AI model imports
        try:
            from anomaly_detector import HealthAnomalyDetector
            print("✅ Anomaly Detector imported")
        except ImportError:
            print("⚠️  Anomaly Detector: Using fallback mode")
        
        try:
            from emergency_classifier import EmergencyClassifier
            print("✅ Emergency Classifier imported")
        except ImportError:
            print("⚠️  Emergency Classifier: Using fallback mode")
        
        try:
            from risk_predictor import RiskPredictor
            print("✅ Risk Predictor imported")
        except ImportError:
            print("⚠️  Risk Predictor: Using fallback mode")
        
        # Test Flask app creation
        from flask import Flask
        app = Flask(__name__)
        print("✅ Flask app creation test passed")
        
        return True
        
    except Exception as e:
        print(f"❌ AI service component test failed: {e}")
        return False

def test_machine_learning():
    """Test basic ML functionality"""
    print(f"\n🧠 Testing Machine Learning Functionality")
    print("-" * 30)
    
    try:
        import numpy as np
        from sklearn.ensemble import RandomForestClassifier
        from sklearn.datasets import make_classification
        
        # Create sample data
        X, y = make_classification(n_samples=100, n_features=10, random_state=42)
        
        # Train model
        rf = RandomForestClassifier(n_estimators=10, random_state=42)
        rf.fit(X, y)
        
        accuracy = rf.score(X, y)
        print(f"✅ Random Forest test: {accuracy:.3f} accuracy")
        
        # Test TensorFlow if available
        try:
            import tensorflow as tf
            
            # Simple model test
            model = tf.keras.Sequential([
                tf.keras.layers.Dense(10, activation='relu', input_shape=(5,)),
                tf.keras.layers.Dense(1, activation='sigmoid')
            ])
            model.compile(optimizer='adam', loss='binary_crossentropy')
            print("✅ TensorFlow/Keras model creation test passed")
            
        except ImportError:
            print("⚠️  TensorFlow not available")
        
        return True
        
    except Exception as e:
        print(f"❌ Machine learning test failed: {e}")
        return False

def generate_report(results):
    """Generate environment test report"""
    print(f"\n📊 Environment Test Report")
    print("=" * 50)
    
    total_deps = 0
    successful_deps = 0
    
    for category, deps in results.items():
        category_success = sum(1 for _, success, _ in deps if success)
        category_total = len(deps)
        total_deps += category_total
        successful_deps += category_success
        
        print(f"{category}: {category_success}/{category_total} ({'✅' if category_success == category_total else '⚠️ '})")
    
    success_rate = (successful_deps / total_deps) * 100 if total_deps > 0 else 0
    
    print(f"\nOverall Success Rate: {successful_deps}/{total_deps} ({success_rate:.1f}%)")
    
    if success_rate >= 90:
        print("🎉 Environment is excellent for production!")
    elif success_rate >= 75:
        print("✅ Environment is good for development")
    elif success_rate >= 50:
        print("⚠️  Environment has some issues but may work")
    else:
        print("❌ Environment needs significant fixes")
    
    return success_rate

def main():
    """Main test function"""
    print(f"Python Version: {sys.version}")
    print(f"Python Executable: {sys.executable}")
    
    # Test imports
    results = test_imports()
    
    # Test health monitor
    health_monitor_ok = test_health_monitor()
    
    # Test AI components
    ai_components_ok = test_ai_service_components()
    
    # Test ML functionality
    ml_ok = test_machine_learning()
    
    # Generate report
    success_rate = generate_report(results)
    
    print(f"\n🔧 Component Tests:")
    print(f"Health Monitor: {'✅' if health_monitor_ok else '❌'}")
    print(f"AI Components: {'✅' if ai_components_ok else '❌'}")
    print(f"ML Functionality: {'✅' if ml_ok else '❌'}")
    
    # Final verdict
    print(f"\n🎯 Final Verdict:")
    if success_rate >= 90 and health_monitor_ok and ai_components_ok:
        print("🚀 Environment is READY for Rescue.net AI!")
        return 0
    else:
        print("🔧 Environment needs setup. Run: ./setup_environment.sh")
        return 1

if __name__ == "__main__":
    sys.exit(main())
