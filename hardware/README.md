# Hardware Connection Guide - Rescue.net AI Wearable Device

## 🔌 Component Overview

This guide provides detailed instructions for connecting all hardware components of the Rescue.net AI health monitoring wearable device.

## 📋 Component List

| Component | Quantity | Purpose |
|-----------|----------|---------|
| ESP32 | 1 | Main controller |
| Arduino Nano | 1 | Sensor controller |
| BMP180 | 1 | Barometric pressure sensor |
| 3.7V 1000mAh Battery | 2 | Power supply (hot-swappable) |
| Buzzer | 1 | Audio alerts |
| Vibrator Motor | 2 | Tactile feedback |
| NEO6M GPS | 1 | Location tracking |
| I2C OLED Display | 1 | User interface |
| DS18B20 | 1 | Temperature sensor |
| REES52 Pulse Sensor | 1 | Heart rate monitoring |
| ADXL335 Accelerometer | 1 | Motion/fall detection |
| Micro SD Card Module | 1 | Data logging |
| SIM800L GSM Module | 1 | Cellular communication |

## 🔧 ESP32 Pin Connections

### ESP32 DevKit V1 Pinout Reference

```
                     ESP32 DevKit V1
                    ┌─────────────────┐
                EN  │1              30│ D0
                VP  │2              29│ D1
                VN  │3              28│ D2
                D35 │4              27│ D3
                D33 │5              26│ D4
                D32 │6              25│ D5
                D14 │7              24│ D18
                D12 │8              23│ D19
                D13 │9              22│ D21
                D15 │10             21│ RX2
                D2  │11             20│ TX2
                D4  │12             19│ D22
                D16 │13             18│ D23
                D17 │14             17│ GND
                5V  │15             16│ 3V3
                    └─────────────────┘
```

## 📊 Detailed Connection Table

### ESP32 Connections

| Component | ESP32 Pin | Component Pin | Connection Type | Notes |
|-----------|-----------|---------------|-----------------|-------|
| **Power System** |
| Battery 1 | 3V3 | VCC | Power | Primary battery |
| Battery 2 | 5V | VCC | Power | Secondary battery |
| Common Ground | GND | GND | Ground | All components |
| **Communication Modules** |
| SIM800L GSM | D16 (RX) | TX | UART | Software Serial |
| SIM800L GSM | D17 (TX) | RX | UART | Software Serial |
| SIM800L GSM | 3V3 | VCC | Power | 3.3V supply |
| NEO6M GPS | D4 (RX) | TX | UART | Software Serial |
| NEO6M GPS | D2 (TX) | RX | UART | Software Serial |
| NEO6M GPS | 3V3 | VCC | Power | 3.3V supply |
| **I2C Devices** |
| OLED Display | D21 | SDA | I2C | Data line |
| OLED Display | D22 | SCL | I2C | Clock line |
| OLED Display | 3V3 | VCC | Power | 3.3V supply |
| BMP180 Sensor | D21 | SDA | I2C | Data line |
| BMP180 Sensor | D22 | SCL | I2C | Clock line |
| BMP180 Sensor | 3V3 | VCC | Power | 3.3V supply |
| **SD Card Module** |
| SD Card | D23 | MOSI | SPI | Master Out Slave In |
| SD Card | D19 | MISO | SPI | Master In Slave Out |
| SD Card | D18 | SCK | SPI | Serial Clock |
| SD Card | D5 | CS | SPI | Chip Select |
| SD Card | 3V3 | VCC | Power | 3.3V supply |
| **Output Devices** |
| Buzzer | D25 | Positive | PWM | Audio alerts |
| Vibrator 1 | D26 | Positive | Digital | Tactile feedback |
| Vibrator 2 | D27 | Positive | Digital | Tactile feedback |
| **Communication with Arduino** |
| Arduino Nano | D32 (RX) | D2 (TX) | UART | Data exchange |
| Arduino Nano | D33 (TX) | D3 (RX) | UART | Data exchange |

### Arduino Nano Connections

