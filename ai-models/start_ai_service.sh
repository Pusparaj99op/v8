#!/bin/bash
# Startup script for Rescue.net AI Service
# Handles mamba environment activation and service startup

echo "🚀 Starting Rescue.net AI Service..."
echo "📍 Location: ai-models/"
echo "⏰ Time: $(date)"

# Check if we're in the right directory
if [ ! -f "ai_service.py" ]; then
    echo "❌ Error: ai_service.py not found. Please run from ai-models directory."
    exit 1
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check for mamba/conda
if command -v mamba &> /dev/null; then
    CONDA_CMD="mamba"
    echo -e "${GREEN}🐍 Using mamba for environment management${NC}"
elif command -v conda &> /dev/null; then
    CONDA_CMD="conda"
    echo -e "${YELLOW}🐍 Using conda (mamba recommended for faster solving)${NC}"
else
    echo -e "${RED}❌ Neither mamba nor conda found. Trying with system Python...${NC}"
    CONDA_CMD=""
fi

# Environment name
ENV_NAME="rescue-net-ai"

# Check if environment exists
if [ ! -z "$CONDA_CMD" ]; then
    if $CONDA_CMD env list | grep -q "^$ENV_NAME "; then
        echo -e "${GREEN}✅ Found environment: $ENV_NAME${NC}"
        
        # Activate environment
        echo -e "${BLUE}⚡ Activating environment...${NC}"
        source $(conda info --base)/etc/profile.d/conda.sh
        $CONDA_CMD activate $ENV_NAME
        
        # Verify activation
        if [[ "$CONDA_DEFAULT_ENV" == "$ENV_NAME" ]]; then
            echo -e "${GREEN}✅ Environment activated successfully${NC}"
        else
            echo -e "${YELLOW}⚠️  Environment activation may have failed, continuing anyway...${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Environment '$ENV_NAME' not found.${NC}"
        echo -e "${BLUE}🔧 To create the environment, run: ./setup_environment.sh${NC}"
        echo -e "${BLUE}📦 Or install dependencies manually: pip install -r requirements.txt${NC}"
        echo ""
        read -p "Continue with system Python? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
fi

# Check Python version
echo -e "${BLUE}🐍 Checking Python version...${NC}"
PYTHON_VERSION=$(python3 --version 2>&1)
echo "   $PYTHON_VERSION"

# Check key dependencies
echo -e "${BLUE}📚 Checking key dependencies...${NC}"

python3 -c "
import sys
import importlib

dependencies = [
    ('numpy', 'NumPy'),
    ('pandas', 'Pandas'),
    ('sklearn', 'Scikit-learn'),
    ('flask', 'Flask'),
    ('flask_cors', 'Flask-CORS')
]

missing = []
for module, name in dependencies:
    try:
        importlib.import_module(module)
        print(f'✅ {name}')
    except ImportError:
        print(f'❌ {name} - Missing')
        missing.append(name)

if missing:
    print(f'\\n⚠️  Missing dependencies: {', '.join(missing)}')
    print('Run: pip install -r requirements.txt')
    print('Or: ./setup_environment.sh')
    sys.exit(1)
else:
    print('\\n✅ All key dependencies available')
"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Dependency check failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo -e "${BLUE}🔗 AI Service will be available at: http://127.0.0.1:5000${NC}"
echo -e "${BLUE}📊 Health check endpoint: http://127.0.0.1:5000/health${NC}"
echo ""
echo -e "${GREEN}🚀 Starting AI Service...${NC}"
echo "   (Press Ctrl+C to stop)"
echo ""

# Start the service
python3 ai_service.py
