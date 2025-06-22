#!/bin/bash
# Rescue.net AI - Complete System Startup Script
# Starts all services for demo and development

echo "🏥 RESCUE.NET AI - SYSTEM STARTUP"
echo "=================================="
echo "Central India Hackathon 2.0"
echo "Emergency Response System"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        return 0
    else
        return 1
    fi
}

# Function to start a service in the background
start_service() {
    local service_name=$1
    local service_dir=$2
    local start_command=$3
    local port=$4
    
    echo -e "${BLUE}📡 Starting $service_name...${NC}"
    
    if check_port $port; then
        echo -e "${YELLOW}⚠️  Port $port is already in use. $service_name may already be running.${NC}"
        return 1
    fi
    
    cd "$service_dir"
    eval "$start_command" &
    local pid=$!
    echo "$pid" > "/tmp/rescue-net-$service_name.pid"
    
    # Wait a moment for service to start
    sleep 3
    
    if check_port $port; then
        echo -e "${GREEN}✅ $service_name started successfully on port $port${NC}"
        return 0
    else
        echo -e "${RED}❌ Failed to start $service_name${NC}"
        return 1
    fi
}

# Function to stop all services
stop_services() {
    echo -e "${YELLOW}🛑 Stopping all Rescue.net AI services...${NC}"
    
    # Kill processes by PID files
    for service in ai-service backend hardware-sim frontend; do
        if [ -f "/tmp/rescue-net-$service.pid" ]; then
            pid=$(cat "/tmp/rescue-net-$service.pid")
            if kill -0 "$pid" 2>/dev/null; then
                kill "$pid"
                echo -e "${GREEN}✅ Stopped $service (PID: $pid)${NC}"
            fi
            rm -f "/tmp/rescue-net-$service.pid"
        fi
    done
    
    # Kill by port if needed
    for port in 3000 3001 5000 5001; do
        if check_port $port; then
            pid=$(lsof -ti:$port)
            if [ ! -z "$pid" ]; then
                kill $pid 2>/dev/null
                echo -e "${GREEN}✅ Freed port $port${NC}"
            fi
        fi
    done
    
    echo -e "${GREEN}🏁 All services stopped${NC}"
}

# Check for stop command
if [ "$1" = "stop" ]; then
    stop_services
    exit 0
fi

# Check if we're in the right directory
if [ ! -d "ai-models" ] || [ ! -d "backend" ] || [ ! -d "frontend" ] || [ ! -d "hardware-simulation" ]; then
    echo -e "${RED}❌ Error: Not in the correct directory. Please run from the project root.${NC}"
    echo "Expected directories: ai-models, backend, frontend, hardware-simulation"
    exit 1
fi

# Setup trap to stop services on script exit
trap stop_services EXIT

echo "🔍 Checking system requirements..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js: $(node --version)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm: $(npm --version)${NC}"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python 3 is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Python: $(python3 --version)${NC}"

echo ""
echo "🚀 Starting services in order..."
echo ""

# 1. Start AI Service (Python Flask)
echo -e "${BLUE}1️⃣  Starting AI Service${NC}"
if start_service "ai-service" "ai-models" "/home/kalvin-shah/micromamba/envs/rescue-net-ai/bin/python ai_service.py" 5000; then
    echo -e "${GREEN}   📊 AI Service: http://localhost:5000/health${NC}"
else
    echo -e "${YELLOW}   ⚠️  AI Service failed to start, continuing with fallback mode...${NC}"
fi

sleep 2

# 2. Start Backend (Node.js Express)
echo -e "${BLUE}2️⃣  Starting Backend API${NC}"
if start_service "backend" "backend" "npm start" 5001; then
    echo -e "${GREEN}   🔧 Backend API: http://localhost:5001/health${NC}"
else
    echo -e "${RED}   ❌ Backend failed to start${NC}"
    exit 1
fi

sleep 2

# 3. Start Hardware Simulation
echo -e "${BLUE}3️⃣  Starting Hardware Simulation${NC}"
if start_service "hardware-sim" "hardware-simulation" "npm start" 3002; then
    echo -e "${GREEN}   📡 Hardware Sim: http://localhost:3002/status${NC}"
else
    echo -e "${RED}   ❌ Hardware simulation failed to start${NC}"
    exit 1
fi

sleep 2

# 4. Start Frontend (React)
echo -e "${BLUE}4️⃣  Starting Frontend Dashboard${NC}"
if start_service "frontend" "frontend" "npm start" 3000; then
    echo -e "${GREEN}   🌐 Frontend: http://localhost:3000${NC}"
else
    echo -e "${RED}   ❌ Frontend failed to start${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 RESCUE.NET AI SYSTEM STARTED SUCCESSFULLY!${NC}"
echo "=============================================="
echo ""
echo -e "${GREEN}📊 Service Status:${NC}"
echo "🧠 AI Service:        http://localhost:5000"
echo "🔧 Backend API:       http://localhost:3001"
echo "📡 Hardware Sim:      http://localhost:3002"
echo "🌐 Frontend:          http://localhost:3000"
echo ""
echo -e "${GREEN}🎯 Demo URLs:${NC}"
echo "👤 Patient Dashboard: http://localhost:3000/patient"
echo "🏥 Hospital Dashboard: http://localhost:3000/hospital"
echo "🔍 Test Connection:    http://localhost:3000/test-connection"
echo ""
echo -e "${YELLOW}💡 Controls:${NC}"
echo "• Press Ctrl+C to stop all services"
echo "• Run './start_system.sh stop' to stop services manually"
echo "• Check logs in terminal for real-time status"
echo ""
echo -e "${BLUE}🔴 LIVE DEMO MODE ACTIVE${NC}"
echo "Real-time health monitoring with AI analysis is now running!"
echo ""

# Wait for user to stop
echo "Press Ctrl+C to stop all services..."
while true; do
    sleep 1
done