| Component | Arduino Pin | Component Pin | Connection Type | Notes |
|-----------|-------------|---------------|-----------------|-------|
| **Analog Sensors** |
| REES52 Pulse | A0 | Signal | Analog | Heart rate sensor |
| ADXL335 X-axis | A1 | X | Analog | Accelerometer X |
| ADXL335 Y-axis | A2 | Y | Analog | Accelerometer Y |
| ADXL335 Z-axis | A3 | Z | Analog | Accelerometer Z |
| **Digital Sensors** |
| DS18B20 Temp | D4 | Data | 1-Wire | Temperature sensor |
| **Communication** |
| ESP32 | D2 (TX) | D32 (RX) | UART | To ESP32 |
| ESP32 | D3 (RX) | D33 (TX) | UART | From ESP32 |
| **Power** |
| Battery | 5V | VCC | Power | 5V supply |
| Common | GND | GND | Ground | Common ground |

## ⚡ Power Management Circuit

### Battery Hot-Swap System

```
Battery 1 (3.7V) ──┬── Diode ──┬── ESP32 (3.3V)
                   │           │
Battery 2 (3.7V) ──┴── Diode ──┴── Arduino Nano (5V via regulator)
                   │
                   └── Common Ground
```

### Required Components
- 2x Schottky Diodes (1N5819) for battery isolation
- 1x 3.3V Voltage Regulator (AMS1117-3.3)
- 2x 100µF Electrolytic Capacitors
- 2x 10µF Ceramic Capacitors
- 1x Power Switch (optional)

## 🔧 Assembly Instructions

### Step 1: Prepare the PCB/Breadboard
1. Use a prototype PCB or large breadboard
2. Create power rails for 3.3V, 5V, and GND
3. Plan component placement for minimal wire crossing

### Step 2: Power System Assembly
1. Install voltage regulators and capacitors
2. Connect battery terminals with diodes
3. Test voltage levels before connecting components
4. Verify hot-swap functionality

### Step 3: ESP32 Installation
1. Mount ESP32 on the board
2. Connect power rails (3.3V and GND)
3. Add decoupling capacitors near power pins
4. Verify power supply stability

### Step 4: Arduino Nano Installation
1. Mount Arduino Nano adjacent to ESP32
2. Connect 5V power and GND
3. Establish UART communication with ESP32
4. Test communication with simple program

### Step 5: Sensor Connections
1. **I2C Bus Setup**
   - Connect SDA and SCL lines with 4.7kΩ pull-up resistors
   - Add OLED display and BMP180 sensor
   - Test I2C communication

2. **Analog Sensors (Arduino)**
   - Connect pulse sensor to A0 with proper filtering
   - Connect accelerometer axes to A1, A2, A3
   - Add input protection if needed

3. **Digital Sensors**
   - Connect DS18B20 with 4.7kΩ pull-up resistor
   - Use proper cable shielding for temperature sensor

### Step 6: Communication Modules
1. **GSM Module (SIM800L)**
   - Use separate power supply or large capacitor (1000µF)
   - Add antenna for better signal reception
   - Test with simple AT commands

2. **GPS Module (NEO6M)**
   - Connect external antenna for better reception
   - Allow cold start time for initial fix
   - Test coordinate accuracy

### Step 7: Output Devices
1. **OLED Display**
   - Verify I2C address (usually 0x3C)
   - Test with sample graphics
   - Adjust contrast if needed

2. **Audio/Tactile Feedback**
   - Connect buzzer through transistor for higher current
   - Connect vibrator motors with flyback diodes
   - Test PWM control for different intensities

### Step 8: Data Storage
1. **SD Card Module**
   - Use SPI interface with proper connections
   - Format card with FAT32 file system
   - Test read/write operations

## 🔍 Testing Checklist

### Power System Tests
- [ ] Battery voltage measurement (should be 3.7V each)
- [ ] Regulated voltage output (3.3V and 5V)
- [ ] Hot-swap functionality (no power interruption)
- [ ] Current consumption measurement
- [ ] Battery charging circuit (if implemented)

