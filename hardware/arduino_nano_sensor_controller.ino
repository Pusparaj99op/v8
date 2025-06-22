/*
 * Rescue.net AI - Arduino Nano Sensor Controller
 * 
 * This code handles:
 * - Heart rate monitoring (REES52 Pulse Sensor)
 * - Temperature measurement (DS18B20)
 * - Accelerometer data processing (ADXL335)
 * - Fall detection algorithms
 * - Communication with ESP32 main controller
 * 
 * Author: Rescue.net AI Team
 * Date: June 2025
 * Version: 1.0
 */

#include <SoftwareSerial.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// Pin Definitions
#define PULSE_INPUT_PIN A0
#define PULSE_BLINK_PIN 13
#define PULSE_FADE_PIN 5
#define ACCEL_X_PIN A1
#define ACCEL_Y_PIN A2
#define ACCEL_Z_PIN A3
#define TEMP_SENSOR_PIN 4
#define ESP32_TX_PIN 2
#define ESP32_RX_PIN 3

// Pulse Sensor Configuration
#define PULSE_THRESHOLD 700
#define PULSE_SAMPLE_INTERVAL 2
#define PULSE_SAMPLES_TO_AVERAGE 50

// Accelerometer Configuration
#define ACCEL_SAMPLES 10
#define FALL_THRESHOLD 2.5
#define FALL_TIME_THRESHOLD 1000

// Temperature Configuration
#define TEMP_PRECISION 12

// Communication Configuration
SoftwareSerial esp32Serial(ESP32_RX_PIN, ESP32_TX_PIN);

// Temperature sensor setup
OneWire oneWire(TEMP_SENSOR_PIN);
DallasTemperature temperatureSensor(&oneWire);

// Global Variables
volatile int pulseReading;
volatile int IBI = 600;                // Inter-Beat Interval (ms)
volatile boolean Pulse = false;
volatile boolean QS = false;           // Quantified Self flag
volatile int rate[10];                 // Array to hold last 10 IBI values
volatile unsigned long sampleCounter = 0;
volatile unsigned long lastBeatTime = 0;
volatile int P = 512;                  // Peak value
volatile int T = 512;                  // Trough value
volatile int thresh = 525;             // Threshold
volatile int amp = 100;                // Amplitude
volatile boolean firstBeat = true;
volatile boolean secondBeat = false;

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

// Fall detection variables
float previousAcceleration = 9.8;
unsigned long fallStartTime = 0;
boolean fallInProgress = false;

// Communication variables
String receivedCommand = "";
unsigned long lastDataSend = 0;

void setup() {
  Serial.begin(9600);
  esp32Serial.begin(9600);
  
  Serial.println("Rescue.net AI - Arduino Nano Sensor Controller");
  Serial.println("Initializing sensors...");
  
  // Initialize pins
  pinMode(PULSE_BLINK_PIN, OUTPUT);
  pinMode(PULSE_FADE_PIN, OUTPUT);
  
  // Initialize temperature sensor
  temperatureSensor.begin();
  temperatureSensor.setResolution(TEMP_PRECISION);
  
  // Initialize pulse sensor interrupt
  interruptSetup();
  
  // Initialize sensor readings
  currentReadings.heartRate = 0.0;
  currentReadings.temperature = 0.0;
  currentReadings.accelerationX = 0.0;
  currentReadings.accelerationY = 0.0;
  currentReadings.accelerationZ = 0.0;
  currentReadings.totalAcceleration = 0.0;
  currentReadings.fallDetected = false;
  currentReadings.timestamp = 0;
  
  Serial.println("Sensor controller initialized successfully");
  delay(2000);
}

void loop() {
  // Handle communication with ESP32
  handleESP32Communication();
  
  // Read temperature sensor
  readTemperature();
  
  // Read accelerometer data
  readAccelerometer();
  
  // Detect falls
  detectFalls();
  
  // Process pulse sensor data
  processPulseData();
  
  // Send data periodically (every 5 seconds)
  if (millis() - lastDataSend > 5000) {
    sendSensorData();
    lastDataSend = millis();
  }
  
  delay(20);  // Small delay for stability
}

