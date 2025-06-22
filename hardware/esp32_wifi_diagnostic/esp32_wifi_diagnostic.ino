/*
 * Rescue.net AI - ESP32 WiFi Diagnostic Tool
 * 
 * This tool helps diagnose WiFi connection issues
 * and provides better connectivity for hackathon demo
 * 
 * Author: Rescue.net AI Team for CIH 2.0
 * Date: June 2025
 * Version: 1.0 (WiFi Diagnostic)
 */

#include <WiFi.h>
#include <WiFiClient.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <time.h>

// Network Configuration - Update these with your WiFi credentials
const char* WIFI_SSID = "REALME8S5G";
const char* WIFI_PASSWORD = "09876543211";
const char* API_BASE_URL = "http://192.168.1.9:3001";

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
  Serial.println("=== Rescue.net AI - ESP32 WiFi Diagnostic ===");
  Serial.println("Starting WiFi connection diagnostics...");
  
  // Initialize pins
  pinMode(LED_HEARTBEAT, OUTPUT);
  pinMode(LED_EMERGENCY, OUTPUT);
  pinMode(LED_WIFI, OUTPUT);
  
  // Generate unique device ID
  uint64_t mac = ESP.getEfuseMac();
  deviceId = "RESCUE_" + String((uint32_t)(mac >> 32), HEX);
  Serial.println("Device ID: " + deviceId);
  
  // Detailed WiFi diagnostics
  performWiFiDiagnostics();
  
  // Initialize WiFi with multiple attempts
  initWiFiAdvanced();
  
  // Initialize time if connected
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
  
  // Monitor WiFi connection continuously
  monitorWiFiConnection();
  
  // Generate and send health data
  if (millis() - lastDataSend > 5000) { // Send every 5 seconds for demo
    generateDemoHealthData();
    
    if (wifiConnected) {
      sendHealthDataToServer();
    } else {
      Serial.println("WiFi not connected - data not sent");
    }
    
    printHealthData();
    lastDataSend = millis();
  }
  
  delay(100); // Small delay for stability
}

void performWiFiDiagnostics() {
  Serial.println("🔍 === WiFi Diagnostics ===");
  
  // Check WiFi mode
  WiFi.mode(WIFI_STA);
  Serial.println("WiFi mode set to Station (STA)");
  
  // Scan for available networks
  Serial.println("Scanning for available WiFi networks...");
  int numNetworks = WiFi.scanNetworks();
  
  if (numNetworks == 0) {
    Serial.println("❌ No WiFi networks found!");
  } else {
    Serial.println("📡 Found " + String(numNetworks) + " WiFi networks:");
    
    for (int i = 0; i < numNetworks; i++) {
      String ssid = WiFi.SSID(i);
      int32_t rssi = WiFi.RSSI(i);
      wifi_auth_mode_t encType = WiFi.encryptionType(i);
      
      Serial.print("  " + String(i + 1) + ". ");
      Serial.print(ssid);
      Serial.print(" (Signal: " + String(rssi) + " dBm, ");
      
      if (encType == WIFI_AUTH_OPEN) {
        Serial.print("Open");
      } else if (encType == WIFI_AUTH_WEP) {
        Serial.print("WEP");
      } else if (encType == WIFI_AUTH_WPA_PSK) {
        Serial.print("WPA");
      } else if (encType == WIFI_AUTH_WPA2_PSK) {
        Serial.print("WPA2");
      } else if (encType == WIFI_AUTH_WPA_WPA2_PSK) {
        Serial.print("WPA/WPA2");
      } else {
        Serial.print("Unknown");
      }
      Serial.println(")");
      
      // Check if our target network is found
      if (ssid == WIFI_SSID) {
        Serial.println("    ✅ Target network '" + String(WIFI_SSID) + "' found!");
        Serial.println("    Signal strength: " + String(rssi) + " dBm");
        if (rssi > -70) {
          Serial.println("    Signal quality: Good");
        } else if (rssi > -80) {
          Serial.println("    Signal quality: Fair");
        } else {
          Serial.println("    Signal quality: Poor");
        }
      }
    }
  }
  
  Serial.println("=========================");
}

void initWiFiAdvanced() {
  Serial.println("🌐 === Advanced WiFi Connection ===");
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  
  // Disconnect any previous connection
  WiFi.disconnect();
  delay(1000);
  
  // Start connection
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 60) { // Wait up to 60 seconds
    delay(500);
    Serial.print(".");
    attempts++;
    
    // Blink WiFi LED during connection
    digitalWrite(LED_WIFI, !digitalRead(LED_WIFI));
    
    // Print detailed status every 10 attempts
    if (attempts % 10 == 0) {
      Serial.println();
      Serial.print("Connection attempt " + String(attempts) + "/60, Status: ");
      printWiFiStatus();
    }
    
    // Try to reconnect if taking too long
    if (attempts == 30) {
      Serial.println();
      Serial.println("⚠️ Connection taking long, trying to reconnect...");
      WiFi.disconnect();
      delay(1000);
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    }
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    digitalWrite(LED_WIFI, HIGH);
    Serial.println();
    Serial.println("✅ WiFi connected successfully!");
    printConnectionDetails();
  } else {
    wifiConnected = false;
    digitalWrite(LED_WIFI, LOW);
    Serial.println();
    Serial.println("❌ WiFi connection failed!");
    printWiFiStatus();
    Serial.println("🔄 Will continue trying to connect in background...");
  }
}