### Communication Tests
- [ ] ESP32 to Arduino UART communication
- [ ] I2C device detection (OLED, BMP180)
- [ ] SPI communication with SD card
- [ ] GSM module network registration
- [ ] GPS module satellite acquisition

### Sensor Tests
- [ ] Heart rate sensor signal quality
- [ ] Temperature sensor accuracy
- [ ] Accelerometer sensitivity
- [ ] Barometric pressure readings
- [ ] GPS coordinate accuracy

### Output Device Tests
- [ ] OLED display clarity and contrast
- [ ] Buzzer volume and tone quality
- [ ] Vibrator motor strength
- [ ] LED indicators (if any)

## ⚠️ Safety Considerations

### Electrical Safety
- Use proper fuses or circuit breakers
- Implement reverse polarity protection
- Add overcurrent protection for batteries
- Use appropriate wire gauges for current ratings

### Medical Safety
- Ensure sensors don't cause skin irritation
- Use medical-grade materials for skin contact
- Implement proper electrical isolation
- Test for electromagnetic interference

### Environmental Protection
- Use IP65 rated enclosure for water resistance
- Implement proper cable strain relief
- Use conformal coating on PCB if needed
- Design for temperature range -10°C to +60°C

## 🔧 Troubleshooting Guide

### Power Issues
- **No power**: Check battery connections and voltage
- **Unstable power**: Add larger decoupling capacitors
- **High current draw**: Check for short circuits

### Communication Issues
- **I2C not working**: Check pull-up resistors and addresses
- **UART garbled**: Verify baud rates and connections
- **GSM not connecting**: Check antenna and SIM card

### Sensor Issues
- **Noisy readings**: Add input filtering capacitors
- **Incorrect values**: Check reference voltages
- **Intermittent operation**: Verify power supply stability

## 📐 PCB Design Recommendations

### Layout Guidelines
- Keep analog and digital sections separated
- Use ground planes for noise reduction
- Place decoupling capacitors close to IC power pins
- Route high-frequency signals with proper impedance

### Component Placement
- Group related components together
- Keep sensitive analog circuits away from switching circuits
- Provide test points for debugging
- Design for easy component replacement

### Mechanical Considerations
- Design for wearable form factor
- Use flexible PCB for sensor connections
- Provide mounting holes for enclosure
- Consider component height restrictions

## 📦 Bill of Materials (BOM)

| Component | Quantity | Unit Price (₹) | Total (₹) | Supplier |
|-----------|----------|----------------|-----------|----------|
| ESP32 DevKit | 1 | 800 | 800 | Local/Amazon |
| Arduino Nano | 1 | 300 | 300 | Local/Amazon |
| BMP180 | 1 | 150 | 150 | Local/Amazon |
| Battery 3.7V 1000mAh | 2 | 250 | 500 | Local/Amazon |
| Buzzer | 1 | 50 | 50 | Local |
| Vibrator Motor | 2 | 100 | 200 | Local |
| NEO6M GPS | 1 | 400 | 400 | Amazon |
| OLED Display | 1 | 300 | 300 | Local/Amazon |
| DS18B20 | 1 | 100 | 100 | Local/Amazon |
| REES52 Pulse Sensor | 1 | 200 | 200 | Amazon |
| ADXL335 | 1 | 200 | 200 | Local/Amazon |
| SD Card Module | 1 | 100 | 100 | Local/Amazon |
| SIM800L | 1 | 500 | 500 | Amazon |
| Resistors/Capacitors | 1 set | 200 | 200 | Local |
| PCB/Breadboard | 1 | 150 | 150 | Local |
| Enclosure | 1 | 300 | 300 | Local |
| Miscellaneous | - | 200 | 200 | - |
| **Total** | | | **₹4,650** | |

## 📞 Next Steps

After completing the hardware assembly:

1. **Upload firmware** to ESP32 and Arduino Nano
2. **Test all functions** systematically
3. **Calibrate sensors** for accurate readings
4. **Integrate with backend** services
5. **Perform field testing** for reliability

---

**⚠️ Important**: Always double-check connections before powering on. Use a multimeter to verify voltages and continuity. Start with low-power testing before connecting batteries.
