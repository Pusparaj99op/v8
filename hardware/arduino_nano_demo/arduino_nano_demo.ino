/*
 * Rescue.net AI - Arduino Nano Hackathon Demo
 * 
 * This version simulates sensor data for hackathon demonstration
 * Works without physical sensors, generates realistic health data
 * Communicates with ESP32 for complete system demo
 * 
 * Author: Rescue.net AI Team for CIH 2.0
 * Date: June 2025
 * Version: 1.0 (Hackathon Demo)
 */

#include <SoftwareSerial.h>

// Pin Definitions
#define LED_HEARTBEAT 13  // Built-in LED for heartbeat indication
#define LED_STATUS 12     // Status LED
#define ESP32_TX_PIN 2    // TX to ESP32
#define ESP32_RX_PIN 3    // RX from ESP32

// Demo Configuration
#define DATA_SEND_INTERVAL 3000  // Send data every 3 seconds
#define EMERGENCY_SIMULATION_INTERVAL 60000  // Simulate emergency every 60 seconds

// Communication
SoftwareSerial esp32Serial(ESP32_RX_PIN, ESP32_TX_PIN);

// Sensor Data Structure
struct SensorReadings {
  float heartRate;
  float temperature;
  float accelerationX;
  float accelerationY;
  float accelerationZ;
  float totalAcceleration;
  boolean fallDetected;
  unsigned long timestamp;
};

SensorReadings currentReadings;

// Demo variables
unsigned long lastDataSend = 0;
unsigned long lastHeartbeat = 0;
unsigned long startTime = 0;
int dataCounter = 0;
boolean emergencySimulated = false;

void setup() {
  Serial.begin(9600);
  esp32Serial.begin(9600);
  
  Serial.println("=== Rescue.net AI - Arduino Nano Demo ===");
  Serial.println("Sensor Controller for Hackathon Demo");
  Serial.println("Generating simulated health sensor data...");
  
  // Initialize pins
  pinMode(LED_HEARTBEAT, OUTPUT);
  pinMode(LED_STATUS, OUTPUT);
  
  // Initialize demo data
  initializeDemoData();
  
  startTime = millis();
  
  Serial.println("Arduino Nano sensor controller ready!");
  
  // Startup LED sequence
  for (int i = 0; i < 5; i++) {
    digitalWrite(LED_STATUS, HIGH);
    digitalWrite(LED_HEARTBEAT, HIGH);
    delay(200);
    digitalWrite(LED_STATUS, LOW);
    digitalWrite(LED_HEARTBEAT, LOW);
    delay(200);
  }
  
  digitalWrite(LED_STATUS, HIGH); // Keep status LED on
}

void loop() {
  // Handle communication with ESP32
  handleESP32Communication();
  
  // Generate demo sensor data
  generateDemoSensorData();
  
  // Simulate heartbeat LED
  simulateHeartbeatLED();
  
  // Send data periodically
  if (millis() - lastDataSend > DATA_SEND_INTERVAL) {
    sendSensorData();
    lastDataSend = millis();
    dataCounter++;
  }
  
  // Simulate emergency scenarios for demo
  simulateEmergencyScenarios();
  
  // Print status to serial monitor
  if (dataCounter % 10 == 0 && dataCounter > 0) {
    printSensorStatus();
  }
  
  delay(100);  // Small delay for stability
}

void initializeDemoData() {
  currentReadings.heartRate = 72.0;
  currentReadings.temperature = 36.5;
  currentReadings.accelerationX = 0.1;
  currentReadings.accelerationY = 0.2;
  currentReadings.accelerationZ = 9.8;
  currentReadings.totalAcceleration = 9.82;
  currentReadings.fallDetected = false;
  currentReadings.timestamp = 0;
}