void interruptSetup() {
  // Timer2 interrupt setup for pulse sensor
  TCCR2A = 0x02;     // CTC mode
  TCCR2B = 0x06;     // prescaler = 256
  OCR2A = 0X7C;      // compare match register (124)
  TIMSK2 = 0x02;     // enable compare match interrupt
}

// Timer2 interrupt service routine
ISR(TIMER2_COMPA_vect) {
  cli();
  pulseReading = analogRead(PULSE_INPUT_PIN);
  sampleCounter += 2;
  int N = sampleCounter - lastBeatTime;

  // Find the peak and trough of the pulse wave
  if (pulseReading < thresh && N > (IBI / 5) * 3) {
    if (pulseReading < T) {
      T = pulseReading;
    }
  }

  if (pulseReading > thresh && pulseReading > P) {
    P = pulseReading;
  }

  // Look for the heart beat
  if (N > 250) {
    if ((pulseReading > thresh) && (Pulse == false) && (N > (IBI / 5) * 3)) {
      Pulse = true;
      digitalWrite(PULSE_BLINK_PIN, HIGH);
      IBI = sampleCounter - lastBeatTime;
      lastBeatTime = sampleCounter;

      if (secondBeat) {
        secondBeat = false;
        for (int i = 0; i <= 9; i++) {
          rate[i] = IBI;
        }
      }

      if (firstBeat) {
        firstBeat = false;
        secondBeat = true;
        sei();
        return;
      }

      // Calculate running average of last 10 heart beats
      word runningTotal = 0;
      for (int i = 0; i <= 8; i++) {
        rate[i] = rate[i + 1];
        runningTotal += rate[i];
      }

      rate[9] = IBI;
      runningTotal += rate[9];
      runningTotal /= 10;
      currentReadings.heartRate = 60000.0 / runningTotal;
      QS = true;
    }
  }

  if (pulseReading < thresh && Pulse == true) {
    digitalWrite(PULSE_BLINK_PIN, LOW);
    Pulse = false;
    amp = P - T;
    thresh = amp / 2 + T;
    P = thresh;
    T = thresh;
  }

  if (N > 2500) {
    thresh = 512;
    P = 512;
    T = 512;
    lastBeatTime = sampleCounter;
    firstBeat = true;
    secondBeat = false;
    QS = false;
    currentReadings.heartRate = 0;
  }

  sei();
}

void readTemperature() {
  static unsigned long lastTempRead = 0;
  
  // Read temperature every 2 seconds
  if (millis() - lastTempRead > 2000) {
    temperatureSensor.requestTemperatures();
    
    // Wait for conversion to complete
    delay(100);
    
    float tempC = temperatureSensor.getTempCByIndex(0);
    
    if (tempC != DEVICE_DISCONNECTED_C) {
      currentReadings.temperature = tempC;
    } else {
      Serial.println("Error: Temperature sensor disconnected");
    }
    
    lastTempRead = millis();
  }
}

void readAccelerometer() {
  // Read accelerometer values
  int rawX = analogRead(ACCEL_X_PIN);
  int rawY = analogRead(ACCEL_Y_PIN);
  int rawZ = analogRead(ACCEL_Z_PIN);
  
  // Convert to g-force (assuming 3.3V supply and ADXL335 sensitivity)
  // ADXL335: 300mV/g, with 1.65V zero-g offset
  float supplyVoltage = 3.3;
  float zeroGVoltage = supplyVoltage / 2.0;
  float sensitivity = 0.3; // 300mV per g
  
  currentReadings.accelerationX = ((rawX * supplyVoltage / 1023.0) - zeroGVoltage) / sensitivity;
  currentReadings.accelerationY = ((rawY * supplyVoltage / 1023.0) - zeroGVoltage) / sensitivity;
  currentReadings.accelerationZ = ((rawZ * supplyVoltage / 1023.0) - zeroGVoltage) / sensitivity;
  
  // Calculate total acceleration magnitude
  currentReadings.totalAcceleration = sqrt(
    currentReadings.accelerationX * currentReadings.accelerationX +
    currentReadings.accelerationY * currentReadings.accelerationY +
    currentReadings.accelerationZ * currentReadings.accelerationZ
  );
}

