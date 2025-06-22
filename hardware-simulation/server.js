// Hardware Simulation Service - Simulates ESP32 wearable device data
// Generates realistic health data for demo purposes
// 
// For Central India Hackathon 2.0 - Rescue.net AI

const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

let connectedDevices = new Map();
let isSimulationRunning = false;

// Device registration endpoint
app.post('/api/device/register', (req, res) => {
  const { deviceId, patientId, deviceInfo } = req.body;
  
  connectedDevices.set(deviceId, {
    deviceId,
    patientId,
    deviceInfo,
    isActive: true,
    lastSeen: new Date(),
    batteryLevel: 85,
    signalStrength: 80,
    location: {
      latitude: 21.2514, // Default to Nagpur, India
      longitude: 79.0849
    }
  });

  console.log(`Device registered: ${deviceId} for patient: ${patientId}`);
  res.json({ success: true, message: 'Device registered successfully' });
});

// Generate realistic health data
function generateHealthData(deviceId) {
  const device = connectedDevices.get(deviceId);
  if (!device) return null;

  const baseHeartRate = 75;
  const baseTemp = 36.8;
  const baseSystolic = 120;
  const baseDiastolic = 80;

  // Add some realistic variation and occasional anomalies
  const timeOfDay = new Date().getHours();
  const isNight = timeOfDay < 7 || timeOfDay > 22;
  const isActive = timeOfDay >= 9 && timeOfDay <= 18;

  let heartRate = baseHeartRate;
  if (isNight) heartRate -= 10; // Lower at night
  if (isActive) heartRate += 5; // Slightly higher during day
  heartRate += (Math.random() - 0.5) * 15;

  let temperature = baseTemp + (Math.random() - 0.5) * 1.2;
  
  // Simulate occasional emergency conditions (5% chance)
  const emergencyChance = Math.random();
  let isEmergency = false;
  let emergencyType = null;

  if (emergencyChance < 0.02) { // 2% chance of emergency
    if (Math.random() < 0.5) {
      heartRate = 140 + Math.random() * 20; // Tachycardia
      emergencyType = 'tachycardia';
      isEmergency = true;
    } else {
      temperature = 38.5 + Math.random() * 1.5; // High fever
      emergencyType = 'hyperthermia';
      isEmergency = true;
    }
  }

  return {
    deviceId,
    patientId: device.patientId,
    timestamp: new Date().toISOString(),
    vitals: {
      heartRate: Math.round(heartRate),
      bloodPressure: {
        systolic: Math.round(baseSystolic + (Math.random() - 0.5) * 20),
        diastolic: Math.round(baseDiastolic + (Math.random() - 0.5) * 15),
      },
      bodyTemperature: Math.round(temperature * 10) / 10,
      oxygenSaturation: Math.round(96 + Math.random() * 4),
      respiratoryRate: Math.round(16 + (Math.random() - 0.5) * 4),
    },
    motion: {
      steps: Math.round(Math.random() * 100),
      accelerometer: {
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 2,
        z: (Math.random() - 0.5) * 2,
      },
    },
    battery: {
      level: Math.round(75 + Math.random() * 25),
      charging: Math.random() < 0.1,
    },
    location: {
      latitude: device.location.latitude + (Math.random() - 0.5) * 0.001,
      longitude: device.location.longitude + (Math.random() - 0.5) * 0.001,
    },
    emergency: isEmergency,
    emergencyType: emergencyType
  };
}

