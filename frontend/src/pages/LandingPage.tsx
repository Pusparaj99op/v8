/*
 * Landing Page - Welcome page for Rescue.net AI platform
 * Showcases platform features and provides entry points
 * 
 * Central India Hackathon 2.0 - Emergency Response System
 */

import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  useTheme,
  useMediaQuery,
  Chip,
  Paper,
  Stack,
  Divider,
} from '@mui/material';
import {
  Favorite,
  MonitorHeart,
  Emergency,
  LocationOn,
  Smartphone,
  Cloud,
  Analytics,
  ArrowForward,
  PlayArrow,
  CheckCircle,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const features = [
    {
      icon: <MonitorHeart color="primary" sx={{ fontSize: 40 }} />,
      title: 'Real-time Health Monitoring',
      description: 'Continuous monitoring of vital signs with AI-powered analysis'
    },
    {
      icon: <Emergency color="secondary" sx={{ fontSize: 40 }} />,
      title: 'Emergency Prediction',
      description: 'Predictive AI alerts before emergencies occur'
    },
    {
      icon: <LocationOn color="primary" sx={{ fontSize: 40 }} />,
      title: 'GPS Tracking',
      description: 'Instant location sharing for emergency response'
    },
    {
      icon: <Smartphone color="primary" sx={{ fontSize: 40 }} />,
      title: 'Smart Wearable',
      description: 'Custom IoT device with 24+ hour battery life'
    },
    {
      icon: <Cloud color="primary" sx={{ fontSize: 40 }} />,
      title: 'Cloud Integration',
      description: 'Secure data sync with offline capability'
    },
    {
      icon: <Analytics color="primary" sx={{ fontSize: 40 }} />,
      title: 'AI Analytics',
      description: 'Machine learning for health pattern recognition'
    }
  ];

  const stats = [
    { number: '<1s', label: 'Response Time' },
    { number: '24+hrs', label: 'Battery Life' },
    { number: '99.9%', label: 'Accuracy' },
    { number: '24/7', label: 'Monitoring' }
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Header */}
      <AppBar position="fixed" elevation={0} sx={{ bgcolor: 'white', borderBottom: '1px solid #e0e0e0' }}>
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <Favorite sx={{ color: 'primary.main', mr: 1, fontSize: 32 }} />
            <Typography variant="h5" component="div" sx={{ color: 'primary.main', fontWeight: 'bold' }}>
              Rescue.net AI
            </Typography>
            <Chip 
              label="CIH 2.0" 
              size="small" 
              color="secondary" 
              sx={{ ml: 2, fontWeight: 'bold' }}
            />
          </Box>
          <Button 
            variant="outlined" 
            sx={{ mr: 2 }}
            onClick={() => navigate('/login')}
          >
            Sign In
          </Button>
          <Button 
            variant="contained" 
            onClick={() => navigate('/register')}
          >
            Get Started
          </Button>
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box
        sx={{
          pt: 12,
          pb: 8,
          background: 'linear-gradient(135deg, #2E7D32 0%, #4CAF50 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', gap: 4 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                India's First Predictive Emergency Response Ecosystem
              </Typography>
              <Typography variant="h6" paragraph sx={{ opacity: 0.9 }}>
                Revolutionary AI-powered wearable technology that predicts health emergencies 
                and coordinates instant response to save lives across India.
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
                <Button 
                  variant="contained" 
                  size="large"
                  sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: '#f5f5f5' } }}
                  startIcon={<PlayArrow />}
                  onClick={() => navigate('/login')}
                >
                  Try Demo
                </Button>
                <Button 
                  variant="outlined" 
                  size="large"
                  sx={{ borderColor: 'white', color: 'white', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
                  onClick={() => navigate('/register')}
                >
                  Learn More
                </Button>
              </Stack>
            </Box>
            <Box sx={{ flex: 1, textAlign: 'center' }}>
              <Box
                sx={{
                  width: { xs: 200, md: 300 },
                  height: { xs: 200, md: 300 },
                  bgcolor: 'rgba(255,255,255,0.1)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  border: '3px solid rgba(255,255,255,0.3)',
                }}
              >
                <MonitorHeart sx={{ fontSize: { xs: 80, md: 120 }, color: 'white' }} />
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Stats Section */}
      <Container maxWidth="lg" sx={{ mt: -4, position: 'relative', zIndex: 2 }}>
        <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'space-around' }}>
            {stats.map((stat, index) => (
              <Box key={index} sx={{ textAlign: 'center', minWidth: 120 }}>
                <Typography variant="h3" color="primary" fontWeight="bold">
                  {stat.number}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {stat.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Paper>
      </Container>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" component="h2" gutterBottom fontWeight="bold">
            Cutting-Edge Healthcare Technology
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            Advanced AI algorithms combined with IoT sensors for comprehensive health monitoring 
            and emergency prediction
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
          {features.map((feature, index) => (
            <Card key={index} sx={{ maxWidth: 300, textAlign: 'center', p: 2, flex: '1 1 300px' }}>
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  {feature.icon}
                </Box>
                <Typography variant="h6" gutterBottom fontWeight="bold">
                  {feature.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Container>

      {/* Demo Section */}
      <Box sx={{ bgcolor: '#f8f9fa', py: 8 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', gap: 6 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h3" gutterBottom fontWeight="bold">
                Try the Demo Now
              </Typography>
              <Typography variant="h6" paragraph color="text.secondary">
                Experience the power of predictive healthcare technology with our 
                interactive demo featuring real-time data simulation.
              </Typography>
              
              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" gutterBottom color="primary" fontWeight="bold">
                  Demo Credentials:
                </Typography>
                <Paper sx={{ p: 3, bgcolor: 'white', mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Patient Dashboard:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Phone: <strong>9876543210</strong><br />
                    Password: <strong>patient123</strong>
                  </Typography>
                </Paper>
                <Paper sx={{ p: 3, bgcolor: 'white' }}>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Hospital Dashboard:
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Email: <strong>demo@hospital.com</strong><br />
                    Password: <strong>hospital123</strong>
                  </Typography>
                </Paper>
              </Box>

              <Button 
                variant="contained" 
                size="large" 
                sx={{ mt: 3 }}
                endIcon={<ArrowForward />}
                onClick={() => navigate('/login')}
              >
                Access Demo
              </Button>
            </Box>
            <Box sx={{ flex: 1, textAlign: 'center' }}>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle color="success" sx={{ mr: 1 }} />
                  <Typography>Real-time health data simulation</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle color="success" sx={{ mr: 1 }} />
                  <Typography>Emergency alert testing</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle color="success" sx={{ mr: 1 }} />
                  <Typography>AI prediction analysis</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <CheckCircle color="success" sx={{ mr: 1 }} />
                  <Typography>Hospital coordination system</Typography>
                </Box>
              </Stack>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box sx={{ bgcolor: 'primary.main', color: 'white', py: 6 }}>
        <Container maxWidth="md" sx={{ textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Ready to Save Lives with AI?
          </Typography>
          <Typography variant="h6" paragraph sx={{ opacity: 0.9 }}>
            Join the revolution in emergency healthcare response
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center" sx={{ mt: 4 }}>
            <Button 
              variant="contained" 
              size="large"
              sx={{ bgcolor: 'white', color: 'primary.main', '&:hover': { bgcolor: '#f5f5f5' } }}
              onClick={() => navigate('/register')}
            >
              Sign Up Now
            </Button>
            <Button 
              variant="outlined" 
              size="large"
              sx={{ borderColor: 'white', color: 'white', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}
              onClick={() => navigate('/login')}
            >
              Try Demo
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Footer */}
      <Box sx={{ bgcolor: '#1a1a1a', color: 'white', py: 4 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4 }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Favorite sx={{ color: 'primary.main', mr: 1, fontSize: 28 }} />
                <Typography variant="h6" fontWeight="bold">
                  Rescue.net AI
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Developed for Central India Hackathon 2.0<br />
                Revolutionizing emergency healthcare with AI and IoT
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Contact
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                Emergency Response System<br />
                Built with ❤️ for saving lives
              </Typography>
            </Box>
          </Box>
          <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />
          <Typography variant="body2" sx={{ textAlign: 'center', opacity: 0.6 }}>
            © 2025 Rescue.net AI. Built for Central India Hackathon 2.0
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;