void detectFalls() {
  static float accelerationHistory[5] = {9.8, 9.8, 9.8, 9.8, 9.8};
  static int historyIndex = 0;
  static unsigned long fallDetectionTime = 0;
  
  // Update acceleration history
  accelerationHistory[historyIndex] = currentReadings.totalAcceleration;
  historyIndex = (historyIndex + 1) % 5;
  
  // Calculate average acceleration over last 5 readings
  float avgAcceleration = 0;
  for (int i = 0; i < 5; i++) {
    avgAcceleration += accelerationHistory[i];
  }
  avgAcceleration /= 5.0;
  
  // Fall detection algorithm
  // Phase 1: Detect sudden drop in acceleration (free fall)
  if (!fallInProgress && avgAcceleration < 6.0) {  // Less than 6g indicates possible free fall
    fallInProgress = true;
    fallStartTime = millis();
    Serial.println("Possible fall detected - Phase 1 (Free fall)");
  }
  
  // Phase 2: Detect high impact after free fall
  if (fallInProgress && (millis() - fallStartTime < 2000)) {
    if (currentReadings.totalAcceleration > 15.0) {  // High impact detected
      currentReadings.fallDetected = true;
      fallDetectionTime = millis();
      Serial.println("FALL CONFIRMED - Phase 2 (Impact detected)");
      
      // Send immediate alert
      sendEmergencyAlert();
      fallInProgress = false;
    }
  }
  
  // Reset fall detection if too much time has passed
  if (fallInProgress && (millis() - fallStartTime > 2000)) {
    fallInProgress = false;
    Serial.println("Fall detection timeout - resetting");
  }
  
  // Clear fall flag after 10 seconds
  if (currentReadings.fallDetected && (millis() - fallDetectionTime > 10000)) {
    currentReadings.fallDetected = false;
  }
}

void processPulseData() {
  // Fade LED based on pulse
  if (QS) {
    fadeRate = 255;
    QS = false;
  }
  
  static int fadeRate = 0;
  if (fadeRate > 0) {
    fadeRate -= 15;
    if (fadeRate < 0) fadeRate = 0;
  }
  
  analogWrite(PULSE_FADE_PIN, fadeRate);
  
  // Validate heart rate readings
  if (currentReadings.heartRate < 30 || currentReadings.heartRate > 200) {
    // Invalid reading, use previous valid reading or set to 0
    static float lastValidHeartRate = 0;
    if (lastValidHeartRate > 0) {
      currentReadings.heartRate = lastValidHeartRate;
    } else {
      currentReadings.heartRate = 0;
    }
  } else {
    // Valid reading, store it
    static float lastValidHeartRate = currentReadings.heartRate;
  }
}

