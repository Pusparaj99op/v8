/*
 * Rescue.net AI - ESP32 Main Controller (Memory Optimized)
 * 
 * This is a memory-optimized version addressing the 86% program storage usage
 * Key optimizations:
 * - Replaced String objects with const char* and char arrays
 * - Used PROGMEM for constant strings
 * - Optimized data structures
 * - Reduced library dependencies where possible
 * 
 * Author: Rescue.net AI Team
 * Date: June 2025
 * Version: 1.1 (Optimized)
 */

#include <WiFi.h>
#include <WiFiClient.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <HardwareSerial.h>
#include <SPI.h>
#include <SD.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <time.h>
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>
#include <freertos/semphr.h>

// Pin Definitions
#define GSM_RX_PIN 16
#define GSM_TX_PIN 17
#define GPS_RX_PIN 4
#define GPS_TX_PIN 2
#define ARDUINO_RX_PIN 32
#define ARDUINO_TX_PIN 33
#define SD_CS_PIN 5
#define BUZZER_PIN 25
#define VIBRATOR_1_PIN 26
#define VIBRATOR_2_PIN 27
#define LED_PIN 2
#define SDA_PIN 21
#define SCL_PIN 22

// Display Configuration
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define SCREEN_ADDRESS 0x3C

// Network Configuration - Using PROGMEM to save RAM
const char WIFI_SSID[] PROGMEM = "REALME8S5G";
const char WIFI_PASSWORD[] PROGMEM = "09876543211";
const char API_BASE_URL[] PROGMEM = "http://192.168.1.9:3000";
const char TELEGRAM_BOT_TOKEN[] PROGMEM = "7376536635:AAE96RuoPQX3QOPn6nmXy-3c1RoDSFuymTk";

// Emergency Configuration - Using const char* instead of String
const char* EMERGENCY_PHONE = "+919067463863";
const char* EMERGENCY_PHONE_2 = "+918180890990";
const char* TELEGRAM_CHAT_ID = "-1002417142987,1631087839,7376536635";

// Emergency messages in PROGMEM
const char EMERGENCY_MSG_FALL[] PROGMEM = "EMERGENCY: Fall detected!";
const char EMERGENCY_MSG_HEART[] PROGMEM = "EMERGENCY: Heart rate anomaly!";
const char EMERGENCY_MSG_TEMP[] PROGMEM = "EMERGENCY: Temperature anomaly!";

// Global Objects
HardwareSerial gsmSerial(1);
HardwareSerial gpsSerial(2);
HardwareSerial arduinoSerial(0);
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

// FreeRTOS Handles
TaskHandle_t sensorTaskHandle;
TaskHandle_t communicationTaskHandle;
TaskHandle_t displayTaskHandle;
TaskHandle_t emergencyTaskHandle;

// Semaphores for thread safety
SemaphoreHandle_t sensorDataMutex;
SemaphoreHandle_t displayMutex;

// Optimized Data Structures - Using smaller data types
struct SensorData {
  uint16_t heartRate;        // 0-300 BPM range
  int16_t temperature;       // Temperature * 100 (e.g., 3672 = 36.72°C)
  uint16_t bloodPressure;    // Systolic pressure
  int16_t accelerationX;     // Acceleration * 1000
  int16_t accelerationY;
  int16_t accelerationZ;
  bool fallDetected;
  uint32_t timestamp;
};

struct GPSData {
  float latitude;
  float longitude;
  uint16_t altitude;         // Altitude in meters
  uint8_t satellites;
  bool isValid;
  uint32_t timestamp;
};

struct SystemStatus {
  bool wifiConnected    : 1;
  bool gsmConnected     : 1;
  bool gpsActive        : 1;
  bool sdCardReady      : 1;
  bool emergencyMode    : 1;
  uint8_t batteryLevel  : 7; // 0-100%
};

// Global Variables
SensorData currentSensorData;
GPSData currentGPSData;
SystemStatus systemStatus;
char deviceId[20];  // Fixed size instead of String
uint32_t lastHeartbeat = 0;
uint32_t lastDataLog = 0;
bool emergencyTriggered = false;

// Function Prototypes
void initializeSystem();
void sensorTask(void* parameter);
void communicationTask(void* parameter);
void displayTask(void* parameter);
void emergencyTask(void* parameter);
bool readSensorData();
bool readGPSData();
void logDataToSD();
void sendDataToCloud();
void sendEmergencyAlert(const char* message);
void updateDisplay();
void checkWiFiConnection();
void playStartupSound();
void printMemoryUsage();

