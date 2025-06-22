#!/bin/bash
# Rescue.net AI Environment Activation Script
# This script activates the rescue-net-ai conda environment for development

echo "🏥 RESCUE.NET AI - ENVIRONMENT ACTIVATION"
echo "========================================="

# Add the rescue-net-ai Python to PATH
export PATH="/home/kalvin-shah/micromamba/envs/rescue-net-ai/bin:$PATH"

# Verify Python version
echo "✅ Python environment: $(python --version)"
echo "✅ Python path: $(which python)"
echo "✅ Environment activated: rescue-net-ai"
echo ""
echo "🚀 Ready to develop Rescue.net AI!"
echo "   • AI Service: /home/kalvin-shah/micromamba/envs/rescue-net-ai/bin/python"
echo "   • Use: ./start_system.sh to start all services"
echo ""
