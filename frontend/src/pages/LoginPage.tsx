/*
 * Login Page - User authentication for patients and hospitals
 * Provides secure login with role-based access control
 * 
 * Entry point for Rescue.net AI platform access
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Tab,
  Tabs,
  Alert,
  InputAdornment,
  IconButton,
  Link,
  Divider,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  LocalHospital,
  Favorite,
} from '@mui/icons-material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, error, isLoading, clearError } = useAuth();
  
  const [tabValue, setTabValue] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    clearError();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      return;
    }

    try {
      const userType = tabValue === 0 ? 'patient' : 'hospital';
      await login(formData.email, formData.password, userType);
      
      // Navigation is handled automatically by the auth context
    } catch (error) {
      // Error is handled by the auth context
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)',
        padding: 2,
      }}
    >
      <Paper
        elevation={8}
        sx={{
          maxWidth: 450,
          width: '100%',
          padding: 4,
          borderRadius: 3,
        }}
      >
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <Favorite 
              sx={{ 
                fontSize: 40, 
                color: 'primary.main',
                mr: 1,
              }} 
            />
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontWeight: 'bold',
                color: 'primary.main',
              }}
            >
              Rescue.net
            </Typography>
          </Box>
          
          <Typography
            variant="subtitle1"
            sx={{
              color: 'text.secondary',
              fontStyle: 'italic',
            }}
          >
            AI-Powered Emergency Response
          </Typography>
        </Box>

        {/* User Type Tabs */}
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ mb: 2 }}
        >
          <Tab
            icon={<Person />}
            label="Patient"
            iconPosition="start"
            sx={{ textTransform: 'none' }}
          />
          <Tab
            icon={<LocalHospital />}
            label="Hospital"
            iconPosition="start"
            sx={{ textTransform: 'none' }}
          />
        </Tabs>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Login Forms */}
        <form onSubmit={handleSubmit}>
          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" gutterBottom>
              Patient Login
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Access your health dashboard and emergency monitoring
            </Typography>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              Hospital Login
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Monitor patients and manage emergency responses
            </Typography>
          </TabPanel>

          {/* Email Field */}
          <TextField
            fullWidth
            label="Email Address"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleInputChange}
            required
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email color="action" />
                </InputAdornment>
              ),
            }}
          />

          {/* Password Field */}
          <TextField
            fullWidth
            label="Password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleInputChange}
            required
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleTogglePasswordVisibility}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Login Button */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isLoading}
            sx={{ mb: 2 }}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>

          {/* Demo Credentials */}
          <Paper sx={{ p: 2, bgcolor: '#f8f9fa', mb: 2 }}>
            <Typography variant="subtitle2" color="primary" fontWeight="bold" gutterBottom>
              Demo Credentials:
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
              <strong>{tabValue === 0 ? 'Patient' : 'Hospital'}:</strong><br />
              {tabValue === 0 ? 'Phone: 9876543210' : 'Email: demo@hospital.com'}<br />
              Password: {tabValue === 0 ? 'patient123' : 'hospital123'}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              fullWidth
              sx={{ mt: 1 }}
              onClick={() => {
                if (tabValue === 0) {
                  setFormData({ email: '9876543210', password: 'patient123' });
                } else {
                  setFormData({ email: 'demo@hospital.com', password: 'hospital123' });
                }
              }}
            >
              Use Demo Credentials
            </Button>
          </Paper>
        </form>

        <Divider sx={{ my: 2 }} />

        {/* Register Link */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Don't have an account?{' '}
            <Link component={RouterLink} to="/register" color="primary">
              Register here
            </Link>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            <Link component={RouterLink} to="/" color="primary">
              ← Back to Home
            </Link>
          </Typography>
        </Box>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="caption" color="text.disabled">
            Central India Hackathon 2.0
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default LoginPage;
