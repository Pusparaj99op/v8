// Test script to verify hardware simulation server integration
// Tests WebSocket connections and data flow for Rescue.net AI
// Run this to verify the simulation server is working correctly

const io = require('socket.io-client');

console.log('🧪 Testing Rescue.net AI Hardware Simulation Server...\n');

const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('✅ Connected to hardware simulation server');
  console.log('📡 Socket ID:', socket.id);
  
  // Request health data for demo device
  socket.emit('request-health-data', { deviceId: 'demo-device-001' });
  console.log('📤 Requested health data for demo-device-001\n');
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.error('🚨 Connection error:', error.message);
});

// Listen for health data
socket.on('health-data', (data) => {
  console.log('💓 Received health data:');
  console.log('   Raw data:', JSON.stringify(data, null, 2));
  console.log('   Heart Rate:', data.heartRate, 'BPM');
  console.log('   Temperature:', data.temperature, '°C');
  if (data.bloodPressure) {
    console.log('   Blood Pressure:', `${data.bloodPressure.systolic}/${data.bloodPressure.diastolic} mmHg`);
  }
  console.log('   SpO2:', data.oxygenSaturation, '%');
  console.log('   Battery:', data.batteryLevel, '%');
  console.log('   Emergency:', data.isEmergency ? '🚨 YES' : '✅ NO');
  console.log('   Timestamp:', data.timestamp);
  console.log('   ---');
});

// Listen for emergency alerts
socket.on('emergency-alert', (alert) => {
  console.log('🚨 EMERGENCY ALERT:');
  console.log('   Type:', alert.type);
  console.log('   Message:', alert.message);
  console.log('   Severity:', alert.severity);
  console.log('   Time:', alert.timestamp);
  console.log('   ⚠️⚠️⚠️');
});

// Test for 30 seconds then exit
setTimeout(() => {
  console.log('\n🏁 Test completed - disconnecting...');
  socket.disconnect();
  process.exit(0);
}, 30000);

console.log('🕒 Test will run for 30 seconds...');
console.log('📊 Waiting for real-time data...\n');