void generateDemoSensorData() {
  // Simulate realistic heart rate variations
  float baseHeartRate = 72.0;
  currentReadings.heartRate = baseHeartRate + sin(millis() * 0.001) * 8 + random(-3, 4);
  
  // Keep heart rate in realistic range
  if (currentReadings.heartRate < 60) currentReadings.heartRate = 60;
  if (currentReadings.heartRate > 100) currentReadings.heartRate = 100;
  
  // Simulate temperature variations
  float baseTemp = 36.5;
  currentReadings.temperature = baseTemp + sin(millis() * 0.0005) * 0.3 + random(-10, 11) / 100.0;
  
  // Simulate accelerometer data (normal movement)
  currentReadings.accelerationX = sin(millis() * 0.003) * 0.5 + random(-20, 21) / 100.0;
  currentReadings.accelerationY = cos(millis() * 0.002) * 0.3 + random(-15, 16) / 100.0;
  currentReadings.accelerationZ = 9.8 + sin(millis() * 0.001) * 0.2 + random(-10, 11) / 100.0;
  
  // Calculate total acceleration
  currentReadings.totalAcceleration = sqrt(
    currentReadings.accelerationX * currentReadings.accelerationX +
    currentReadings.accelerationY * currentReadings.accelerationY +
    currentReadings.accelerationZ * currentReadings.accelerationZ
  );
  
  currentReadings.timestamp = millis();
}

void simulateEmergencyScenarios() {
  // Simulate different emergency scenarios for demo
  unsigned long runtime = millis() - startTime;
  
  // Scenario 1: High heart rate emergency (every 2 minutes)
  if (runtime % 120000 < 5000 && runtime > 30000) {
    currentReadings.heartRate = 140 + random(0, 20);
    if (!emergencySimulated) {
      Serial.println("DEMO: Simulating high heart rate emergency");
      emergencySimulated = true;
    }
  }
  // Scenario 2: Fall detection (every 3 minutes)
  else if (runtime % 180000 < 3000 && runtime > 60000) {
    currentReadings.fallDetected = true;
    currentReadings.totalAcceleration = 15.0 + random(0, 50) / 10.0;
    if (!emergencySimulated) {
      Serial.println("DEMO: Simulating fall detection emergency");
      sendEmergencyAlert();
      emergencySimulated = true;
    }
  }
  // Scenario 3: Temperature emergency (every 4 minutes)
  else if (runtime % 240000 < 4000 && runtime > 90000) {
    currentReadings.temperature = 38.5 + random(0, 15) / 10.0;
    if (!emergencySimulated) {
      Serial.println("DEMO: Simulating fever emergency");
      emergencySimulated = true;
    }
  }
  else {
    // Reset emergency simulation
    if (emergencySimulated) {
      currentReadings.fallDetected = false;
      emergencySimulated = false;
      Serial.println("Emergency simulation ended");
    }
  }
}

void simulateHeartbeatLED() {
  // Blink heartbeat LED based on heart rate
  unsigned long heartbeatInterval = 60000 / currentReadings.heartRate; // ms per beat
  
  if (millis() - lastHeartbeat > heartbeatInterval) {
    digitalWrite(LED_HEARTBEAT, HIGH);
    delay(50);  // Short pulse
    digitalWrite(LED_HEARTBEAT, LOW);
    lastHeartbeat = millis();
  }
}

void handleESP32Communication() {
  // Check for commands from ESP32
  if (esp32Serial.available()) {
    String command = esp32Serial.readStringUntil('\n');
    command.trim();
    
    if (command == "GET_SENSORS") {
      sendSensorData();
      Serial.println("ESP32 requested sensor data");
    } 
    else if (command == "CALIBRATE") {
      calibrateSensors();
      Serial.println("ESP32 requested calibration");
    } 
    else if (command == "RESET") {
      resetSensorData();
      Serial.println("ESP32 requested reset");
    }
    else if (command == "DIAGNOSTIC_TEST") {
      esp32Serial.println("NANO_OK");
      Serial.println("ESP32 diagnostic test - responded OK");
    }
    else if (command.startsWith("EMERGENCY")) {
      Serial.println("Emergency command from ESP32: " + command);
    }
    else {
      Serial.println("Unknown command from ESP32: " + command);
    }
  }
}