// Send health data to backend AI service for analysis
async function sendToBackendAI(healthData) {
  try {
    const response = await axios.post('http://localhost:5001/api/ai/analyze-realtime', {
      patientId: healthData.patientId,
      deviceId: healthData.deviceId,
      healthData: {
        heartRate: healthData.vitals.heartRate,
        temperature: healthData.vitals.bodyTemperature,
        bloodPressureSystolic: healthData.vitals.bloodPressure.systolic,
        bloodPressureDiastolic: healthData.vitals.bloodPressure.diastolic,
        oxygenSaturation: healthData.vitals.oxygenSaturation,
        respiratoryRate: healthData.vitals.respiratoryRate,
        emergency: healthData.emergency,
        emergencyType: healthData.emergencyType
      }
    }, {
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log(`📊 AI Analysis for ${healthData.patientId}:`, {
        status: response.data.analysis?.overall_status || 'unknown',
        emergency: response.data.analysis?.emergency_detected || false,
        confidence: response.data.analysis?.confidence || 0
      });
    }

    return response.data;
  } catch (error) {
    // Silently handle errors - backend might not be running
    if (error.code !== 'ECONNREFUSED') {
      console.log(`⚠️  Backend AI connection failed: ${error.message}`);
    }
    return null;
  }
}

// Start simulation for all registered devices
function startSimulation() {
  if (isSimulationRunning) return;
  
  isSimulationRunning = true;
  console.log('🚀 Starting health data simulation with AI integration...');

  const simulationInterval = setInterval(async () => {
    if (connectedDevices.size === 0) {
      console.log('No devices registered, stopping simulation...');
      clearInterval(simulationInterval);
      isSimulationRunning = false;
      return;
    }

    for (const [deviceId, device] of connectedDevices) {
      const healthData = generateHealthData(deviceId);
      if (healthData) {
        // Update device status
        device.lastSeen = new Date();
        device.batteryLevel = healthData.battery.level;
        
        // Send to backend AI for analysis
        const aiAnalysis = await sendToBackendAI(healthData);
        
        // Add AI analysis to health data
        if (aiAnalysis) {
          healthData.aiAnalysis = aiAnalysis.analysis;
          healthData.aiServiceStatus = aiAnalysis.aiServiceStatus;
        }

        // Emit to connected clients
        io.emit('health-data', healthData);

        // Check for emergencies (from AI or simulation)
        const hasEmergency = healthData.emergency || (aiAnalysis && aiAnalysis.analysis && aiAnalysis.analysis.emergency_detected);
        
        if (hasEmergency) {
          const emergencyType = healthData.emergencyType || (aiAnalysis && aiAnalysis.analysis && aiAnalysis.analysis.emergency_type) || 'unknown';
          console.log(`🚨 EMERGENCY DETECTED for ${deviceId}: ${emergencyType}`);
          
          const emergencyData = {
            id: `emergency_${Date.now()}`,
            deviceId,
            patientId: healthData.patientId,
            type: emergencyType,
            severity: (aiAnalysis && aiAnalysis.analysis && aiAnalysis.analysis.severity) || 'high',
            status: 'detected',
            vitalsAtTime: healthData.vitals,
            location: healthData.location,
            detectedAt: healthData.timestamp,
            aiPrediction: aiAnalysis ? aiAnalysis.analysis : null,
          };

          io.emit('emergency-alert', emergencyData);
        }

        // Send data to backend AI for analysis
        sendToBackendAI(healthData);

        console.log(`📊 Health data sent for ${deviceId}: HR=${healthData.vitals.heartRate}, Temp=${healthData.vitals.bodyTemperature}°C`);
      }
    }
  }, 3000); // Send data every 3 seconds
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send current device status
  socket.emit('device-status', Array.from(connectedDevices.values()));

  socket.on('start-monitoring', (data) => {
    console.log('Start monitoring requested:', data);
    startSimulation();
  });

  socket.on('stop-monitoring', () => {
    console.log('Stop monitoring requested');
    isSimulationRunning = false;
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// API endpoints
app.get('/api/devices', (req, res) => {
  res.json(Array.from(connectedDevices.values()));
});

app.get('/api/device/:deviceId/health', (req, res) => {
  const { deviceId } = req.params;
  const healthData = generateHealthData(deviceId);
  
  if (healthData) {
    res.json(healthData);
  } else {
    res.status(404).json({ error: 'Device not found' });
  }
});

app.post('/api/emergency/respond', (req, res) => {
  const { emergencyId, responderId, response } = req.body;
  console.log(`Emergency response: ${emergencyId} by ${responderId}: ${response}`);
  
  io.emit('emergency-response', {
    emergencyId,
    responderId,
    response,
    timestamp: new Date().toISOString(),
  });

  res.json({ success: true, message: 'Emergency response recorded' });
});

// Start server
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`🏥 Rescue.net AI Hardware Simulation Server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`🔗 API endpoint: http://localhost:${PORT}/api`);
  
  // Auto-register a demo device
  setTimeout(() => {
    const demoDevice = {
      deviceId: 'ESP32_DEMO_001',
      patientId: 'patient_demo',
      deviceInfo: {
        firmwareVersion: '1.2.3',
        deviceType: 'ESP32_Wearable',
        sensors: ['REES52', 'DS18B20', 'BMP180', 'ADXL335'],
      }
    };
    
    connectedDevices.set(demoDevice.deviceId, {
      ...demoDevice,
      isActive: true,
      lastSeen: new Date(),
      batteryLevel: 85,
      signalStrength: 80,
      location: {
        latitude: 21.2514, // Nagpur, India
        longitude: 79.0849
      }
    });
    
    console.log('✅ Demo device auto-registered:', demoDevice.deviceId);
    startSimulation();
  }, 2000);
});
