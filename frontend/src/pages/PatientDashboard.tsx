// Patient Dashboard for Rescue.net AI - Real-time health monitoring interface
// Displays live data from ESP32 wearable device with emergency detection
// Built for Central India Hackathon 2.0 prototype

import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Alert,
  Chip,
  LinearProgress,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Favorite,
  Thermostat,
  Water,
  Battery80,
  LocationOn,
  Warning,
  CheckCircle,
  Error,
  Wifi,
  WifiOff,
} from '@mui/icons-material';
import { useRealTimeHealthData } from '../hooks/useRealTimeHealthData';

const PatientDashboard: React.FC = () => {
  const {
    healthData,
    isConnected,
    lastUpdate,
    emergencyAlerts,
    connectionStatus,
  } = useRealTimeHealthData('demo-device-001');

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Wifi color="success" />;
      case 'connecting':
        return <Wifi color="warning" />;
      case 'error':
        return <WifiOff color="error" />;
      default:
        return <WifiOff color="disabled" />;
    }
  };

  const getHealthStatus = () => {
    if (!healthData) return { status: 'unknown', color: 'default' as const };
    
    if (healthData.isEmergency) {
      return { status: 'Emergency', color: 'error' as const };
    }
    
    const hr = healthData.heartRate;
    const temp = healthData.temperature;
    
    if (hr > 100 || hr < 60 || temp > 37.5 || temp < 36) {
      return { status: 'Warning', color: 'warning' as const };
    }
    
    return { status: 'Normal', color: 'success' as const };
  };

  const healthStatus = getHealthStatus();

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Patient Health Monitor
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Tooltip title={`Connection: ${connectionStatus}`}>
            <IconButton>
              {getConnectionIcon()}
            </IconButton>
          </Tooltip>
          <Chip
            label={healthStatus.status}
            color={healthStatus.color}
            icon={healthStatus.color === 'error' ? <Error /> : <CheckCircle />}
          />
        </Box>
      </Box>

      {/* Connection Status */}
      {!isConnected && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Not connected to wearable device. Please check your device connection.
        </Alert>
      )}

      {/* Emergency Alerts */}
      {emergencyAlerts.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Emergency Alerts
          </Typography>
          {emergencyAlerts.slice(0, 3).map((alert) => (
            <Alert
              key={alert.id}
              severity={alert.severity === 'critical' ? 'error' : 'warning'}
              sx={{ mb: 1 }}
              icon={<Warning />}
            >
              <Typography variant="subtitle2">{alert.type}</Typography>
              <Typography variant="body2">{alert.message}</Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(alert.timestamp).toLocaleString()}
              </Typography>
            </Alert>
          ))}
        </Box>
      )}

      {/* Health Metrics Grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr' }, gap: 3, mb: 3 }}>
        {/* Heart Rate */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Favorite color="error" sx={{ mr: 1 }} />
              <Typography variant="h6">Heart Rate</Typography>
            </Box>
            <Typography variant="h3" component="div" color="error.main">
              {healthData?.heartRate || '--'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              BPM
            </Typography>
            <Box sx={{ mt: 1 }}>
              <LinearProgress
                variant="determinate"
                value={healthData ? Math.min((healthData.heartRate / 120) * 100, 100) : 0}
                color={healthData && healthData.heartRate > 100 ? 'warning' : 'primary'}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Temperature */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Thermostat color="info" sx={{ mr: 1 }} />
              <Typography variant="h6">Temperature</Typography>
            </Box>
            <Typography variant="h3" component="div" color="info.main">
              {healthData?.temperature?.toFixed(1) || '--'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              °C
            </Typography>
            <Box sx={{ mt: 1 }}>
              <LinearProgress
                variant="determinate"
                value={healthData ? Math.min(((healthData.temperature - 35) / 5) * 100, 100) : 0}
                color={healthData && healthData.temperature > 37.5 ? 'warning' : 'primary'}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Oxygen Saturation */}
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Water color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">SpO2</Typography>
            </Box>
            <Typography variant="h3" component="div" color="primary.main">
              {healthData?.oxygenSaturation || '--'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              %
            </Typography>
            <Box sx={{ mt: 1 }}>
              <LinearProgress
                variant="determinate"
                value={healthData?.oxygenSaturation || 0}
                color={healthData && healthData.oxygenSaturation < 95 ? 'warning' : 'primary'}
              />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Blood Pressure & Additional Metrics */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3, mb: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Blood Pressure
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography variant="h4" component="span" color="primary.main">
                {healthData?.bloodPressure?.systolic || '--'}
              </Typography>
              <Typography variant="h5" component="span" color="text.secondary">
                /
              </Typography>
              <Typography variant="h4" component="span" color="primary.main">
                {healthData?.bloodPressure?.diastolic || '--'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                mmHg
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Systolic / Diastolic
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Device Status
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Battery80 color="success" sx={{ mr: 1 }} />
                  <Typography variant="body1">Battery</Typography>
                </Box>
                <Typography variant="h6" color="success.main">
                  {healthData?.batteryLevel || '--'}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={healthData?.batteryLevel || 0}
                color={healthData && healthData.batteryLevel < 20 ? 'error' : 'success'}
              />
              <Divider />
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Activity Level
                </Typography>
                <Chip
                  label={healthData?.activityLevel || 'Unknown'}
                  size="small"
                  color={healthData?.activityLevel === 'high' ? 'warning' : 'default'}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  Stress Level
                </Typography>
                <Typography variant="body2" fontWeight="bold">
                  {healthData?.stressLevel || '--'}/10
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Location & Last Update */}
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <LocationOn color="action" sx={{ mr: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Location: {healthData?.location ? 
                `${healthData.location.latitude.toFixed(4)}, ${healthData.location.longitude.toFixed(4)}` : 
                'Not available'
              }
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            Last update: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default PatientDashboard;
