/*
 * WebSocket Service - Real-time communication with backend
 * Handles real-time health data updates and emergency alerts
 * 
 * Built for instant emergency response coordination
 */

import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;

  connect(userId: string, userType: 'patient' | 'hospital', hospitalId?: string) {
    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';
    
    this.socket = io(SOCKET_URL, {
      auth: {
        token: localStorage.getItem('authToken')
      },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('🔌 Connected to Rescue.net AI server');
      this.reconnectAttempts = 0;
      
      // Join appropriate room based on user type
      this.socket?.emit('join-room', {
        userType,
        userId,
        hospitalId
      });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.attemptReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.attemptReconnect();
    });

    // Health data events
    this.socket.on('health-update', (data) => {
      this.handleHealthUpdate(data);
    });

    // Emergency events
    this.socket.on('emergency-alert', (data) => {
      this.handleEmergencyAlert(data);
    });

    // Device status events
    this.socket.on('device-status', (data) => {
      this.handleDeviceStatus(data);
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.socket?.connect();
      }, this.reconnectInterval);
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }

  private handleHealthUpdate(data: any) {
    // Emit custom event for components to listen to
    window.dispatchEvent(new CustomEvent('health-update', {
      detail: data
    }));
  }

  private handleEmergencyAlert(data: any) {
    // Show browser notification for emergencies
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🚨 Emergency Alert!', {
        body: `Emergency detected for patient ${data.patientName}`,
        icon: '/logo192.png',
        requireInteraction: true
      });
    }

    // Emit custom event for components to listen to
    window.dispatchEvent(new CustomEvent('emergency-alert', {
      detail: data
    }));
  }

  private handleDeviceStatus(data: any) {
    // Emit custom event for components to listen to
    window.dispatchEvent(new CustomEvent('device-status', {
      detail: data
    }));
  }

  // Send device data (for testing purposes)
  sendDeviceData(data: any) {
    if (this.socket?.connected) {
      this.socket.emit('device-data', data);
    }
  }

  // Join specific rooms
  joinRoom(roomId: string) {
    if (this.socket?.connected) {
      this.socket.emit('join-room', { roomId });
    }
  }

  // Leave specific rooms
  leaveRoom(roomId: string) {
    if (this.socket?.connected) {
      this.socket.emit('leave-room', { roomId });
    }
  }

  // Subscribe to health updates
  onHealthUpdate(callback: (data: any) => void) {
    const handler = (event: any) => callback(event.detail);
    window.addEventListener('health-update', handler);
    return () => window.removeEventListener('health-update', handler);
  }

  // Subscribe to emergency alerts
  onEmergencyAlert(callback: (data: any) => void) {
    const handler = (event: any) => callback(event.detail);
    window.addEventListener('emergency-alert', handler);
    return () => window.removeEventListener('emergency-alert', handler);
  }

  // Subscribe to device status
  onDeviceStatus(callback: (data: any) => void) {
    const handler = (event: any) => callback(event.detail);
    window.addEventListener('device-status', handler);
    return () => window.removeEventListener('device-status', handler);
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Check connection status
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Create singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;
