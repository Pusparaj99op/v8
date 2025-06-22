# Rescue.net AI - Environment Documentation
## Python Environment for ML Models and AI Service

### 🐍 **Environment Overview**

This document describes the Python environment setup for Rescue.net AI's machine learning models and AI service components.

**Environment Name**: `rescue-net-ai`  
**Python Version**: 3.10.x  
**Package Manager**: Mamba/Conda (conda-forge channel)  
**Purpose**: Health monitoring ML models, emergency detection, and AI API service

---

### 🚀 **Quick Setup**

#### **Option 1: Automated Setup (Recommended)**
```bash
# Run the setup script
./setup_environment.sh

# Activate environment
mamba activate rescue-net-ai
```

#### **Option 2: From Environment File**
```bash
# Create environment from YAML
mamba env create -f environment.yml

# Activate environment
mamba activate rescue-net-ai
```

#### **Option 3: Manual Setup**
```bash
# Create base environment
mamba create -n rescue-net-ai python=3.10 -y

# Activate and install packages
mamba activate rescue-net-ai
mamba install -c conda-forge -f requirements.txt
```

---

### 📦 **Package Categories**

#### **🔬 Scientific Computing Stack**
- **NumPy 1.24.3**: Numerical computing foundation
- **Pandas 2.0.3**: Data manipulation and analysis
- **SciPy 1.11.1**: Scientific algorithms and statistical functions
- **Matplotlib 3.7.2**: Plotting and visualization
- **Seaborn 0.12.2**: Statistical data visualization
- **Plotly 5.15.0**: Interactive web-based visualizations

#### **🤖 Machine Learning Libraries**
- **Scikit-learn 1.3.0**: Core ML algorithms (Random Forest, SVM, etc.)
- **XGBoost 1.7.6**: Gradient boosting framework
- **LightGBM 4.0.0**: Fast gradient boosting
- **Imbalanced-learn 0.11.0**: Handling imbalanced datasets

#### **🧠 Deep Learning Frameworks**
- **TensorFlow 2.13.0**: Deep learning framework
- **Keras 2.13.1**: High-level neural network API

#### **🌐 Web Framework & API**
- **Flask 2.3.3**: Web framework for AI service API
- **Flask-CORS 4.0.0**: Cross-origin resource sharing
- **Requests 2.31.0**: HTTP library for API calls
- **JSONSchema 4.19.0**: JSON data validation

#### **🛠️ Development Tools**
- **Jupyter Lab 4.0.5**: Interactive development environment
- **pytest 7.4.0**: Testing framework
- **Black 23.7.0**: Code formatting
- **Flake8 6.0.0**: Code linting
- **MyPy 1.5.1**: Static type checking

#### **📱 External Integrations**
- **python-telegram-bot 20.4**: Telegram bot integration
- **Twilio 8.5.0**: SMS notifications
- **psutil 5.9.5**: System monitoring

---

### 🔧 **Environment Management**

#### **Activation**
```bash
# Activate environment
mamba activate rescue-net-ai

# Verify activation
which python
python --version
```

#### **Deactivation**
```bash
# Deactivate environment
conda deactivate
```

#### **Package Management**
```bash
# Install new package
mamba install -c conda-forge package-name

# Update packages
mamba update --all

# List installed packages
mamba list

# Export environment
mamba env export > environment.yml
```

#### **Environment Removal**
```bash
# Remove environment completely
mamba env remove -n rescue-net-ai
```

---

### 🧪 **Testing the Environment**

#### **Basic Verification**
```python
import numpy as np
import pandas as pd
import sklearn
import tensorflow as tf
import flask

print(f"NumPy: {np.__version__}")
print(f"Pandas: {pd.__version__}")
print(f"Scikit-learn: {sklearn.__version__}")
print(f"TensorFlow: {tf.__version__}")
print(f"Flask: {flask.__version__}")
```

#### **ML Model Test**
```python
from sklearn.ensemble import RandomForestClassifier
from sklearn.datasets import make_classification

# Create sample data
X, y = make_classification(n_samples=100, n_features=10, random_state=42)

# Train model
rf = RandomForestClassifier(random_state=42)
rf.fit(X, y)

print(f"Model accuracy: {rf.score(X, y):.3f}")
```

