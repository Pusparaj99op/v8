# ESP32 WiFi Connection Troubleshooting Guide
## Rescue.net AI - WiFi Connectivity Solutions

### 🔧 Quick Solutions for ESP32 WiFi Issues

## 1. **Immediate Steps to Try**

### Upload the WiFi Test Script
1. Open Arduino IDE
2. Upload `esp32_simple_wifi_test.ino` to your ESP32
3. Open Serial Monitor at **115200 baud**
4. Check the diagnostic output

### Check Network Credentials
```cpp
// Update these in your code:
const char* ssid = "REALME8S5G";           // Your exact WiFi name
const char* password = "09876543211";       // Your exact password
```

## 2. **Common WiFi Issues & Solutions**

### ❌ **"Network not found"**
**Causes:**
- Wrong SSID spelling
- Router is off or restarting
- ESP32 too far from router
- Network is hidden

**Solutions:**
```cpp
// 1. Scan for networks first
WiFi.scanNetworks();

// 2. Check exact SSID spelling
Serial.println("Looking for: " + String(ssid));

// 3. Move ESP32 closer to router (within 10 feet for testing)

// 4. For hidden networks, add:
WiFi.begin(ssid, password, 0, NULL, true);  // true = connect to hidden
```

### ❌ **"Wrong Password"**
**Solutions:**
```cpp
// 1. Double-check password (case sensitive)
// 2. Avoid special characters that might cause issues
// 3. Test with a simple password temporarily

// 4. For WPA2 Enterprise (rare), use:
WiFi.begin(ssid);  // No password for open networks
```

### ❌ **"Connection Failed"**
**Causes:**
- Router overloaded
- MAC address filtering
- ESP32 trying to connect to 5GHz instead of 2.4GHz

**Solutions:**
```cpp
// 1. Set WiFi mode explicitly
WiFi.mode(WIFI_STA);

// 2. Increase connection timeout
while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(1000);  // Longer delay
    attempts++;
}

// 3. Try different power settings
WiFi.setTxPower(WIFI_POWER_19_5dBm);  // Maximum power
```

### ❌ **Connection Keeps Dropping**
**Solutions:**
```cpp
// 1. Disable power saving
WiFi.setSleep(false);

// 2. Add connection monitoring
void loop() {
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("Reconnecting...");
        WiFi.reconnect();
    }
    delay(5000);
}

// 3. Use static IP (optional)
IPAddress local_IP(192, 168, 1, 100);    // Choose unused IP
IPAddress gateway(192, 168, 1, 1);       // Usually router IP
IPAddress subnet(255, 255, 255, 0);
WiFi.config(local_IP, gateway, subnet);
```

## 3. **Hardware Troubleshooting**

### Check ESP32 Board
- **Use 3.3V power supply** (not 5V)
- **Check USB cable** (data cable, not power-only)
- **Try different ESP32 board** if available

### Antenna Issues
- **Built-in antenna**: Keep away from metal objects
- **External antenna**: Check connection if using external
- **Signal strength**: Should be > -70 dBm for reliable connection

### Power Supply
```cpp
// Check voltage in code
float voltage = (analogRead(A0) / 4095.0) * 3.3 * 2;  // If using voltage divider
Serial.println("Supply voltage: " + String(voltage) + "V");
```

## 4. **Router Configuration**

### Router Settings to Check
1. **Enable 2.4GHz band** (ESP32 doesn't support 5GHz)
2. **Security**: Use WPA2-PSK (not WPA3 or WEP)
3. **Channel**: Try channels 1, 6, or 11
4. **SSID broadcast**: Enable (not hidden)
5. **MAC filtering**: Disable or add ESP32 MAC

### Router Restart
1. Unplug router for 30 seconds
2. Plug back in and wait 2 minutes
3. Try ESP32 connection again

## 5. **Code Templates**

### Basic Connection Test
```cpp
#include <WiFi.h>

const char* ssid = "YOUR_SSID";
const char* password = "YOUR_PASSWORD";

void setup() {
  Serial.begin(115200);
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println();
  Serial.println("WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Your main code here
}
```

### Robust Connection with Retry
```cpp
bool connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(1000);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
    
    if (attempts % 10 == 0) {
      Serial.println();
      Serial.println("Status: " + getWiFiStatus());
    }
  }
  
  return (WiFi.status() == WL_CONNECTED);
}
```

## 6. **Alternative Solutions**

### Use Ethernet (if available)
```cpp
#include <ETH.h>

void setup() {
  ETH.begin();
  // More reliable for stationary devices
}
```

### Hotspot Mode for Configuration
```cpp
void startHotspot() {
  WiFi.mode(WIFI_AP);
  WiFi.softAP("ESP32-Config", "12345678");
  
  Serial.println("Hotspot started");
  Serial.println("Connect to ESP32-Config and visit 192.168.4.1");
}
```

### Use WiFiManager Library
```cpp
#include <WiFiManager.h>

void setup() {
  WiFiManager wm;
  
  // Reset settings for testing
  // wm.resetSettings();
  
  if (!wm.autoConnect("ESP32-AutoConnect")) {
    Serial.println("Failed to connect");
    ESP.restart();
  }
  
  Serial.println("Connected!");
}
```

## 7. **Step-by-Step Debugging**

### Debug Checklist
1. ✅ **Power**: ESP32 has stable 3.3V power
2. ✅ **Code**: SSID and password are exactly correct
3. ✅ **Network**: Router is on and broadcasting 2.4GHz
4. ✅ **Distance**: ESP32 is close to router (< 10 feet)
5. ✅ **Serial**: Monitor shows connection attempts
6. ✅ **Status**: Check WiFi.status() error codes

### Serial Monitor Output Analysis
```
Good output:
✅ "Connecting to WiFi..."
✅ "WiFi connected!"
✅ "IP address: 192.168.1.100"

Bad output:
❌ "Network not found" → Check SSID
❌ "Wrong password" → Check password
❌ "Connection failed" → Check router settings
❌ Continuous dots → Check power/hardware
```

## 8. **When All Else Fails**

### Factory Reset ESP32
```cpp
#include <EEPROM.h>

void setup() {
  // Clear all stored WiFi credentials
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
  
  // Format SPIFFS if used
  SPIFFS.format();
  
  ESP.restart();
}
```

### Contact Support
If nothing works:
1. 📧 **Email**: Include serial monitor output
2. 📱 **Hardware**: Test with different ESP32 board
3. 🔧 **Network**: Test with mobile hotspot
4. 💻 **Computer**: Try different computer/Arduino IDE

## 🚀 **Quick Start Commands**

```bash
# 1. Upload WiFi test code
# 2. Open Serial Monitor (115200 baud)
# 3. Check output for specific error
# 4. Follow solution for that error type
# 5. Test with mobile hotspot if router issues persist
```

---
*For Rescue.net AI technical support: rescue.net.ai@gmail.com*