void setup() {
  Serial.begin(115200);
  Serial.println(F("Rescue.net AI - Starting up..."));
  
  // Generate device ID
  uint64_t mac = ESP.getEfuseMac();
  snprintf(deviceId, sizeof(deviceId), "RESCUE_%08X", (uint32_t)(mac >> 32));
  
  initializeSystem();
  
  // Create FreeRTOS tasks with optimized stack sizes
  xTaskCreatePinnedToCore(sensorTask, "SensorTask", 2048, NULL, 2, &sensorTaskHandle, 0);
  xTaskCreatePinnedToCore(communicationTask, "CommTask", 4096, NULL, 1, &communicationTaskHandle, 1);
  xTaskCreatePinnedToCore(displayTask, "DisplayTask", 2048, NULL, 1, &displayTaskHandle, 0);
  xTaskCreatePinnedToCore(emergencyTask, "EmergencyTask", 3072, NULL, 3, &emergencyTaskHandle, 1);
  
  // Create semaphores
  sensorDataMutex = xSemaphoreCreateMutex();
  displayMutex = xSemaphoreCreateMutex();
  
  Serial.println(F("System initialized successfully"));
  playStartupSound();
  
  // Print initial memory usage
  printMemoryUsage();
}

void loop() {
  // Main loop kept minimal - everything handled by FreeRTOS tasks
  vTaskDelay(pdMS_TO_TICKS(1000));
  
  // Periodic memory monitoring (every 30 seconds)
  static uint32_t lastMemCheck = 0;
  if (millis() - lastMemCheck > 30000) {
    printMemoryUsage();
    lastMemCheck = millis();
  }
}

void initializeSystem() {
  // Initialize pins
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(VIBRATOR_1_PIN, OUTPUT);
  pinMode(VIBRATOR_2_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  
  // Initialize I2C
  Wire.begin(SDA_PIN, SCL_PIN);
  
  // Initialize display
  if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println(F("SSD1306 allocation failed"));
  } else {
    Serial.println(F("OLED Display initialized"));
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println(F("Rescue.net AI"));
    display.println(F("Initializing..."));
    display.display();
  }
  
  // Initialize SD card
  if (!SD.begin(SD_CS_PIN)) {
    Serial.println(F("SD card initialization failed"));
    systemStatus.sdCardReady = false;
  } else {
    Serial.println(F("SD card initialized"));
    systemStatus.sdCardReady = true;
  }
  
  // Initialize serial communications
  gsmSerial.begin(9600, SERIAL_8N1, GSM_RX_PIN, GSM_TX_PIN);
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  
  Serial.println(F("Connecting to WiFi..."));
  char ssid[32], password[32];
  strcpy_P(ssid, WIFI_SSID);
  strcpy_P(password, WIFI_PASSWORD);
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(F("."));
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    systemStatus.wifiConnected = true;
    Serial.println(F("WiFi connected"));
    Serial.print(F("IP address: "));
    Serial.println(WiFi.localIP());
    
    // Configure time
    configTime(19800, 0, "pool.ntp.org"); // IST offset
  } else {
    systemStatus.wifiConnected = false;
    Serial.println(F("WiFi connection failed"));
  }
}

void sensorTask(void* parameter) {
  Serial.println(F("Sensor task started"));
  
  while (1) {
    if (readSensorData()) {
      // Check for emergency conditions
      if (currentSensorData.fallDetected || 
          currentSensorData.heartRate > 120 || 
          currentSensorData.heartRate < 50 ||
          currentSensorData.temperature > 3800 || // 38.00°C
          currentSensorData.temperature < 3500) { // 35.00°C
        
        if (!emergencyTriggered) {
          emergencyTriggered = true;
          systemStatus.emergencyMode = true;
          
          // Notify emergency task
          xTaskNotify(emergencyTaskHandle, 1, eSetBits);
        }
      }
      
      // Log data every 5 seconds
      if (millis() - lastDataLog > 5000) {
        logDataToSD();
        lastDataLog = millis();
      }
    }
    
    vTaskDelay(pdMS_TO_TICKS(1000)); // Read sensors every second
  }
}

