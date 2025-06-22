/*
 * ESP32 WiFi Diagnostic and Connection Script
 * Rescue.net AI - WiFi Troubleshooting Tool
 * 
 * This script helps diagnose and fix WiFi connection issues
 * Features:
 * - WiFi scanning and signal strength analysis
 * - Multiple connection retry strategies
 * - Network diagnostics and debugging
 * - Automatic fallback to hotspot mode
 * - Memory and power optimization
 * 
 * Author: Rescue.net AI Team
 * Date: June 2025
 */

#include <WiFi.h>
#include <WiFiClient.h>
#include <WiFiAP.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>

// Network Configuration
const char* DEFAULT_SSID = "REALME8S5G";
const char* DEFAULT_PASSWORD = "09876543211";
const char* FALLBACK_SSID = "RescueNet_Config";
const char* FALLBACK_PASSWORD = "rescue123";

// Connection parameters
#define MAX_WIFI_ATTEMPTS 30
#define WIFI_TIMEOUT_MS 10000
#define CONNECTION_CHECK_INTERVAL 5000

// Preferences for storing WiFi credentials
Preferences preferences;

// Global variables
bool wifiConnected = false;
unsigned long lastConnectionCheck = 0;
int connectionAttempts = 0;
String savedSSID = "";
String savedPassword = "";

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println();
  Serial.println("=================================");
  Serial.println("🏥 RESCUE.NET AI - WiFi Diagnostic");
  Serial.println("=================================");
  Serial.println();
  
  // Initialize preferences
  preferences.begin("wifi-config", false);
  
  // Load saved credentials
  loadWiFiCredentials();
  
  // Print system information
  printSystemInfo();
  
  // Start WiFi diagnostics
  runWiFiDiagnostics();
  
  // Attempt connection with multiple strategies
  if (!connectToWiFi()) {
    Serial.println("❌ WiFi connection failed. Starting AP mode...");
    startAccessPointMode();
  } else {
    Serial.println("✅ WiFi connected successfully!");
    testInternetConnection();
  }
}

void loop() {
  // Check WiFi connection every 5 seconds
  if (millis() - lastConnectionCheck > CONNECTION_CHECK_INTERVAL) {
    checkAndMaintainConnection();
    lastConnectionCheck = millis();
  }
  
  // Handle any incoming connections if in AP mode
  if (WiFi.getMode() == WIFI_AP || WiFi.getMode() == WIFI_AP_STA) {
    handleAPConnections();
  }
  
  delay(1000);
}

void loadWiFiCredentials() {
  savedSSID = preferences.getString("ssid", DEFAULT_SSID);
  savedPassword = preferences.getString("password", DEFAULT_PASSWORD);
  
  Serial.println("📱 Loaded WiFi credentials:");
  Serial.println("   SSID: " + savedSSID);
  Serial.println("   Password: " + String(savedPassword.length() > 0 ? "****" : "None"));
}

void saveWiFiCredentials(String ssid, String password) {
  preferences.putString("ssid", ssid);
  preferences.putString("password", password);
  Serial.println("💾 WiFi credentials saved");
}

