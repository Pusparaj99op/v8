/*
 * Main App Component - Rescue.net AI Frontend Application
 * Central routing and theme configuration for the platform
 * 
 * Built for Central India Hackathon 2.0 - Emergency Response System
 */

import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { AuthProvider, useAuth } from './context/AuthContext';

// Page imports (we'll create these next)
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import PatientDashboard from './pages/PatientDashboard';
import HospitalDashboard from './pages/HospitalDashboard';
import RegisterPage from './pages/RegisterPage';
import TestConnectionPage from './pages/TestConnectionPage';
import LoadingScreen from './components/LoadingScreen';

// Request notification permission
const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
};

// Create Material-UI theme with healthcare-focused design
const theme = createTheme({
  palette: {
    primary: {
      main: '#2E7D32', // Green for healthcare
      light: '#4CAF50',
      dark: '#1B5E20',
    },
    secondary: {
      main: '#D32F2F', // Red for emergencies
      light: '#F44336',
      dark: '#B71C1C',
    },
    error: {
      main: '#F44336',
    },
    warning: {
      main: '#FF9800',
    },
    info: {
      main: '#2196F3',
    },
    success: {
      main: '#4CAF50',
    },
    background: {
      default: '#F5F5F5',
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 500,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 500,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 500,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '10px 20px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

// Protected route component
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredUserType?: 'patient' | 'hospital';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredUserType }) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredUserType && user?.userType !== requiredUserType) {
    // Redirect to appropriate dashboard
    const redirectPath = user?.userType === 'patient' ? '/patient' : '/hospital';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
};

// Main app routes
const AppRoutes: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route 
        path="/login" 
        element={
          isAuthenticated ? (
            <Navigate to={user?.userType === 'patient' ? '/patient' : '/hospital'} replace />
          ) : (
            <LoginPage />
          )
        } 
      />
      <Route 
        path="/register" 
        element={
          isAuthenticated ? (
            <Navigate to={user?.userType === 'patient' ? '/patient' : '/hospital'} replace />
          ) : (
            <RegisterPage />
          )
        } 
      />

      {/* Protected routes */}
      <Route 
        path="/patient/*" 
        element={
          <ProtectedRoute requiredUserType="patient">
            <PatientDashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/hospital/*" 
        element={
          <ProtectedRoute requiredUserType="hospital">
            <HospitalDashboard />
          </ProtectedRoute>
        } 
      />

      {/* Test connection page for debugging */}
      <Route path="/test" element={<TestConnectionPage />} />

      {/* Default redirects */}
      <Route path="/dashboard" element={
        isAuthenticated ? (
          <Navigate to={user?.userType === 'patient' ? '/patient' : '/hospital'} replace />
        ) : (
          <Navigate to="/login" replace />
        )
      } />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  useEffect(() => {
    // Request notification permission on app load
    requestNotificationPermission();

    // Set page title
    document.title = 'Rescue.net AI - Emergency Response System';
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            <AppRoutes />
          </Box>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