void communicationTask(void* parameter) {
  Serial.println(F("Communication task started"));
  
  while (1) {
    // Send heartbeat every 30 seconds
    if (millis() - lastHeartbeat > 30000) {
      if (systemStatus.wifiConnected) {
        sendDataToCloud();
      }
      lastHeartbeat = millis();
    }
    
    // Check WiFi connection
    checkWiFiConnection();
    
    // Read GPS data
    readGPSData();
    
    vTaskDelay(pdMS_TO_TICKS(5000)); // Check every 5 seconds
  }
}

void displayTask(void* parameter) {
  Serial.println(F("Display task started"));
  
  while (1) {
    if (xSemaphoreTake(displayMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
      updateDisplay();
      xSemaphoreGive(displayMutex);
    }
    
    vTaskDelay(pdMS_TO_TICKS(2000)); // Update display every 2 seconds
  }
}

void emergencyTask(void* parameter) {
  Serial.println(F("Emergency task started"));
  uint32_t notificationValue;
  
  while (1) {
    // Wait for emergency notification
    if (xTaskNotifyWait(0, 0xFFFFFFFF, &notificationValue, pdMS_TO_TICKS(1000)) == pdTRUE) {
      Serial.println(F("Emergency detected!"));
      
      // Determine emergency type and send appropriate message
      const char* message;
      if (currentSensorData.fallDetected) {
        message = EMERGENCY_MSG_FALL;
      } else if (currentSensorData.heartRate > 120 || currentSensorData.heartRate < 50) {
        message = EMERGENCY_MSG_HEART;
      } else {
        message = EMERGENCY_MSG_TEMP;
      }
      
      sendEmergencyAlert(message);
      
      // Reset emergency trigger after 60 seconds
      vTaskDelay(pdMS_TO_TICKS(60000));
      emergencyTriggered = false;
      systemStatus.emergencyMode = false;
    }
  }
}

bool readSensorData() {
  // Simplified sensor reading - replace with actual sensor code
  if (Serial.available()) {
    String data = Serial.readStringUntil('\n');
    
    // Parse sensor data (format: HR:75,TEMP:3672,BP:120,AX:100,AY:50,AZ:1000,FALL:0)
    if (data.startsWith("HR:")) {
      if (xSemaphoreTake(sensorDataMutex, pdMS_TO_TICKS(100)) == pdTRUE) {
        sscanf(data.c_str(), "HR:%hu,TEMP:%hd,BP:%hu,AX:%hd,AY:%hd,AZ:%hd,FALL:%d",
               &currentSensorData.heartRate,
               &currentSensorData.temperature,
               &currentSensorData.bloodPressure,
               &currentSensorData.accelerationX,
               &currentSensorData.accelerationY,
               &currentSensorData.accelerationZ,
               (int*)&currentSensorData.fallDetected);
        
        currentSensorData.timestamp = millis();
        xSemaphoreGive(sensorDataMutex);
        return true;
      }
    }
  }
  return false;
}

bool readGPSData() {
  // Simplified GPS reading - implement NMEA parsing
  if (gpsSerial.available()) {
    String gpsData = gpsSerial.readStringUntil('\n');
    
    if (gpsData.startsWith("$GPGGA")) {
      // Parse GPS data
      currentGPSData.isValid = true;
      currentGPSData.timestamp = millis();
      return true;
    }
  }
  return false;
}

void logDataToSD() {
  if (!systemStatus.sdCardReady) return;
  
  File dataFile = SD.open("/sensor_data.csv", FILE_APPEND);
  if (dataFile) {
    // Use fixed-point arithmetic for temperature display
    dataFile.printf("%lu,%u,%d.%02d,%u,%d,%d,%d,%d\n",
                    currentSensorData.timestamp,
                    currentSensorData.heartRate,
                    currentSensorData.temperature / 100,
                    currentSensorData.temperature % 100,
                    currentSensorData.bloodPressure,
                    currentSensorData.accelerationX,
                    currentSensorData.accelerationY,
                    currentSensorData.accelerationZ,
                    currentSensorData.fallDetected);
    dataFile.close();
  }
}

void sendDataToCloud() {
  if (!systemStatus.wifiConnected) return;
  
  HTTPClient http;
  char url[64];
  strcpy_P(url, API_BASE_URL);
  strcat(url, "/api/sensor-data");
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  // Use StaticJsonDocument for memory efficiency
  StaticJsonDocument<512> doc;
  doc["deviceId"] = deviceId;
  doc["timestamp"] = currentSensorData.timestamp;
  doc["heartRate"] = currentSensorData.heartRate;
  doc["temperature"] = currentSensorData.temperature / 100.0;
  doc["bloodPressure"] = currentSensorData.bloodPressure;
  doc["fallDetected"] = currentSensorData.fallDetected;
  
  if (currentGPSData.isValid) {
    doc["latitude"] = currentGPSData.latitude;
    doc["longitude"] = currentGPSData.longitude;
  }
  
  char jsonString[512];
  serializeJson(doc, jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode > 0) {
    Serial.printf("HTTP Response: %d\n", httpResponseCode);
  } else {
    Serial.printf("HTTP Error: %s\n", http.errorToString(httpResponseCode).c_str());
  }
  
  http.end();
}

void sendEmergencyAlert(const char* messageType) {
  char message[256];
  char tempStr[16];
  
  // Convert fixed-point temperature to string
  snprintf(tempStr, sizeof(tempStr), "%d.%02d", 
           currentSensorData.temperature / 100,
           currentSensorData.temperature % 100);
  
  // Build emergency message
  snprintf(message, sizeof(message),
           "%s Device: %s, HR: %u BPM, Temp: %s°C, Time: %lu",
           messageType, deviceId, currentSensorData.heartRate,
           tempStr, currentSensorData.timestamp);
  
  if (currentGPSData.isValid) {
    char locationStr[64];
    snprintf(locationStr, sizeof(locationStr), ", Location: %.6f,%.6f",
             currentGPSData.latitude, currentGPSData.longitude);
    strcat(message, locationStr);
  }
  
  // Send SMS
  gsmSerial.println("AT+CMGF=1");
  delay(1000);
  
  gsmSerial.print("AT+CMGS=\"");
  gsmSerial.print(EMERGENCY_PHONE);
  gsmSerial.println("\"");
  delay(1000);
  
  gsmSerial.print(message);
  gsmSerial.write(26); // Ctrl+Z to send
  delay(5000);
  
  Serial.println(F("Emergency SMS sent"));
}

void updateDisplay() {
  display.clearDisplay();
  display.setCursor(0, 0);
  display.setTextSize(1);
  
  if (systemStatus.emergencyMode) {
    display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
    display.println(F(" EMERGENCY MODE "));
    display.setTextColor(SSD1306_WHITE);
  } else {
    display.println(F("Rescue.net AI"));
  }
  
  display.printf("HR: %u BPM\n", currentSensorData.heartRate);
  display.printf("Temp: %d.%02d C\n", 
                currentSensorData.temperature / 100,
                currentSensorData.temperature % 100);
  display.printf("BP: %u mmHg\n", currentSensorData.bloodPressure);
  
  // Status icons
  display.printf("WiFi:%c GPS:%c SD:%c\n",
                systemStatus.wifiConnected ? 'Y' : 'N',
                systemStatus.gpsActive ? 'Y' : 'N',
                systemStatus.sdCardReady ? 'Y' : 'N');
  
  if (currentGPSData.isValid) {
    display.printf("Sat: %u\n", currentGPSData.satellites);
  }
  
  display.display();
}

void checkWiFiConnection() {
  if (WiFi.status() != WL_CONNECTED) {
    systemStatus.wifiConnected = false;
    
    Serial.println(F("WiFi disconnected, reconnecting..."));
    WiFi.reconnect();
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 10) {
      delay(500);
      attempts++;
    }
    
    systemStatus.wifiConnected = (WiFi.status() == WL_CONNECTED);
  }
}

void playStartupSound() {
  // Optimized startup melody
  const uint16_t melody[] PROGMEM = {262, 294, 330, 349, 392, 440, 494, 523};
  const uint8_t noteDurations[] PROGMEM = {4, 4, 4, 4, 4, 4, 4, 2};
  
  for (int i = 0; i < 8; i++) {
    uint16_t freq = pgm_read_word(&melody[i]);
    uint8_t duration = pgm_read_byte(&noteDurations[i]);
    int noteDuration = 1000 / duration;
    
    tone(BUZZER_PIN, freq, noteDuration);
    delay(noteDuration * 1.30);
    noTone(BUZZER_PIN);
  }
}

void printMemoryUsage() {
  Serial.printf("Free heap: %d bytes\n", ESP.getFreeHeap());
  Serial.printf("Min free heap: %d bytes\n", ESP.getMinFreeHeap());
  Serial.printf("Heap size: %d bytes\n", ESP.getHeapSize());
  Serial.printf("Free PSRAM: %d bytes\n", ESP.getFreePsram());
}