void printSystemInfo() {
  Serial.println("📊 System Information:");
  Serial.println("   Chip Model: " + String(ESP.getChipModel()));
  Serial.println("   Chip Revision: " + String(ESP.getChipRevision()));
  Serial.println("   CPU Frequency: " + String(ESP.getCpuFreqMHz()) + " MHz");
  Serial.println("   Free Heap: " + String(ESP.getFreeHeap()) + " bytes");
  Serial.println("   Flash Size: " + String(ESP.getFlashChipSize()) + " bytes");
  
  // Get MAC address
  uint8_t mac[6];
  WiFi.macAddress(mac);
  Serial.printf("   MAC Address: %02X:%02X:%02X:%02X:%02X:%02X\n", 
                mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  Serial.println();
}

void runWiFiDiagnostics() {
  Serial.println("🔍 Running WiFi Diagnostics...");
  
  // Set WiFi mode
  WiFi.mode(WIFI_STA);
  delay(1000);
  
  // Scan for networks
  Serial.println("📡 Scanning for WiFi networks...");
  int networkCount = WiFi.scanNetworks();
  
  if (networkCount == 0) {
    Serial.println("❌ No WiFi networks found!");
    return;
  }
  
  Serial.println("✅ Found " + String(networkCount) + " networks:");
  Serial.println();
  Serial.println("   #  | SSID                     | Signal | Security | Channel");
  Serial.println("   ---|--------------------------|--------|----------|--------");
  
  bool targetFound = false;
  int targetSignal = 0;
  
  for (int i = 0; i < networkCount; i++) {
    String ssid = WiFi.SSID(i);
    int32_t rssi = WiFi.RSSI(i);
    wifi_auth_mode_t authMode = WiFi.encryptionType(i);
    int32_t channel = WiFi.channel(i);
    
    // Check if this is our target network
    if (ssid == savedSSID) {
      targetFound = true;
      targetSignal = rssi;
    }
    
    String security = getSecurityType(authMode);
    String signalStrength = getSignalStrength(rssi);
    
    Serial.printf("   %-2d | %-24s | %-6s | %-8s | %d\n", 
                  i + 1, ssid.c_str(), signalStrength.c_str(), 
                  security.c_str(), channel);
  }
  
  Serial.println();
  
  if (targetFound) {
    Serial.println("✅ Target network '" + savedSSID + "' found");
    Serial.println("   Signal strength: " + getSignalStrength(targetSignal) + " (" + String(targetSignal) + " dBm)");
    
    if (targetSignal < -70) {
      Serial.println("⚠️  Warning: Weak signal strength. Consider moving closer to router.");
    }
  } else {
    Serial.println("❌ Target network '" + savedSSID + "' not found!");
    Serial.println("   Available networks are listed above.");
  }
  
  Serial.println();
}

String getSecurityType(wifi_auth_mode_t authMode) {
  switch (authMode) {
    case WIFI_AUTH_OPEN: return "Open";
    case WIFI_AUTH_WEP: return "WEP";
    case WIFI_AUTH_WPA_PSK: return "WPA";
    case WIFI_AUTH_WPA2_PSK: return "WPA2";
    case WIFI_AUTH_WPA_WPA2_PSK: return "WPA/WPA2";
    case WIFI_AUTH_WPA2_ENTERPRISE: return "WPA2-ENT";
    default: return "Unknown";
  }
}

String getSignalStrength(int32_t rssi) {
  if (rssi > -50) return "Excellent";
  else if (rssi > -60) return "Good";
  else if (rssi > -70) return "Fair";
  else if (rssi > -80) return "Weak";
  else return "Very Weak";
}

bool connectToWiFi() {
  Serial.println("🔗 Attempting WiFi connection...");
  
  // Strategy 1: Try saved credentials
  if (attemptConnection(savedSSID.c_str(), savedPassword.c_str(), "Saved credentials")) {
    return true;
  }
  
  // Strategy 2: Try default credentials
  if (savedSSID != DEFAULT_SSID) {
    if (attemptConnection(DEFAULT_SSID, DEFAULT_PASSWORD, "Default credentials")) {
      saveWiFiCredentials(DEFAULT_SSID, DEFAULT_PASSWORD);
      return true;
    }
  }
  
  // Strategy 3: Try connection with different power settings
  Serial.println("🔋 Trying different power modes...");
  WiFi.setTxPower(WIFI_POWER_19_5dBm);  // Maximum power
  delay(1000);
  
  if (attemptConnection(savedSSID.c_str(), savedPassword.c_str(), "High power mode")) {
    return true;
  }
  
  // Strategy 4: Try with persistent connection disabled
  Serial.println("🔄 Trying without persistent connection...");
  WiFi.persistent(false);
  WiFi.disconnect(true);
  delay(2000);
  
  if (attemptConnection(savedSSID.c_str(), savedPassword.c_str(), "Non-persistent mode")) {
    return true;
  }
  
  return false;
}

bool attemptConnection(const char* ssid, const char* password, String strategy) {
  Serial.println("   Strategy: " + strategy);
  Serial.println("   Connecting to: " + String(ssid));
  
  WiFi.begin(ssid, password);
  
  unsigned long startTime = millis();
  int dots = 0;
  
  while (WiFi.status() != WL_CONNECTED && (millis() - startTime) < WIFI_TIMEOUT_MS) {
    delay(500);
    Serial.print(".");
    dots++;
    
    if (dots % 20 == 0) {
      Serial.println();
      Serial.print("   ");
    }
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("   ✅ Connected successfully!");
    Serial.println("   IP Address: " + WiFi.localIP().toString());
    Serial.println("   Gateway: " + WiFi.gatewayIP().toString());
    Serial.println("   DNS: " + WiFi.dnsIP().toString());
    Serial.println("   Signal Strength: " + String(WiFi.RSSI()) + " dBm");
    
    wifiConnected = true;
    connectionAttempts = 0;
    return true;
  } else {
    Serial.println();
    Serial.println("   ❌ Connection failed");
    Serial.println("   Status: " + getWiFiStatusString(WiFi.status()));
    connectionAttempts++;
    return false;
  }
}

String getWiFiStatusString(wl_status_t status) {
  switch (status) {
    case WL_IDLE_STATUS: return "Idle";
    case WL_NO_SSID_AVAIL: return "SSID not available";
    case WL_SCAN_COMPLETED: return "Scan completed";
    case WL_CONNECTED: return "Connected";
    case WL_CONNECT_FAILED: return "Connection failed";
    case WL_CONNECTION_LOST: return "Connection lost";
    case WL_WRONG_PASSWORD: return "Wrong password";
    case WL_DISCONNECTED: return "Disconnected";
    default: return "Unknown";
  }
}

void testInternetConnection() {
  Serial.println("🌐 Testing internet connectivity...");
  
  HTTPClient http;
  http.begin("http://httpbin.org/ip");
  http.setTimeout(5000);
  
  int httpCode = http.GET();
  
  if (httpCode > 0) {
    if (httpCode == HTTP_CODE_OK) {
      String payload = http.getString();
      Serial.println("✅ Internet connection working");
      Serial.println("   Response: " + payload);
    } else {
      Serial.println("⚠️  Internet accessible but got HTTP " + String(httpCode));
    }
  } else {
    Serial.println("❌ No internet connection");
    Serial.println("   Error: " + http.errorToString(httpCode));
  }
  
  http.end();
}

void startAccessPointMode() {
  Serial.println("🔥 Starting Access Point mode...");
  
  WiFi.mode(WIFI_AP);
  WiFi.softAP(FALLBACK_SSID, FALLBACK_PASSWORD);
  
  IPAddress apIP = WiFi.softAPIP();
  Serial.println("✅ Access Point started");
  Serial.println("   SSID: " + String(FALLBACK_SSID));
  Serial.println("   Password: " + String(FALLBACK_PASSWORD));
  Serial.println("   IP Address: " + apIP.toString());
  Serial.println();
  Serial.println("📱 Connect to this AP and visit http://" + apIP.toString() + " to configure WiFi");
}

void handleAPConnections() {
  // This would handle web server for WiFi configuration
  // Implementation would include a simple web interface for WiFi setup
}

void checkAndMaintainConnection() {
  if (wifiConnected && WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️  WiFi connection lost. Attempting reconnection...");
    wifiConnected = false;
    
    // Try to reconnect
    WiFi.reconnect();
    delay(2000);
    
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("✅ WiFi reconnected");
      wifiConnected = true;
    } else {
      Serial.println("❌ Reconnection failed");
      
      // If multiple failures, restart WiFi
      if (connectionAttempts > 5) {
        Serial.println("🔄 Restarting WiFi subsystem...");
        WiFi.disconnect(true);
        delay(1000);
        WiFi.mode(WIFI_OFF);
        delay(1000);
        WiFi.mode(WIFI_STA);
        delay(1000);
        connectToWiFi();
      }
    }
  }
  
  // Print status
  if (wifiConnected) {
    Serial.println("📶 WiFi Status: Connected (" + String(WiFi.RSSI()) + " dBm)");
  } else {
    Serial.println("📶 WiFi Status: Disconnected");
  }
}
