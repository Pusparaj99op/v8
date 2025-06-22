/*
 * Rescue.net AI - ESP32 Hackathon Demo Controller
 * 
 * This version is optimized for hackathon demonstration
 * Works without physical sensors, generates simulated data
 * Connects to local server for real-time health monitoring
 * 
 * Author: Rescue.net AI Team for CIH 2.0
 * Date: June 2025
 * Version: 2.0 (Hackathon Demo)
 */

#include <WiFi.h>
#include <WiFiClient.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>

// Network Configuration
const char* WIFI_SSID = "REALME8S5G";
const char* WIFI_PASSWORD = "09876543211";
const char* API_BASE_URL = "http://192.168.1.9:3001";

// Emergency Configuration
const char* EMERGENCY_PHONE = "+919067463863";
const char* EMERGENCY_PHONE_2 = "+918180890990";

// Pin Definitions for LEDs (demo purposes)
#define LED_HEARTBEAT 2
#define LED_EMERGENCY 4
#define LED_WIFI 5

// Demo Data Structure
struct HealthData {
  float heartRate;
  float temperature;
  float bloodPressure;
  float oxygenSaturation;
  bool emergencyDetected;
  unsigned long timestamp;
};

// Global Variables
String deviceId;
HealthData currentHealth;
bool wifiConnected = false;
unsigned long lastDataSend = 0;
unsigned long lastHeartbeat = 0;
int dataCounter = 0;

void setup() {
  Serial.begin(115200);
  Serial.println("=== Rescue.net AI - Hackathon Demo ===");
  Serial.println("Starting ESP32 Health Monitor...");
  
  // Initialize pins
  pinMode(LED_HEARTBEAT, OUTPUT);
  pinMode(LED_EMERGENCY, OUTPUT);
  pinMode(LED_WIFI, OUTPUT);
  
  // Generate unique device ID
  uint64_t mac = ESP.getEfuseMac();
  deviceId = "RESCUE_" + String((uint32_t)(mac >> 32), HEX);
  Serial.println("Device ID: " + deviceId);
  
  // Initialize WiFi
  initWiFi();
  
  // Initialize time
  if (wifiConnected) {
    configTime(19800, 0, "pool.ntp.org"); // IST timezone
    Serial.println("Time synchronized");
  }
  
  // Initialize demo health data
  initHealthData();
  
  Serial.println("System ready for hackathon demo!");
  blinkStartupSequence();
}

void loop() {
  // Heartbeat LED
  if (millis() - lastHeartbeat > 1000) {
    digitalWrite(LED_HEARTBEAT, !digitalRead(LED_HEARTBEAT));
    lastHeartbeat = millis();
  }
  
  // Check WiFi status
  checkWiFiConnection();
  
  // Generate and send health data
  if (millis() - lastDataSend > 3000) { // Send every 3 seconds for demo
    generateDemoHealthData();
    
    if (wifiConnected) {
      sendHealthDataToServer();
    }
    
    printHealthData();
    lastDataSend = millis();
  }
  
  // Check for emergency conditions
  checkEmergencyConditions();
  
  delay(100); // Small delay for stability
}

void initWiFi() {
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
    
    // Blink WiFi LED during connection
    digitalWrite(LED_WIFI, !digitalRead(LED_WIFI));
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    digitalWrite(LED_WIFI, HIGH);
    Serial.println();
    Serial.println("WiFi connected successfully!");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Signal strength: ");
    Serial.println(WiFi.RSSI());
  } else {
    wifiConnected = false;
    digitalWrite(LED_WIFI, LOW);
    Serial.println();
    Serial.println("WiFi connection failed! Running in offline mode.");
  }
}

void checkWiFiConnection() {
  if (WiFi.status() != WL_CONNECTED && wifiConnected) {
    wifiConnected = false;
    digitalWrite(LED_WIFI, LOW);
    Serial.println("WiFi disconnected! Attempting reconnection...");
    
    WiFi.reconnect();
    delay(1000);
    
    if (WiFi.status() == WL_CONNECTED) {
      wifiConnected = true;
      digitalWrite(LED_WIFI, HIGH);
      Serial.println("WiFi reconnected!");
    }
  }
}

