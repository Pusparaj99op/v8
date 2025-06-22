/*
 * Simple ESP32 WiFi Connection Test
 * Rescue.net AI - Quick WiFi Troubleshooter
 * 
 * Upload this to your ESP32 to test WiFi connectivity
 * Check Serial Monitor at 115200 baud for diagnostics
 */

#include <WiFi.h>

// UPDATE THESE WITH YOUR NETWORK CREDENTIALS
const char* ssid = "REALME8S5G";           // Your WiFi network name
const char* password = "09876543211";       // Your WiFi password

// Alternative networks to try (add your own)
const char* backup_ssid = "YourBackupWiFi";
const char* backup_password = "YourBackupPassword";

void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println();
  Serial.println("==============================");
  Serial.println("🏥 RESCUE.NET AI - WiFi TEST");
  Serial.println("==============================");
  
  // Print ESP32 info
  Serial.println("📱 Device Info:");
  Serial.printf("   Chip: %s Rev %d\n", ESP.getChipModel(), ESP.getChipRevision());
  Serial.printf("   CPU: %d MHz\n", ESP.getCpuFreqMHz());
  Serial.printf("   Free RAM: %d bytes\n", ESP.getFreeHeap());
  
  // Print MAC address
  uint8_t mac[6];
  WiFi.macAddress(mac);
  Serial.printf("   MAC: %02X:%02X:%02X:%02X:%02X:%02X\n", 
                mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  Serial.println();
  
  // Scan for networks first
  scanNetworks();
  
  // Try to connect
  connectToWiFi();
}

void loop() {
  // Check connection every 10 seconds
  static unsigned long lastCheck = 0;
  if (millis() - lastCheck > 10000) {
    checkConnection();
    lastCheck = millis();
  }
  delay(1000);
}

void scanNetworks() {
  Serial.println("🔍 Scanning for WiFi networks...");
  
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(100);
  
  int n = WiFi.scanNetworks();
  Serial.printf("Found %d networks:\n\n", n);
  
  if (n == 0) {
    Serial.println("❌ No networks found!");
    Serial.println("   Check if WiFi is enabled on your router");
    Serial.println("   Try moving closer to the router");
    return;
  }
  
  Serial.println("Network List:");
  Serial.println("SSID                          | Signal | Security");
  Serial.println("------------------------------|--------|----------");
  
  bool targetFound = false;
  
  for (int i = 0; i < n; i++) {
    String networkSSID = WiFi.SSID(i);
    int32_t rssi = WiFi.RSSI(i);
    String security = (WiFi.encryptionType(i) == WIFI_AUTH_OPEN) ? "Open" : "Secured";
    
    if (networkSSID == ssid) {
      targetFound = true;
      Serial.print("🎯 ");
    } else {
      Serial.print("   ");
    }
    
    Serial.printf("%-29s | %-6d | %s\n", 
                  networkSSID.c_str(), rssi, security.c_str());
  }
  
  Serial.println();
  
  if (targetFound) {
    Serial.println("✅ Target network found!");
  } else {
    Serial.println("❌ Target network '" + String(ssid) + "' not found!");
    Serial.println("   Double-check the SSID spelling");
    Serial.println("   Make sure the network is broadcasting");
  }
  Serial.println();
}

void connectToWiFi() {
  Serial.println("🔗 Connecting to WiFi...");
  Serial.println("Network: " + String(ssid));
  
  // Set WiFi mode
  WiFi.mode(WIFI_STA);
  
  // Disconnect any previous connection
  WiFi.disconnect();
  delay(1000);
  
  // Start connection
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  Serial.print("Connecting");
  
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
    
    if (attempts % 10 == 0) {
      Serial.println();
      Serial.printf("Attempt %d/30: Status = %s", attempts, getStatusString(WiFi.status()).c_str());
      Serial.println();
      Serial.print("Continuing");
    }
  }
  
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("✅ WiFi CONNECTED!");
    printConnectionDetails();
    testInternet();
  } else {
    Serial.println("❌ WiFi CONNECTION FAILED!");
    Serial.println("Status: " + getStatusString(WiFi.status()));
    troubleshootConnection();
    
    // Try backup network if available
    if (strlen(backup_ssid) > 0) {
      Serial.println("🔄 Trying backup network...");
      tryBackupNetwork();
    }
  }
}

