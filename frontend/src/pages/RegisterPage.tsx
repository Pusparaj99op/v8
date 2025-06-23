/*
 * Simplified Registration Page - New user registration for patients and hospitals
 * Basic registration forms with validation
 * 
 * Onboarding for new users to the Rescue.net AI platform
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
  MenuItem,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
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

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, error, isLoading, clearError } = useAuth();
  
  const [tabValue, setTabValue] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Patient form data
  const [patientData, setPatientData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    gender: '',
    bloodGroup: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
    },
    medicalConditions: [] as string[],
    medications: [] as string[],
    allergies: [] as string[],
  });

  // Hospital form data
  const [hospitalData, setHospitalData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      pincode: '',
    },
    capacity: {
      totalBeds: '',
      icuBeds: '',
      emergencyBeds: '',
    },
    emergencyNumber: '',
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    clearError();
  };

  const handlePatientInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setPatientData(prev => ({
        ...prev,
        [parent]: { ...(prev as any)[parent], [child]: value }
      }));
    } else {
      setPatientData(prev => ({ ...prev, [name]: value }));
    }
    clearError();
  };

  const handleHospitalInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setHospitalData(prev => ({
        ...prev,
        [parent]: { ...(prev as any)[parent], [child]: value }
      }));
    } else {
      setHospitalData(prev => ({ ...prev, [name]: value }));
    }
    clearError();
  };

  const validateForm = () => {
    const data = tabValue === 0 ? patientData : hospitalData;
    
    if (!data.email || !data.password || !data.confirmPassword || !data.name) {
      return 'Please fill in all required fields';
    }
    
    if (data.password !== data.confirmPassword) {
      return 'Passwords do not match';
    }
    
    if (data.password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    
    if (tabValue === 0) {
      const patient = data as typeof patientData;
      if (!patient.age || !patient.gender || !patient.bloodGroup || !patient.phone) {
        return 'Please fill in all required patient information';
      }
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      return;
    }

    try {
      const userType = tabValue === 0 ? 'patient' : 'hospital';
      const data = tabValue === 0 ? patientData : hospitalData;
      
      await register(data, userType);
      
    } catch (error) {
      // Error is handled by the auth context
    }
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
          maxWidth: 500,
          width: '100%',
          padding: 4,
          borderRadius: 3,
          maxHeight: '90vh',
          overflow: 'auto',
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
            Join the AI-Powered Emergency Response Network
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

        {/* Registration Forms */}
        <form onSubmit={handleSubmit}>
          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" gutterBottom>
              Patient Registration
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
              Get 24/7 health monitoring and emergency response
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Full Name"
                name="name"
                value={patientData.name}
                onChange={handlePatientInputChange}
                required
              />

              <TextField
                fullWidth
                label="Email Address"
                name="email"
                type="email"
                value={patientData.email}
                onChange={handlePatientInputChange}
                required
              />

              <TextField
                fullWidth
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={patientData.password}
                onChange={handlePatientInputChange}
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Confirm Password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={patientData.confirmPassword}
                onChange={handlePatientInputChange}
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Age"
                  name="age"
                  type="number"
                  value={patientData.age}
                  onChange={handlePatientInputChange}
                  required
                  sx={{ flex: 1 }}
                />

                <TextField
                  select
                  label="Gender"
                  name="gender"
                  value={patientData.gender}
                  onChange={handlePatientInputChange}
                  required
                  sx={{ flex: 1 }}
                >
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </TextField>
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  select
                  label="Blood Group"
                  name="bloodGroup"
                  value={patientData.bloodGroup}
                  onChange={handlePatientInputChange}
                  required
                  sx={{ flex: 1 }}
                >
                  {BLOOD_GROUPS.map(group => (
                    <MenuItem key={group} value={group}>{group}</MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Phone Number"
                  name="phone"
                  value={patientData.phone}
                  onChange={handlePatientInputChange}
                  required
                  sx={{ flex: 1 }}
                />
              </Box>

              <TextField
                fullWidth
                label="City"
                name="address.city"
                value={patientData.address.city}
                onChange={handlePatientInputChange}
                required
              />
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              Hospital Registration
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
              Join the emergency response network and monitor patients
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Hospital Name"
                name="name"
                value={hospitalData.name}
                onChange={handleHospitalInputChange}
                required
              />

              <TextField
                fullWidth
                label="Email Address"
                name="email"
                type="email"
                value={hospitalData.email}
                onChange={handleHospitalInputChange}
                required
              />

              <TextField
                fullWidth
                label="Password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={hospitalData.password}
                onChange={handleHospitalInputChange}
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Confirm Password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={hospitalData.confirmPassword}
                onChange={handleHospitalInputChange}
                required
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Phone Number"
                name="phone"
                value={hospitalData.phone}
                onChange={handleHospitalInputChange}
                required
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField
                  label="Total Beds"
                  name="capacity.totalBeds"
                  type="number"
                  value={hospitalData.capacity.totalBeds}
                  onChange={handleHospitalInputChange}
                  required
                  sx={{ flex: 1 }}
                />

                <TextField
                  label="ICU Beds"
                  name="capacity.icuBeds"
                  type="number"
                  value={hospitalData.capacity.icuBeds}
                  onChange={handleHospitalInputChange}
                  required
                  sx={{ flex: 1 }}
                />
              </Box>

              <TextField
                fullWidth
                label="Emergency Contact Number"
                name="emergencyNumber"
                value={hospitalData.emergencyNumber}
                onChange={handleHospitalInputChange}
                required
              />

              <TextField
                fullWidth
                label="City"
                name="address.city"
                value={hospitalData.address.city}
                onChange={handleHospitalInputChange}
                required
              />
            </Box>
          </TabPanel>

          {/* Register Button */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isLoading}
            sx={{ mt: 3, mb: 2 }}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        <Divider sx={{ my: 2 }} />

        {/* Login Link */}
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{' '}
            <Link component={RouterLink} to="/login" color="primary">
              Sign in here
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

export default RegisterPage;