#### **TensorFlow/Keras Test**
```python
import tensorflow as tf

# Check TensorFlow setup
print(f"TensorFlow version: {tf.__version__}")
print(f"GPU available: {tf.config.list_physical_devices('GPU')}")

# Simple model test
model = tf.keras.Sequential([
    tf.keras.layers.Dense(10, activation='relu', input_shape=(5,)),
    tf.keras.layers.Dense(1, activation='sigmoid')
])
model.compile(optimizer='adam', loss='binary_crossentropy')
print("✅ Keras model created successfully")
```

---

### 🔍 **Dependency Compatibility**

#### **Version Pinning Strategy**
- **Major versions**: Pinned to ensure compatibility
- **Minor versions**: Specified for reproducibility
- **Patch versions**: Allowed to float for security updates

#### **Compatibility Matrix**
| Package | Version | Python 3.10 | TensorFlow 2.13 | Scikit-learn 1.3 |
|---------|---------|--------------|-----------------|-------------------|
| NumPy | 1.24.3 | ✅ | ✅ | ✅ |
| Pandas | 2.0.3 | ✅ | ✅ | ✅ |
| SciPy | 1.11.1 | ✅ | ✅ | ✅ |
| Flask | 2.3.3 | ✅ | N/A | N/A |

#### **Known Issues & Solutions**
1. **TensorFlow GPU**: Requires CUDA 11.8+ and cuDNN 8.6+
2. **XGBoost**: May need OpenMP for optimal performance
3. **LightGBM**: Requires CMake for compilation on some systems

---

### 📊 **Performance Optimization**

#### **Memory Management**
```python
# Optimize pandas memory usage
import pandas as pd
pd.set_option('display.precision', 3)
pd.set_option('mode.chained_assignment', None)
```

#### **Parallel Processing**
```python
# Set threading for ML libraries
import os
os.environ['OMP_NUM_THREADS'] = '4'
os.environ['MKL_NUM_THREADS'] = '4'
```

#### **TensorFlow Optimization**
```python
import tensorflow as tf

# Enable memory growth for GPU
gpus = tf.config.experimental.list_physical_devices('GPU')
if gpus:
    tf.config.experimental.set_memory_growth(gpus[0], True)
```

---

### 🐳 **Docker Integration**

#### **Dockerfile Base**
```dockerfile
FROM mambaorg/micromamba:1.4.9

# Copy environment file
COPY environment.yml /tmp/environment.yml

# Create environment
RUN micromamba env create -f /tmp/environment.yml

# Activate environment
RUN echo "micromamba activate rescue-net-ai" >> ~/.bashrc
```

---

### 🔧 **Troubleshooting**

#### **Common Issues**

**Issue**: `ImportError: No module named 'sklearn'`
```bash
# Solution: Reinstall scikit-learn
mamba install scikit-learn=1.3.0 -c conda-forge
```

**Issue**: TensorFlow not finding CUDA
```bash
# Solution: Install CUDA toolkit
mamba install cudatoolkit=11.8 -c conda-forge
```

**Issue**: Flask import errors
```bash
# Solution: Reinstall Flask and dependencies
mamba install flask flask-cors -c conda-forge
```

#### **Environment Corruption**
```bash
# Complete rebuild
mamba env remove -n rescue-net-ai
./setup_environment.sh
```

---

### 📈 **Environment Monitoring**

#### **Resource Usage**
```python
import psutil
import sys

print(f"Python executable: {sys.executable}")
print(f"Memory usage: {psutil.virtual_memory().percent}%")
print(f"CPU count: {psutil.cpu_count()}")
```

#### **Package Auditing**
```bash
# Check for security issues
pip-audit

# Check package compatibility
pipdeptree
```

---

### 🎯 **Production Deployment**

#### **Environment Export**
```bash
# Export exact environment
mamba env export --no-builds > environment-production.yml

# Export pip requirements
pip freeze > requirements-production.txt
```

#### **Performance Monitoring**
- Memory usage tracking with `psutil`
- Model inference timing
- API response time monitoring
- Error rate tracking

---

### 📝 **Maintenance**

#### **Regular Updates**
```bash
# Monthly environment updates
mamba update --all
mamba env export > environment.yml

# Quarterly security updates
pip-audit --fix
```

#### **Backup Strategy**
- Environment files versioned in Git
- Regular exports before major changes
- Rollback procedure documented

---

**Environment Last Updated**: June 2025  
**Tested With**: Mamba 1.4.9, Python 3.10.12  
**Production Ready**: ✅ Yes