void handleESP32Communication() {
  // Check for commands from ESP32
  if (esp32Serial.available()) {
    String command = esp32Serial.readStringUntil('\n');
    command.trim();
    
    if (command == "GET_SENSORS") {
      sendSensorData();
    } else if (command == "CALIBRATE") {
      calibrateSensors();
    } else if (command == "RESET") {
      resetSensorData();
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
  
  esp32Serial.println(dataString);
  
  // Also send to serial monitor for debugging
  Serial.println("Sensor Data: " + dataString);
}

void sendEmergencyAlert() {
  // Send immediate emergency alert to ESP32
  String alertString = "EMERGENCY:FALL_DETECTED,";
  alertString += "HR:" + String(currentReadings.heartRate, 1) + ",";
  alertString += "TEMP:" + String(currentReadings.temperature, 1) + ",";
  alertString += "TIME:" + String(millis());
  
  esp32Serial.println(alertString);
  Serial.println("Emergency alert sent: " + alertString);
}

float estimateBloodPressure() {
  // Simplified blood pressure estimation based on heart rate and other factors
  // This is a very basic estimation and should not be used for medical diagnosis
  
  if (currentReadings.heartRate == 0) {
    return 0.0;
  }
  
  // Basic estimation formula (not medically accurate)
  float systolic = 80 + (currentReadings.heartRate - 60) * 0.5;
  
  // Adjust for temperature (hyperthermia can increase BP)
  if (currentReadings.temperature > 37.5) {
    systolic += (currentReadings.temperature - 37.5) * 2;
  }
  
  // Constrain to reasonable values
  if (systolic < 80) systolic = 80;
  if (systolic > 180) systolic = 180;
  
  return systolic;
}

void calibrateSensors() {
  Serial.println("Calibrating sensors...");
  
  // Calibrate accelerometer by finding zero-g offsets
  float sumX = 0, sumY = 0, sumZ = 0;
  int samples = 100;
  
  for (int i = 0; i < samples; i++) {
    int rawX = analogRead(ACCEL_X_PIN);
    int rawY = analogRead(ACCEL_Y_PIN);
    int rawZ = analogRead(ACCEL_Z_PIN);
    
    sumX += rawX;
    sumY += rawY;
    sumZ += rawZ;
    
    delay(10);
  }
  
  // Calculate averages (these would be stored in EEPROM in a real implementation)
  float avgX = sumX / samples;
  float avgY = sumY / samples;
  float avgZ = sumZ / samples;
  
  Serial.println("Accelerometer calibration complete");
  Serial.println("X offset: " + String(avgX));
  Serial.println("Y offset: " + String(avgY));
  Serial.println("Z offset: " + String(avgZ));
  
  // Reset pulse sensor parameters
  thresh = 512;
  P = 512;
  T = 512;
  firstBeat = true;
  secondBeat = false;
  currentReadings.heartRate = 0;
  
  Serial.println("Pulse sensor reset complete");
  
  esp32Serial.println("CALIBRATION_COMPLETE");
}

void resetSensorData() {
  // Reset all sensor data to default values
  currentReadings.heartRate = 0.0;
  currentReadings.temperature = 0.0;
  currentReadings.accelerationX = 0.0;
  currentReadings.accelerationY = 0.0;
  currentReadings.accelerationZ = 0.0;
  currentReadings.totalAcceleration = 0.0;
  currentReadings.fallDetected = false;
  currentReadings.timestamp = 0;
  
  // Reset pulse sensor
  thresh = 512;
  P = 512;
  T = 512;
  firstBeat = true;
  secondBeat = false;
  QS = false;
  
  fallInProgress = false;
  
  Serial.println("Sensor data reset complete");
  esp32Serial.println("RESET_COMPLETE");
}

void printSensorStatus() {
  // Print detailed sensor status for debugging
  Serial.println("=== SENSOR STATUS ===");
  Serial.println("Heart Rate: " + String(currentReadings.heartRate, 1) + " BPM");
  Serial.println("Temperature: " + String(currentReadings.temperature, 2) + " °C");
  Serial.println("Acceleration X: " + String(currentReadings.accelerationX, 2) + " g");
  Serial.println("Acceleration Y: " + String(currentReadings.accelerationY, 2) + " g");
  Serial.println("Acceleration Z: " + String(currentReadings.accelerationZ, 2) + " g");
  Serial.println("Total Acceleration: " + String(currentReadings.totalAcceleration, 2) + " g");
  Serial.println("Fall Detected: " + String(currentReadings.fallDetected ? "YES" : "NO"));
  Serial.println("Estimated BP: " + String(estimateBloodPressure(), 1) + " mmHg");
  Serial.println("Timestamp: " + String(currentReadings.timestamp));
  Serial.println("====================");
}

// Advanced fall detection with multiple algorithms
bool advancedFallDetection() {
  static float accelBuffer[20];
  static int bufferIndex = 0;
  static bool bufferFull = false;
  
  // Fill circular buffer
  accelBuffer[bufferIndex] = currentReadings.totalAcceleration;
  bufferIndex = (bufferIndex + 1) % 20;
  
  if (bufferIndex == 0) {
    bufferFull = true;
  }
  
  if (!bufferFull) {
    return false;  // Not enough data yet
  }
  
  // Algorithm 1: Sudden acceleration change
  float maxChange = 0;
  for (int i = 1; i < 20; i++) {
    int prevIndex = (bufferIndex + i - 1) % 20;
    int currIndex = (bufferIndex + i) % 20;
    float change = abs(accelBuffer[currIndex] - accelBuffer[prevIndex]);
    if (change > maxChange) {
      maxChange = change;
    }
  }
  
  // Algorithm 2: Standard deviation analysis
  float mean = 0;
  for (int i = 0; i < 20; i++) {
    mean += accelBuffer[i];
  }
  mean /= 20.0;
  
  float variance = 0;
  for (int i = 0; i < 20; i++) {
    variance += (accelBuffer[i] - mean) * (accelBuffer[i] - mean);
  }
  variance /= 20.0;
  float stdDev = sqrt(variance);
  
  // Fall detected if both conditions are met
  return (maxChange > 8.0 && stdDev > 3.0);
}

// Heart rate variability analysis
float calculateHRV() {
  if (!QS) return 0.0;
  
  // Calculate standard deviation of RR intervals
  float mean = 0;
  for (int i = 0; i < 10; i++) {
    mean += rate[i];
  }
  mean /= 10.0;
  
  float variance = 0;
  for (int i = 0; i < 10; i++) {
    variance += (rate[i] - mean) * (rate[i] - mean);
  }
  variance /= 10.0;
  
  return sqrt(variance);
}

// Temperature trend analysis
float getTemperatureTrend() {
  static float tempHistory[10];
  static int tempIndex = 0;
  static bool tempBufferFull = false;
  
  tempHistory[tempIndex] = currentReadings.temperature;
  tempIndex = (tempIndex + 1) % 10;
  
  if (tempIndex == 0) {
    tempBufferFull = true;
  }
  
  if (!tempBufferFull) {
    return 0.0;
  }
  
  // Calculate linear trend
  float sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  
  for (int i = 0; i < 10; i++) {
    sumX += i;
    sumY += tempHistory[i];
    sumXY += i * tempHistory[i];
    sumX2 += i * i;
  }
  
  float slope = (10 * sumXY - sumX * sumY) / (10 * sumX2 - sumX * sumX);
  return slope;  // Positive = increasing, Negative = decreasing
}

// Self-diagnostic routine
void performSelfDiagnostic() {
  Serial.println("Performing self-diagnostic...");
  
  // Test temperature sensor
  temperatureSensor.requestTemperatures();
  delay(100);
  float testTemp = temperatureSensor.getTempCByIndex(0);
  
  if (testTemp == DEVICE_DISCONNECTED_C) {
    Serial.println("ERROR: Temperature sensor not responding");
  } else {
    Serial.println("Temperature sensor OK: " + String(testTemp) + "°C");
  }
  
  // Test accelerometer
  int testX = analogRead(ACCEL_X_PIN);
  int testY = analogRead(ACCEL_Y_PIN);
  int testZ = analogRead(ACCEL_Z_PIN);
  
  if (testX == 0 || testY == 0 || testZ == 0) {
    Serial.println("ERROR: Accelerometer sensor readings invalid");
  } else {
    Serial.println("Accelerometer OK: X=" + String(testX) + " Y=" + String(testY) + " Z=" + String(testZ));
  }
  
  // Test pulse sensor
  int testPulse = analogRead(PULSE_INPUT_PIN);
  if (testPulse == 0 || testPulse == 1023) {
    Serial.println("ERROR: Pulse sensor may be disconnected");
  } else {
    Serial.println("Pulse sensor OK: " + String(testPulse));
  }
  
  // Test communication with ESP32
  esp32Serial.println("DIAGNOSTIC_TEST");
  delay(1000);
  
  if (esp32Serial.available()) {
    String response = esp32Serial.readString();
    if (response.indexOf("OK") != -1) {
      Serial.println("ESP32 communication OK");
    } else {
      Serial.println("ERROR: ESP32 communication issue");
    }
  } else {
    Serial.println("ERROR: No response from ESP32");
  }
  
  Serial.println("Self-diagnostic complete");
}