void tryBackupNetwork() {
  WiFi.disconnect();
  delay(1000);
  
  WiFi.begin(backup_ssid, backup_password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("✅ Connected to backup network!");
    printConnectionDetails();
  } else {
    Serial.println("❌ Backup network also failed");
  }
}

void printConnectionDetails() {
  Serial.println();
  Serial.println("📊 Connection Details:");
  Serial.println("   SSID: " + WiFi.SSID());
  Serial.println("   IP Address: " + WiFi.localIP().toString());
  Serial.println("   Gateway: " + WiFi.gatewayIP().toString());
  Serial.println("   DNS: " + WiFi.dnsIP().toString());
  Serial.println("   Signal Strength: " + String(WiFi.RSSI()) + " dBm");
  Serial.println("   Channel: " + String(WiFi.channel()));
  Serial.println();
}

void testInternet() {
  Serial.println("🌐 Testing internet connection...");
  
  WiFiClient client;
  
  if (client.connect("www.google.com", 80)) {
    Serial.println("✅ Internet connection working!");
    client.stop();
  } else {
    Serial.println("❌ No internet access");
    Serial.println("   WiFi connected but no internet");
    Serial.println("   Check router's internet connection");
  }
}

void checkConnection() {
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("📶 WiFi: Connected (" + String(WiFi.RSSI()) + " dBm)");
  } else {
    Serial.println("📶 WiFi: Disconnected - " + getStatusString(WiFi.status()));
    
    // Try to reconnect
    Serial.println("🔄 Attempting reconnection...");
    WiFi.reconnect();
    delay(5000);
    
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("✅ Reconnected successfully!");
    } else {
      Serial.println("❌ Reconnection failed");
    }
  }
}

void troubleshootConnection() {
  Serial.println();
  Serial.println("🔧 TROUBLESHOOTING TIPS:");
  Serial.println();
  
  wl_status_t status = WiFi.status();
  
  switch (status) {
    case WL_NO_SSID_AVAIL:
      Serial.println("❌ Network not found:");
      Serial.println("   • Check SSID spelling in code");
      Serial.println("   • Make sure router is powered on");
      Serial.println("   • Check if network is hidden");
      Serial.println("   • Move closer to router");
      break;
      
    case WL_WRONG_PASSWORD:
      Serial.println("❌ Wrong password:");
      Serial.println("   • Check password spelling in code");
      Serial.println("   • Verify password on router settings");
      Serial.println("   • Check for caps lock/special characters");
      break;
      
    case WL_CONNECT_FAILED:
      Serial.println("❌ Connection failed:");
      Serial.println("   • Router may be overloaded");
      Serial.println("   • Check MAC address filtering");
      Serial.println("   • Try restarting router");
      Serial.println("   • Check if network supports 2.4GHz");
      break;
      
    case WL_CONNECTION_LOST:
      Serial.println("❌ Connection lost:");
      Serial.println("   • Signal too weak");
      Serial.println("   • Router rebooted");
      Serial.println("   • Network congestion");
      break;
      
    default:
      Serial.println("❌ Other connection issue:");
      Serial.println("   • Try restarting ESP32");
      Serial.println("   • Check power supply");
      Serial.println("   • Try different WiFi network");
  }
  
  Serial.println();
  Serial.println("💡 General tips:");
  Serial.println("   • Use 2.4GHz network (not 5GHz)");
  Serial.println("   • Move closer to router");
  Serial.println("   • Check for interference");
  Serial.println("   • Restart router if needed");
  Serial.println("   • Update router firmware");
  Serial.println();
}

String getStatusString(wl_status_t status) {
  switch (status) {
    case WL_IDLE_STATUS: return "Idle";
    case WL_NO_SSID_AVAIL: return "Network not found";
    case WL_SCAN_COMPLETED: return "Scan completed";
    case WL_CONNECTED: return "Connected";
    case WL_CONNECT_FAILED: return "Connection failed";
    case WL_CONNECTION_LOST: return "Connection lost";
    case WL_WRONG_PASSWORD: return "Wrong password";
    case WL_DISCONNECTED: return "Disconnected";
    default: return "Unknown (" + String(status) + ")";
  }
}