void monitorWiFiConnection() {
  static unsigned long lastCheck = 0;
  
  // Check every 10 seconds
  if (millis() - lastCheck > 10000) {
    if (WiFi.status() != WL_CONNECTED && wifiConnected) {
      wifiConnected = false;
      digitalWrite(LED_WIFI, LOW);
      Serial.println("⚠️ WiFi disconnected! Attempting reconnection...");
      
      WiFi.reconnect();
      delay(2000);
      
      if (WiFi.status() == WL_CONNECTED) {
        wifiConnected = true;
        digitalWrite(LED_WIFI, HIGH);
        Serial.println("✅ WiFi reconnected!");
        printConnectionDetails();
      }
    } else if (WiFi.status() == WL_CONNECTED && !wifiConnected) {
      wifiConnected = true;
      digitalWrite(LED_WIFI, HIGH);
      Serial.println("✅ WiFi connected!");
      printConnectionDetails();
    }
    
    lastCheck = millis();
  }
}

void printWiFiStatus() {
  wl_status_t status = WiFi.status();
  switch (status) {
    case WL_IDLE_STATUS:
      Serial.println("WL_IDLE_STATUS - WiFi is in process of changing between statuses");
      break;
    case WL_NO_SSID_AVAIL:
      Serial.println("WL_NO_SSID_AVAIL - SSID cannot be reached");
      break;
    case WL_SCAN_COMPLETED:
      Serial.println("WL_SCAN_COMPLETED - Scan networks is completed");
      break;
    case WL_CONNECTED:
      Serial.println("WL_CONNECTED - Connected to a WiFi network");
      break;
    case WL_CONNECT_FAILED:
      Serial.println("WL_CONNECT_FAILED - Connection failed");
      break;
    case WL_CONNECTION_LOST:
      Serial.println("WL_CONNECTION_LOST - Connection lost");
      break;
    case WL_DISCONNECTED:
      Serial.println("WL_DISCONNECTED - Disconnected from network");
      break;
    default:
      Serial.println("Unknown status: " + String(status));
      break;
  }
}

void printConnectionDetails() {
  Serial.println("📊 === WiFi Connection Details ===");
  Serial.println("SSID: " + WiFi.SSID());
  Serial.println("IP address: " + WiFi.localIP().toString());
  Serial.println("Signal strength: " + String(WiFi.RSSI()) + " dBm");
  Serial.println("MAC address: " + WiFi.macAddress());
  Serial.println("Gateway: " + WiFi.gatewayIP().toString());
  Serial.println("DNS: " + WiFi.dnsIP().toString());
  Serial.println("Subnet mask: " + WiFi.subnetMask().toString());
  Serial.println("================================");
}

void initHealthData() {
  currentHealth.heartRate = 72.0;
  currentHealth.temperature = 36.5;
  currentHealth.bloodPressure = 120.0;
  currentHealth.oxygenSaturation = 98.0;
  currentHealth.emergencyDetected = false;
  currentHealth.timestamp = 0;
}

void generateDemoHealthData() {
  dataCounter++;
  
  // Simulate realistic health data with some variation
  currentHealth.heartRate = 70 + sin(dataCounter * 0.1) * 10 + random(-5, 6);
  currentHealth.temperature = 36.5 + sin(dataCounter * 0.05) * 0.5 + random(-10, 11) / 100.0;
  currentHealth.bloodPressure = 120 + sin(dataCounter * 0.08) * 15 + random(-8, 9);
  currentHealth.oxygenSaturation = 98 + sin(dataCounter * 0.03) * 1 + random(-1, 2);
  
  // Simulate occasional emergency scenarios for demo
  if (dataCounter % 50 == 0) { // Every 50 readings
    currentHealth.heartRate = 140 + random(0, 20);
    Serial.println("DEMO: Simulating high heart rate emergency");
  } else if (dataCounter % 73 == 0) { // Different interval
    currentHealth.temperature = 38.5 + random(0, 15) / 10.0;
    Serial.println("DEMO: Simulating fever emergency");
  }
  
  currentHealth.timestamp = millis();
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
  
  Serial.println("📤 Sending data to server...");
  Serial.println("URL: " + String(API_BASE_URL) + "/api/health-data/device-data");
  Serial.println("Payload: " + jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.println("✅ Data sent successfully! Response: " + String(httpResponseCode));
    Serial.println("Response body: " + response);
    
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
    Serial.println("❌ HTTP Error: " + String(httpResponseCode));
    Serial.println("Error: " + http.errorToString(httpResponseCode));
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
  if (wifiConnected) {
    Serial.println("Signal: " + String(WiFi.RSSI()) + " dBm");
  }
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
