// Real-time health data hook for Rescue.net AI wearable device monitoring
// Connects to hardware simulation server and provides live health metrics
// Built for Central India Hackathon 2.0 prototype

import { useState, useEffect, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

export interface HealthData {
  timestamp: string;
  heartRate: number;
  temperature: number;
  bloodPressure: {
    systolic: number;
    diastolic: number;
  };
  oxygenSaturation: number;
  activityLevel: string;
  stressLevel: number;
  isEmergency: boolean;
  emergencyType?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  batteryLevel: number;
  deviceId: string;
}

export interface UseRealTimeHealthDataReturn {
  healthData: HealthData | null;
  isConnected: boolean;
  lastUpdate: Date | null;
  emergencyAlerts: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

const SIMULATION_SERVER_URL = 'http://localhost:3001';

export const useRealTimeHealthData = (deviceId?: string): UseRealTimeHealthDataReturn => {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [emergencyAlerts, setEmergencyAlerts] = useState<Array<any>>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection to hardware simulation server
    setConnectionStatus('connecting');
    
    socketRef.current = io(SIMULATION_SERVER_URL, {
      transports: ['websocket'],
      timeout: 5000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to hardware simulation server');
      setIsConnected(true);
      setConnectionStatus('connected');
      
      // Join device-specific room if deviceId provided
      if (deviceId) {
        socket.emit('join-device', deviceId);
      }
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from hardware simulation server');
      setIsConnected(false);
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnectionStatus('error');
    });

    // Listen for real-time health data
    socket.on('health-data', (data: HealthData) => {
      setHealthData(data);
      setLastUpdate(new Date());
    });

    // Listen for emergency alerts
    socket.on('emergency-alert', (alert) => {
      setEmergencyAlerts(prev => [alert, ...prev.slice(0, 9)]); // Keep last 10 alerts
    });

    // Request initial data
    socket.emit('request-health-data', { deviceId: deviceId || 'demo-device-001' });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [deviceId]);

  return {
    healthData,
    isConnected,
    lastUpdate,
    emergencyAlerts,
    connectionStatus,
  };
};

export default useRealTimeHealthData;