void sendSensorData() {
  currentReadings.timestamp = millis();
  
  // Format: "HR:75.2,TEMP:36.8,BP:120.5,AX:0.1,AY:0.2,AZ:9.8,FALL:0"
  String dataString = "HR:" + String(currentReadings.heartRate, 1) + ",";
  dataString += "TEMP:" + String(currentReadings.temperature, 1) + ",";
  dataString += "BP:" + String(estimateBloodPressure(), 1) + ",";
  dataString += "AX:" + String(currentReadings.accelerationX, 2) + ",";
  dataString += "AY:" + String(currentReadings.accelerationY, 2) + ",";
  dataString += "AZ:" + String(currentReadings.accelerationZ, 2) + ",";
  dataString += "FALL:" + String(currentReadings.fallDetected ? 1 : 0);
  
  // Send to ESP32
  esp32Serial.println(dataString);
  
  // Send to serial monitor for debugging
  Serial.println("→ ESP32: " + dataString);
}

void sendEmergencyAlert() {
  // Send immediate emergency alert to ESP32
  String alertString = "EMERGENCY:FALL_DETECTED,";
  alertString += "HR:" + String(currentReadings.heartRate, 1) + ",";
  alertString += "TEMP:" + String(currentReadings.temperature, 1) + ",";
  alertString += "ACCEL:" + String(currentReadings.totalAcceleration, 1) + ",";
  alertString += "TIME:" + String(millis());
  
  esp32Serial.println(alertString);
  Serial.println("🚨 EMERGENCY ALERT → ESP32: " + alertString);
  
  // Blink both LEDs rapidly for emergency
  for (int i = 0; i < 10; i++) {
    digitalWrite(LED_HEARTBEAT, HIGH);
    digitalWrite(LED_STATUS, LOW);
    delay(100);
    digitalWrite(LED_HEARTBEAT, LOW);
    digitalWrite(LED_STATUS, HIGH);
    delay(100);
  }
  digitalWrite(LED_STATUS, HIGH); // Keep status LED on
}

float estimateBloodPressure() {
  // Simplified blood pressure estimation based on heart rate and other factors
  // This is a very basic estimation and should not be used for medical diagnosis
  
  if (currentReadings.heartRate == 0) {
    return 0.0;
  }
  
  // Basic estimation formula (not medically accurate, for demo only)
  float systolic = 90 + (currentReadings.heartRate - 70) * 0.8;
  
  // Adjust for temperature (hyperthermia can increase BP)
  if (currentReadings.temperature > 37.5) {
    systolic += (currentReadings.temperature - 37.5) * 3;
  }
  
  // Adjust for stress/emergency (higher heart rate = higher BP)
  if (currentReadings.heartRate > 100) {
    systolic += (currentReadings.heartRate - 100) * 0.5;
  }
  
  // Constrain to reasonable values
  if (systolic < 80) systolic = 80;
  if (systolic > 180) systolic = 180;
  
  return systolic;
}

void calibrateSensors() {
  Serial.println("🔧 Calibrating sensors...");
  
  // Simulate calibration process
  for (int i = 0; i < 5; i++) {
    digitalWrite(LED_STATUS, LOW);
    delay(200);
    digitalWrite(LED_STATUS, HIGH);
    delay(200);
  }
  
  // Reset to baseline values
  initializeDemoData();
  
  Serial.println("✅ Sensor calibration complete");
  esp32Serial.println("CALIBRATION_COMPLETE");
}

void resetSensorData() {
  // Reset all sensor data to default values
  initializeDemoData();
  
  dataCounter = 0;
  emergencySimulated = false;
  startTime = millis();
  
  Serial.println("🔄 Sensor data reset complete");
  esp32Serial.println("RESET_COMPLETE");
  
  // LED feedback
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_HEARTBEAT, HIGH);
    digitalWrite(LED_STATUS, LOW);
    delay(150);
    digitalWrite(LED_HEARTBEAT, LOW);
    digitalWrite(LED_STATUS, HIGH);
    delay(150);
  }
}

