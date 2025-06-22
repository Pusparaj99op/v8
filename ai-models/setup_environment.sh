#!/bin/bash
# Rescue.net AI - Mamba Environment Setup Script
# Creates conda environment with dependency compatibility for ML models
# Built for Central India Hackathon 2.0

echo "🐍 RESCUE.NET AI - MAMBA ENVIRONMENT SETUP"
echo "=========================================="
echo "Setting up Python environment with ML dependencies"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Environment name
ENV_NAME="rescue-net-ai"
PYTHON_VERSION="3.10"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for mamba/conda
if command_exists mamba; then
    CONDA_CMD="mamba"
    echo -e "${GREEN}✅ Found mamba${NC}"
elif command_exists conda; then
    CONDA_CMD="conda"
    echo -e "${YELLOW}⚠️  Using conda (mamba recommended for faster solving)${NC}"
else
    echo -e "${RED}❌ Neither mamba nor conda found. Please install miniconda/mambaforge first.${NC}"
    echo "Install from: https://github.com/conda-forge/miniforge"
    exit 1
fi

echo "Using: $CONDA_CMD"
echo ""

# Check if environment already exists
if $CONDA_CMD env list | grep -q "^$ENV_NAME "; then
    echo -e "${YELLOW}⚠️  Environment '$ENV_NAME' already exists.${NC}"
    read -p "Do you want to remove and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}🗑️  Removing existing environment...${NC}"
        $CONDA_CMD env remove -n $ENV_NAME -y
    else
        echo -e "${BLUE}📦 Activating existing environment...${NC}"
        echo "Run: $CONDA_CMD activate $ENV_NAME"
        exit 0
    fi
fi

echo -e "${BLUE}🔨 Creating new environment: $ENV_NAME${NC}"
echo "Python version: $PYTHON_VERSION"
echo ""

# Create environment with core dependencies
echo -e "${BLUE}📦 Installing core dependencies...${NC}"
$CONDA_CMD create -n $ENV_NAME python=$PYTHON_VERSION -y

# Activate environment
echo -e "${BLUE}⚡ Activating environment...${NC}"
source $(conda info --base)/etc/profile.d/conda.sh
$CONDA_CMD activate $ENV_NAME

# Install scientific computing stack
echo -e "${BLUE}🔬 Installing scientific computing stack...${NC}"
$CONDA_CMD install -c conda-forge \
    numpy=1.24.3 \
    pandas=2.0.3 \
    scipy=1.11.1 \
    matplotlib=3.7.2 \
    seaborn=0.12.2 \
    plotly=5.15.0 \
    -y

# Install machine learning libraries
echo -e "${BLUE}🤖 Installing machine learning libraries...${NC}"
$CONDA_CMD install -c conda-forge \
    scikit-learn=1.3.0 \
    xgboost=1.7.6 \
    lightgbm=4.0.0 \
    imbalanced-learn=0.11.0 \
    -y

# Install deep learning (TensorFlow/Keras)
echo -e "${BLUE}🧠 Installing deep learning frameworks...${NC}"
$CONDA_CMD install -c conda-forge \
    tensorflow=2.13.0 \
    keras=2.13.1 \
    -y

# Install web framework and API dependencies
echo -e "${BLUE}🌐 Installing web framework dependencies...${NC}"
$CONDA_CMD install -c conda-forge \
    flask=2.3.3 \
    flask-cors=4.0.0 \
    requests=2.31.0 \
    jsonschema=4.19.0 \
    -y

# Install additional utilities
echo -e "${BLUE}🛠️  Installing utility libraries...${NC}"
$CONDA_CMD install -c conda-forge \
    jupyter=1.0.0 \
    ipykernel=6.25.0 \
    psutil=5.9.5 \
    python-dotenv=1.0.0 \
    pyyaml=6.0.1 \
    -y

# Install development and testing tools
echo -e "${BLUE}🧪 Installing development tools...${NC}"
$CONDA_CMD install -c conda-forge \
    pytest=7.4.0 \
    pytest-flask=1.2.0 \
    black=23.7.0 \
    flake8=6.0.0 \
    mypy=1.5.1 \
    -y

# Install additional pip packages not available in conda-forge
echo -e "${BLUE}📦 Installing additional packages via pip...${NC}"
pip install --no-deps \
    python-telegram-bot==20.4 \
    twilio==8.5.0

# Verify installation
echo -e "${BLUE}🔍 Verifying installation...${NC}"
python -c "
import sys
print(f'Python version: {sys.version}')

# Test core ML libraries
try:
    import numpy as np
    print(f'✅ NumPy: {np.__version__}')
except ImportError as e:
    print(f'❌ NumPy: {e}')

try:
    import pandas as pd
    print(f'✅ Pandas: {pd.__version__}')
except ImportError as e:
    print(f'❌ Pandas: {e}')

try:
    import sklearn
    print(f'✅ Scikit-learn: {sklearn.__version__}')
except ImportError as e:
    print(f'❌ Scikit-learn: {e}')

try:
    import tensorflow as tf
    print(f'✅ TensorFlow: {tf.__version__}')
except ImportError as e:
    print(f'❌ TensorFlow: {e}')

try:
    import flask
    print(f'✅ Flask: {flask.__version__}')
except ImportError as e:
    print(f'❌ Flask: {e}')

print('\\n🎉 Environment setup verification complete!')
"

# Create Jupyter kernel
echo -e "${BLUE}📓 Setting up Jupyter kernel...${NC}"
python -m ipykernel install --user --name $ENV_NAME --display-name "Rescue.net AI (Python $PYTHON_VERSION)"

# Export environment
echo -e "${BLUE}💾 Exporting environment configuration...${NC}"
$CONDA_CMD env export > environment.yml
$CONDA_CMD list --export > requirements-conda.txt
pip freeze > requirements-pip.txt

echo ""
echo -e "${GREEN}🎉 ENVIRONMENT SETUP COMPLETE!${NC}"
echo "==============================="
echo ""
echo -e "${GREEN}📋 Environment Details:${NC}"
echo "Name: $ENV_NAME"
echo "Python: $PYTHON_VERSION"
echo "Location: $(conda info --base)/envs/$ENV_NAME"
echo ""
echo -e "${GREEN}🚀 To activate the environment:${NC}"
echo "$CONDA_CMD activate $ENV_NAME"
echo ""
echo -e "${GREEN}🧪 To test the AI service:${NC}"
echo "python ai_service.py"
echo ""
echo -e "${GREEN}📊 To start Jupyter:${NC}"
echo "jupyter lab"
echo ""
echo -e "${GREEN}📁 Generated files:${NC}"
echo "• environment.yml - Full environment specification"
echo "• requirements-conda.txt - Conda package list"
echo "• requirements-pip.txt - Pip package list"
echo ""
echo -e "${YELLOW}💡 Important:${NC}"
echo "• Always activate the environment before running AI models"
echo "• Use 'mamba activate $ENV_NAME' or 'conda activate $ENV_NAME'"
echo "• Environment is optimized for ML workloads and API serving"
echo ""
