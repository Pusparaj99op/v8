# Hardware Simulation Server

This server simulates the ESP32 wearable device for the Rescue.net AI platform. It generates realistic health data and emergency events for demonstration purposes.

## Features

- Real-time health data generation (heart rate, temperature, blood pressure, etc.)
- Emergency event simulation (cardiac events, falls, fever)
- WebSocket communication for real-time updates
- Device registration and management
- AI health analysis simulation

## Quick Start

```bash
# Install dependencies
npm install

# Start the simulation server
npm start

# Or for development with auto-reload
npm run dev
```

## Endpoints

- `POST /api/device/register` - Register a new wearable device
- `GET /api/devices` - Get all registered devices
- `POST /api/emergency/respond` - Record emergency response

## WebSocket Events

- `health-data` - Real-time health metrics
- `emergency-alert` - Emergency notifications
- `device-status` - Device connection status

## Demo Device

The server automatically registers a demo device (`ESP32_DEMO_001`) and starts generating data after startup.

## Integration

This simulation server works with:
- Main Rescue.net AI backend (port 5000)
- React frontend dashboard (port 3000)
- Real ESP32 hardware (when available)

The simulation provides realistic data patterns including:
- Circadian rhythm variations
- Emergency conditions (2% probability)
- Battery drain simulation
- Location tracking
- AI risk analysis
