/*
 * Enhanced Hospital Dashboard - Emergency response coordination center
 * Real-time patient monitoring and emergency management for healthcare providers
 * 
 * Features: Patient monitoring, emergency alerts, resource management, AI analytics
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Alert,
  Chip,
  Button,
  IconButton,
  AppBar,
  Toolbar,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Badge,
  LinearProgress,
} from '@mui/material';
import {
  LocalHospital,
  Logout,
  Emergency,
  People,
  Notifications,
  TrendingUp,
  Phone,
  LocationOn,
  MonitorHeart,
  Warning,
} from '@mui/icons-material';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { useAuth } from '../context/AuthContext';

interface PatientStatus {
  id: string;
  name: string;
  age: number;
  condition: 'critical' | 'stable' | 'warning';
  heartRate: number;
  temperature: number;
  location: string;
  lastUpdate: string;
  emergencyType?: string;
}

interface EmergencyIncident {
  id: string;
  patientName: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'responding' | 'resolved';
  location: string;
  timestamp: string;
  responder?: string;
}

const HospitalDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [patients, setPatients] = useState<PatientStatus[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyIncident[]>([]);
  const [hospitalStats, setHospitalStats] = useState({
    totalPatients: 0,
    activeEmergencies: 0,
    availableBeds: 15,
    totalBeds: 50,
    onDutyStaff: 12,
    totalStaff: 25,
  });

  // Simulate real-time data updates
  useEffect(() => {
    // Generate mock patient data
    const mockPatients: PatientStatus[] = [
      {
        id: '1',
        name: 'Rajesh Kumar',
        age: 45,
        condition: 'critical',
        heartRate: 125,
        temperature: 38.5,
        location: 'Andheri, Mumbai',
        lastUpdate: '2 min ago',
        emergencyType: 'Cardiac Event',
      },
      {
        id: '2',
        name: 'Priya Sharma',
        age: 32,
        condition: 'stable',
        heartRate: 78,
        temperature: 37.1,
        location: 'Bandra, Mumbai',
        lastUpdate: '5 min ago',
      },
      {
        id: '3',
        name: 'Amit Patel',
        age: 28,
        condition: 'warning',
        heartRate: 110,
        temperature: 37.8,
        location: 'Powai, Mumbai',
        lastUpdate: '1 min ago',
        emergencyType: 'Fall Detected',
      },
      {
        id: '4',
        name: 'Sunita Desai',
        age: 67,
        condition: 'stable',
        heartRate: 72,
        temperature: 36.9,
        location: 'Juhu, Mumbai',
        lastUpdate: '3 min ago',
      },
    ];

    // Generate mock emergency incidents
    const mockEmergencies: EmergencyIncident[] = [
      {
        id: 'e1',
        patientName: 'Rajesh Kumar',
        type: 'Cardiac Event',
        severity: 'critical',
        status: 'responding',
        location: 'Andheri, Mumbai',
        timestamp: '10:45 AM',
        responder: 'Dr. Shah',
      },
      {
        id: 'e2',
        patientName: 'Amit Patel',
        type: 'Fall Detection',
        severity: 'medium',
        status: 'active',
        location: 'Powai, Mumbai',
        timestamp: '11:20 AM',
      },
      {
        id: 'e3',
        patientName: 'Maya Singh',
        type: 'High Temperature',
        severity: 'low',
        status: 'resolved',
        location: 'Malad, Mumbai',
        timestamp: '09:30 AM',
        responder: 'Dr. Verma',
      },
    ];

    setPatients(mockPatients);
    setEmergencies(mockEmergencies);
    setHospitalStats(prev => ({
      ...prev,
      totalPatients: mockPatients.length,
      activeEmergencies: mockEmergencies.filter(e => e.status === 'active').length,
    }));

    // Simulate real-time updates
    const interval = setInterval(() => {
      setPatients(prev => prev.map(patient => ({
        ...patient,
        heartRate: patient.heartRate + (Math.random() - 0.5) * 5,
        temperature: Math.round((patient.temperature + (Math.random() - 0.5) * 0.3) * 10) / 10,
        lastUpdate: 'Just now',
      })));
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
  };

  const handleEmergencyResponse = (emergencyId: string) => {
    setEmergencies(prev => prev.map(emergency => 
      emergency.id === emergencyId 
        ? { ...emergency, status: 'responding', responder: 'Dr. On-Call' }
        : emergency
    ));
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'critical': return 'error';
      case 'warning': return 'warning';
      case 'stable': return 'success';
      default: return 'default';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ff1744';
      case 'high': return '#ff5722';
      case 'medium': return '#ff9800';
      case 'low': return '#4caf50';
      default: return '#gray';
    }
  };

  // Chart data
  const bedOccupancyData = [
    { name: 'Occupied', value: hospitalStats.totalBeds - hospitalStats.availableBeds, color: '#ff5722' },
    { name: 'Available', value: hospitalStats.availableBeds, color: '#4caf50' },
  ];

  const emergencyTrendsData = [
    { time: '08:00', emergencies: 2, patients: 15 },
    { time: '09:00', emergencies: 1, patients: 18 },
    { time: '10:00', emergencies: 3, patients: 22 },
    { time: '11:00', emergencies: 2, patients: 20 },
    { time: '12:00', emergencies: 1, patients: 19 },
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* App Bar */}
      <AppBar position="static" elevation={0}>
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <LocalHospital sx={{ mr: 1 }} />
            <Typography variant="h6" component="div">
              Rescue.net AI - Hospital Command Center
            </Typography>
          </Box>
          
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.name || 'Hospital Admin'}
          </Typography>
          
          <IconButton color="inherit" onClick={handleLogout}>
            <Logout />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Active Emergencies Alert */}
        {emergencies.filter(e => e.status === 'active').length > 0 && (
          <Alert 
            severity="error" 
            sx={{ mb: 3, animation: 'pulse 1s infinite' }}
            action={
              <Button color="inherit" size="small">
                VIEW ALL
              </Button>
            }
          >
            🚨 {emergencies.filter(e => e.status === 'active').length} ACTIVE EMERGENCIES requiring immediate attention!
          </Alert>
        )}

        {/* Hospital Stats Overview */}
        <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
          <Card elevation={3} sx={{ flex: 1, minWidth: 200 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <People sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {hospitalStats.totalPatients}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Monitored Patients
              </Typography>
            </CardContent>
          </Card>

          <Card elevation={3} sx={{ flex: 1, minWidth: 200 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Emergency sx={{ fontSize: 48, color: 'error.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                {hospitalStats.activeEmergencies}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Active Emergencies
              </Typography>
            </CardContent>
          </Card>

          <Card elevation={3} sx={{ flex: 1, minWidth: 200 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <LocalHospital sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                {hospitalStats.availableBeds}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Available Beds
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={(hospitalStats.availableBeds / hospitalStats.totalBeds) * 100} 
                sx={{ mt: 1 }}
                color="success"
              />
            </CardContent>
          </Card>

          <Card elevation={3} sx={{ flex: 1, minWidth: 200 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <MonitorHeart sx={{ fontSize: 48, color: 'info.main', mb: 1 }} />
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                {hospitalStats.onDutyStaff}
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Staff On Duty
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Main Content Grid */}
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {/* Patient Monitoring Table */}
          <Card elevation={3} sx={{ flex: 2, minWidth: 600 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                <People sx={{ mr: 1, color: 'primary.main' }} />
                Real-time Patient Monitoring
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Patient</strong></TableCell>
                      <TableCell><strong>Age</strong></TableCell>
                      <TableCell><strong>Status</strong></TableCell>
                      <TableCell><strong>Heart Rate</strong></TableCell>
                      <TableCell><strong>Temperature</strong></TableCell>
                      <TableCell><strong>Location</strong></TableCell>
                      <TableCell><strong>Actions</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {patients.map((patient) => (
                      <TableRow key={patient.id} sx={{ '&:hover': { backgroundColor: '#f5f5f5' } }}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {patient.name}
                            </Typography>
                            {patient.emergencyType && (
                              <Chip 
                                label={patient.emergencyType} 
                                size="small" 
                                color="error" 
                                sx={{ mt: 0.5 }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>{patient.age}</TableCell>
                        <TableCell>
                          <Chip 
                            label={patient.condition}
                            color={getConditionColor(patient.condition)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ 
                            color: patient.heartRate > 100 ? 'error.main' : 'text.primary',
                            fontWeight: patient.heartRate > 100 ? 'bold' : 'normal'
                          }}>
                            {Math.round(patient.heartRate)} BPM
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ 
                            color: patient.temperature > 37.5 ? 'error.main' : 'text.primary',
                            fontWeight: patient.temperature > 37.5 ? 'bold' : 'normal'
                          }}>
                            {patient.temperature}°C
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{patient.location}</Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" color="primary">
                            <Phone />
                          </IconButton>
                          <IconButton size="small" color="secondary">
                            <LocationOn />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {/* Emergency Incidents & Analytics */}
          <Box sx={{ flex: 1, minWidth: 350, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Emergency Incidents */}
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <Emergency sx={{ mr: 1, color: 'error.main' }} />
                  Emergency Incidents
                  <Badge badgeContent={emergencies.filter(e => e.status === 'active').length} color="error" sx={{ ml: 'auto' }}>
                    <Notifications />
                  </Badge>
                </Typography>
                {emergencies.map((emergency) => (
                  <Box key={emergency.id} sx={{ 
                    p: 2, 
                    mb: 1, 
                    borderRadius: 1, 
                    border: '1px solid #e0e0e0',
                    backgroundColor: emergency.status === 'active' ? '#fff3e0' : '#f5f5f5'
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {emergency.patientName}
                      </Typography>
                      <Chip 
                        label={emergency.status}
                        size="small"
                        color={emergency.status === 'active' ? 'error' : emergency.status === 'responding' ? 'warning' : 'success'}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {emergency.type} • {emergency.severity.toUpperCase()} • {emergency.timestamp}
                    </Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      📍 {emergency.location}
                    </Typography>
                    {emergency.status === 'active' && (
                      <Button 
                        size="small" 
                        variant="contained" 
                        color="error" 
                        sx={{ mt: 1 }}
                        onClick={() => handleEmergencyResponse(emergency.id)}
                      >
                        RESPOND
                      </Button>
                    )}
                    {emergency.responder && (
                      <Typography variant="caption" color="primary" display="block" sx={{ mt: 1 }}>
                        👨‍⚕️ {emergency.responder}
                      </Typography>
                    )}
                  </Box>
                ))}
              </CardContent>
            </Card>

            {/* Hospital Analytics */}
            <Card elevation={3}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                  <TrendingUp sx={{ mr: 1, color: 'info.main' }} />
                  Real-time Analytics
                </Typography>
                
                {/* Bed Occupancy */}
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Bed Occupancy</Typography>
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie
                      data={bedOccupancyData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={50}
                      dataKey="value"
                    >
                      {bedOccupancyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>

                {/* Emergency Trends */}
                <Typography variant="subtitle2" sx={{ mb: 1, mt: 2 }}>Emergency Trends</Typography>
                <ResponsiveContainer width="100%" height={150}>
                  <LineChart data={emergencyTrendsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="emergencies" stroke="#ff1744" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={{ textAlign: 'center', mt: 4, py: 2 }}>
          <Typography variant="caption" color="text.disabled">
            Rescue.net AI Hospital Command Center • Emergency Response Coordination • Central India Hackathon 2.0 🏥
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default HospitalDashboard;
