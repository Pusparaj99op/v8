// Simple test page to verify real-time data connection
// Shows live status of hardware simulation integration
// Use this to debug WebSocket connection issues

import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  Paper,
  CircularProgress,
} from '@mui/material';

const TestConnectionPage: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastData, setLastData] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    console.log('Attempting to connect to simulation server...');
    
    const socket = io('http://localhost:3001', {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Connected to hardware simulation server');
      setConnectionStatus('connected');
      
      // Request data for demo device
      socket.emit('request-health-data', { deviceId: 'ESP32_DEMO_001' });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnectionStatus('error');
    });

    socket.on('health-data', (data) => {
      console.log('Received health data:', data);
      setLastData(data);
      setLastUpdate(new Date());
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'success';
      case 'error': return 'error';
      default: return 'warning';
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Hardware Simulation Test
      </Typography>
      
      <Alert severity={getStatusColor() as any} sx={{ mb: 3 }}>
        Connection Status: {connectionStatus}
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Live Data Stream
          </Typography>
          
          {connectionStatus === 'connected' ? (
            <>
              {lastData ? (
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <pre style={{ fontSize: '12px', margin: 0, whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(lastData, null, 2)}
                  </pre>
                </Paper>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <CircularProgress size={20} />
                  <Typography>Waiting for data...</Typography>
                </Box>
              )}
              
              {lastUpdate && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Last update: {lastUpdate.toLocaleTimeString()}
                </Typography>
              )}
            </>
          ) : (
            <Typography color="text.secondary">
              Not connected to simulation server
            </Typography>
          )}
        </CardContent>
      </Card>

      <Typography variant="body2" color="text.secondary">
        This page tests the real-time connection to the hardware simulation server.
        Check the browser console for detailed logs.
      </Typography>
    </Box>
  );
};

export default TestConnectionPage;