void initHealthData() {
  currentHealth.heartRate = 72.0;
  currentHealth.temperature = 36.5;
  currentHealth.bloodPressure = 120.0;
  currentHealth.oxygenSaturation = 98.0;
  currentHealth.emergencyDetected = false;
  currentHealth.timestamp = millis();
}

void generateDemoHealthData() {
  dataCounter++;
  
  // Simulate realistic health data with some variation
  currentHealth.heartRate = 70 + sin(dataCounter * 0.1) * 10 + random(-5, 6);
  currentHealth.temperature = 36.5 + sin(dataCounter * 0.05) * 0.5 + random(-10, 11) / 100.0;
  currentHealth.bloodPressure = 120 + sin(dataCounter * 0.08) * 15 + random(-8, 9);
  currentHealth.oxygenSaturation = 98 + sin(dataCounter * 0.03) * 1 + random(-1, 2);
  
  // Simulate occasional emergency scenarios for demo
  if (dataCounter % 50 == 0) { // Every 50 readings (2.5 minutes)
    // Simulate high heart rate
    currentHealth.heartRate = 140 + random(0, 20);
    Serial.println("DEMO: Simulating high heart rate emergency");
  } else if (dataCounter % 73 == 0) { // Different interval
    // Simulate high temperature
    currentHealth.temperature = 38.5 + random(0, 15) / 10.0;
    Serial.println("DEMO: Simulating fever emergency");
  }
  
  currentHealth.timestamp = millis();
}

void checkEmergencyConditions() {
  bool emergencyDetected = false;
  String emergencyType = "";
  
  // Check heart rate
  if (currentHealth.heartRate > 120 || currentHealth.heartRate < 50) {
    emergencyDetected = true;
    emergencyType = "Heart Rate Anomaly";
  }
  
  // Check temperature
  if (currentHealth.temperature > 38.0 || currentHealth.temperature < 35.0) {
    emergencyDetected = true;
    emergencyType = "Temperature Anomaly";
  }
  
  // Check oxygen saturation
  if (currentHealth.oxygenSaturation < 95) {
    emergencyDetected = true;
    emergencyType = "Low Oxygen Saturation";
  }
  
  if (emergencyDetected && !currentHealth.emergencyDetected) {
    currentHealth.emergencyDetected = true;
    digitalWrite(LED_EMERGENCY, HIGH);
    
    Serial.println("========= EMERGENCY DETECTED =========");
    Serial.println("Type: " + emergencyType);
    Serial.println("Heart Rate: " + String(currentHealth.heartRate, 1) + " BPM");
    Serial.println("Temperature: " + String(currentHealth.temperature, 1) + "°C");
    Serial.println("Oxygen Sat: " + String(currentHealth.oxygenSaturation, 1) + "%");
    Serial.println("======================================");
    
    if (wifiConnected) {
      Serial.println("Emergency data will be sent with next health data transmission");
    }
    
  } else if (!emergencyDetected && currentHealth.emergencyDetected) {
    currentHealth.emergencyDetected = false;
    digitalWrite(LED_EMERGENCY, LOW);
    Serial.println("Emergency condition resolved");
  }
}