void printSensorStatus() {
  unsigned long runtime = (millis() - startTime) / 1000;
  
  Serial.println("=== ARDUINO NANO SENSOR STATUS ===");
  Serial.println("Runtime: " + String(runtime) + " seconds");
  Serial.println("Data packets sent: " + String(dataCounter));
  Serial.println("Heart Rate: " + String(currentReadings.heartRate, 1) + " BPM");
  Serial.println("Temperature: " + String(currentReadings.temperature, 2) + " °C");
  Serial.println("Acceleration X: " + String(currentReadings.accelerationX, 2) + " g");
  Serial.println("Acceleration Y: " + String(currentReadings.accelerationY, 2) + " g");
  Serial.println("Acceleration Z: " + String(currentReadings.accelerationZ, 2) + " g");
  Serial.println("Total Acceleration: " + String(currentReadings.totalAcceleration, 2) + " g");
  Serial.println("Fall Detected: " + String(currentReadings.fallDetected ? "YES" : "NO"));
  Serial.println("Estimated BP: " + String(estimateBloodPressure(), 1) + " mmHg");
  Serial.println("Emergency Mode: " + String(emergencySimulated ? "YES" : "NO"));
  Serial.println("Memory Usage: " + String(freeMemory()) + " bytes free");
  Serial.println("===================================");
}

// Memory check function
int freeMemory() {
  extern int __heap_start, *__brkval;
  int v;
  return (int) &v - (__brkval == 0 ? (int) &__heap_start : (int) __brkval);
}

// Health data validation
boolean validateHealthData() {
  // Check if sensor readings are within realistic ranges
  if (currentReadings.heartRate < 30 || currentReadings.heartRate > 220) {
    Serial.println("⚠️ Warning: Heart rate out of normal range");
    return false;
  }
  
  if (currentReadings.temperature < 30.0 || currentReadings.temperature > 45.0) {
    Serial.println("⚠️ Warning: Temperature out of normal range");
    return false;
  }
  
  if (currentReadings.totalAcceleration < 0 || currentReadings.totalAcceleration > 30.0) {
    Serial.println("⚠️ Warning: Acceleration out of normal range");
    return false;
  }
  
  return true;
}

// System health check
void performSystemHealthCheck() {
  Serial.println("🔍 Performing system health check...");
  
  // Check memory
  int freeRam = freeMemory();
  if (freeRam < 500) {
    Serial.println("⚠️ Low memory warning: " + String(freeRam) + " bytes");
  } else {
    Serial.println("✅ Memory OK: " + String(freeRam) + " bytes free");
  }
  
  // Check data validity
  if (validateHealthData()) {
    Serial.println("✅ Sensor data validation passed");
  } else {
    Serial.println("❌ Sensor data validation failed");
  }
  
  // Check communication
  esp32Serial.println("HEALTH_CHECK");
  delay(1000);
  
  if (esp32Serial.available()) {
    String response = esp32Serial.readString();
    if (response.indexOf("OK") != -1) {
      Serial.println("✅ ESP32 communication OK");
    } else {
      Serial.println("⚠️ ESP32 communication issue");
    }
  } else {
    Serial.println("⚠️ No response from ESP32");
  }
  
  Serial.println("🏁 System health check complete");
}

// Demo mode announcements
void announceDemo() {
  Serial.println("");
  Serial.println("🎯 === HACKATHON DEMO MODE ACTIVE ===");
  Serial.println("📡 Generating realistic health sensor data");
  Serial.println("💓 Heart rate: Simulated with natural variations");
  Serial.println("🌡️ Temperature: Simulated body temperature");
  Serial.println("📱 Accelerometer: Simulated movement and fall detection");
  Serial.println("🚨 Emergency scenarios: Automatically triggered for demo");
  Serial.println("🔗 Communication: Active with ESP32 main controller");
  Serial.println("⏰ Data transmission: Every 3 seconds");
  Serial.println("=====================================");
  Serial.println("");
}
