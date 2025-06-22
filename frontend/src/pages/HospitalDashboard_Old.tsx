/*
 * Hospital Dashboard - Main dashboard for hospital emergency coordination
 * Patient monitoring and emergency response management interface
 * 
 * Core hospital interface for Rescue.net AI platform
 */

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Container,
  AppBar,
  Toolbar,
  IconButton,
  Button,
} from '@mui/material';
import {
  Favorite,
  Logout,
  LocalHospital,
  People,
  Emergency,
  Analytics,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const HospitalDashboard: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* App Bar */}
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Favorite sx={{ mr: 1 }} />
            <Typography variant="h6" component="div">
              Rescue.net AI
            </Typography>
          </Box>
          
          <Typography variant="body2" sx={{ mr: 2 }}>
            Hospital Dashboard
          </Typography>
          
          <IconButton color="inherit" onClick={handleLogout}>
            <Logout />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Welcome Section */}
        <Paper sx={{ p: 4, mb: 4, textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom color="primary">
            🏥 Hospital Command Center
          </Typography>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Emergency Response Coordination Hub
          </Typography>
          <Typography variant="body1" sx={{ mt: 2 }}>
            Monitor patients in real-time, coordinate emergency responses, 
            and manage hospital resources efficiently with AI-powered insights.
          </Typography>
        </Paper>

        {/* Quick Stats */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 3, mb: 4 }}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <People sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              Patient Monitoring
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Real-time health tracking for all assigned patients
            </Typography>
          </Paper>

          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Emergency sx={{ fontSize: 48, color: 'error.main', mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              Emergency Coordination
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Rapid response and resource allocation
            </Typography>
          </Paper>

          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Analytics sx={{ fontSize: 48, color: 'info.main', mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              AI Analytics
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Predictive emergency detection and trends
            </Typography>
          </Paper>
        </Box>

        {/* Development Status */}
        <Paper sx={{ p: 4, bgcolor: 'success.light', color: 'success.contrastText' }}>
          <Typography variant="h6" gutterBottom>
            🚧 Development Status
          </Typography>
          <Typography variant="body1" gutterBottom>
            Hospital dashboard for Rescue.net AI emergency response system.
          </Typography>
          <Typography variant="body2">
            <strong>Completed:</strong> Authentication, Basic UI, Backend Integration, Real-time WebSocket Setup
          </Typography>
          <Typography variant="body2">
            <strong>Next Steps:</strong> Patient List, Emergency Alerts, Resource Management, Analytics Dashboard
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <Button 
              variant="contained" 
              sx={{ mr: 2, bgcolor: 'white', color: 'success.main' }}
              startIcon={<People />}
            >
              View Patients
            </Button>
            <Button 
              variant="outlined" 
              sx={{ borderColor: 'white', color: 'white' }}
              startIcon={<Emergency />}
            >
              Emergency Center
            </Button>
          </Box>
        </Paper>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 4, py: 2 }}>
          <Typography variant="caption" color="text.disabled">
            Rescue.net AI • Central India Hackathon 2.0 • Built with ❤️ for Emergency Response
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default HospitalDashboard;