void sendHealthDataToServer() {
  if (!wifiConnected) return;
  
  HTTPClient http;
  http.begin(String(API_BASE_URL) + "/api/health-data/device-data");
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON payload
  StaticJsonDocument<300> doc;
  doc["deviceId"] = deviceId;
  doc["patientId"] = "PAT-MC82TKHF-D9J7U";
  doc["timestamp"] = currentHealth.timestamp;
  doc["heartRate"] = currentHealth.heartRate;
  doc["temperature"] = currentHealth.temperature;
  doc["bloodPressure"] = currentHealth.bloodPressure;
  doc["oxygenSaturation"] = currentHealth.oxygenSaturation;
  doc["emergencyDetected"] = currentHealth.emergencyDetected;
  doc["source"] = "ESP32_WEARABLE";
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("Data sent successfully! Response: " + String(httpResponseCode));
    
    if (httpResponseCode == 200) {
      // Server might send back AI predictions
      StaticJsonDocument<200> responseDoc;
      if (deserializeJson(responseDoc, response) == DeserializationError::Ok) {
        if (responseDoc.containsKey("riskLevel")) {
          Serial.println("AI Risk Level: " + String(responseDoc["riskLevel"].as<String>()));
        }
      }
    }
  } else {
    Serial.println("HTTP Error: " + String(httpResponseCode));
    Serial.println("Error: " + http.errorToString(httpResponseCode));
  }
  
  http.end();
}

void sendEmergencyAlert(String emergencyType) {
  if (!wifiConnected) return;
  
  HTTPClient http;
  http.begin(String(API_BASE_URL) + "/api/emergency/alert");
  http.addHeader("Content-Type", "application/json");
  
  // Create emergency alert JSON
  StaticJsonDocument<400> doc;
  doc["deviceId"] = deviceId;
  doc["patientId"] = "DEMO_PATIENT_001";
  doc["emergencyType"] = emergencyType;
  doc["severity"] = "HIGH";
  doc["timestamp"] = currentHealth.timestamp;
  doc["vitals"]["heartRate"] = currentHealth.heartRate;
  doc["vitals"]["temperature"] = currentHealth.temperature;
  doc["vitals"]["bloodPressure"] = currentHealth.bloodPressure;
  doc["vitals"]["oxygenSaturation"] = currentHealth.oxygenSaturation;
  doc["location"]["latitude"] = 23.2599; // Demo coordinates (Bhopal)
  doc["location"]["longitude"] = 77.4126;
  doc["contacts"][0] = EMERGENCY_PHONE;
  doc["contacts"][1] = EMERGENCY_PHONE_2;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    Serial.println("Emergency alert sent! Response: " + String(httpResponseCode));
  } else {
    Serial.println("Failed to send emergency alert: " + String(httpResponseCode));
  }
  
  http.end();
}

void printHealthData() {
  Serial.println("--- Health Monitoring Data ---");
  Serial.println("Device: " + deviceId);
  Serial.println("Heart Rate: " + String(currentHealth.heartRate, 1) + " BPM");
  Serial.println("Temperature: " + String(currentHealth.temperature, 1) + "°C");
  Serial.println("Blood Pressure: " + String(currentHealth.bloodPressure, 0) + " mmHg");
  Serial.println("Oxygen Saturation: " + String(currentHealth.oxygenSaturation, 1) + "%");
  Serial.println("Emergency: " + String(currentHealth.emergencyDetected ? "YES" : "NO"));
  Serial.println("WiFi: " + String(wifiConnected ? "Connected" : "Disconnected"));
  Serial.println("Free Memory: " + String(ESP.getFreeHeap()) + " bytes");
  Serial.println("Uptime: " + String(millis() / 1000) + " seconds");
  Serial.println("-----------------------------");
}

void blinkStartupSequence() {
  Serial.println("Running startup LED sequence...");
  
  // Blink all LEDs in sequence
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_HEARTBEAT, HIGH);
    delay(200);
    digitalWrite(LED_EMERGENCY, HIGH);
    delay(200);
    digitalWrite(LED_WIFI, HIGH);
    delay(200);
    
    digitalWrite(LED_HEARTBEAT, LOW);
    digitalWrite(LED_EMERGENCY, LOW);
    digitalWrite(LED_WIFI, LOW);
    delay(200);
  }
  
  // Set initial states
  digitalWrite(LED_WIFI, wifiConnected ? HIGH : LOW);
  digitalWrite(LED_EMERGENCY, LOW);
  
  Serial.println("Startup sequence complete!");
}
