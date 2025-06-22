/*
 * ESP32 Simple WiFi Connectivity Test
 * This is a basic test to verify WiFi connection and network communication
 * Upload this to ESP32 and open Serial Monitor at 115200 baud
 */

#include <WiFi.h>
#include <HTTPClient.h>

// WiFi credentials - CHANGE THESE TO YOUR NETWORK
const char* ssid = "REALME8S5G";        // Replace with your WiFi network name
const char* password = "09876543211"; // Replace with your WiFi password

// Server details
const char* serverHost = "192.168.1.9";    // Replace with your laptop's IP
const int serverPort = 3001;
const String healthEndpoint = "/health";

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n=== ESP32 WiFi Test Started ===");
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  // Start WiFi connection
  WiFi.begin(ssid, password);
  
  // Wait for connection with timeout
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(1000);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✅ WiFi Connected Successfully!");
    Serial.print("📍 ESP32 IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("📶 Signal Strength: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
    
    // Test server connectivity
    testServerConnection();
  } else {
    Serial.println("\n❌ WiFi Connection Failed!");
    Serial.println("Possible issues:");
    Serial.println("1. Wrong WiFi credentials");
    Serial.println("2. WiFi network not available");
    Serial.println("3. Signal too weak");
    Serial.println("4. ESP32 hardware issue");
    
    // Show available networks
    scanWiFiNetworks();
  }
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("🔄 Testing server connection...");
    testServerConnection();
  } else {
    Serial.println("❌ WiFi disconnected, attempting reconnection...");
    WiFi.begin(ssid, password);
  }
  
  delay(10000); // Test every 10 seconds
}

void testServerConnection() {
  HTTPClient http;
  String url = "http://" + String(serverHost) + ":" + String(serverPort) + healthEndpoint;
  
  Serial.print("🌐 Testing: ");
  Serial.println(url);
  
  http.begin(url);
  http.setTimeout(5000); // 5 second timeout
  
  int httpCode = http.GET();
  
  if (httpCode > 0) {
    Serial.print("✅ Server Response Code: ");
    Serial.println(httpCode);
    
    if (httpCode == 200) {
      String payload = http.getString();
      Serial.println("📦 Server Response:");
      Serial.println(payload);
    }
  } else {
    Serial.print("❌ HTTP Error: ");
    Serial.println(http.errorToString(httpCode));
    Serial.println("Possible issues:");
    Serial.println("1. Server not running");
    Serial.println("2. Wrong server IP/port");
    Serial.println("3. Firewall blocking connection");
  }
  
  http.end();
}

void scanWiFiNetworks() {
  Serial.println("\n📡 Scanning for WiFi networks...");
  int networks = WiFi.scanNetworks();
  
  if (networks == 0) {
    Serial.println("No networks found");
  } else {
    Serial.print(networks);
    Serial.println(" networks found:");
    
    for (int i = 0; i < networks; i++) {
      Serial.print(i + 1);
      Serial.print(": ");
      Serial.print(WiFi.SSID(i));
      Serial.print(" (");
      Serial.print(WiFi.RSSI(i));
      Serial.print(" dBm)");
      Serial.println(WiFi.encryptionType(i) == WIFI_AUTH_OPEN ? " [Open]" : " [Secured]");
    }
  }
}
