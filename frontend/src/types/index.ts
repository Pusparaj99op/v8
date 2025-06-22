/*
 * TypeScript Type Definitions for Rescue.net AI
 * Defines all data structures used throughout the application
 * 
 * Ensures type safety and better development experience
 */

export interface User {
  id: string;
  name: string;
  email: string;
  userType: 'patient' | 'hospital';
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Patient extends User {
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  bloodGroup: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  medicalConditions: string[];
  medications: string[];
  allergies: string[];
  assignedHospital?: string;
  assignedDoctor?: string;
  emergencyContacts: EmergencyContact[];
  wearableDevice?: WearableDevice;
  preferences: PatientPreferences;
}

export interface Hospital extends User {
  name: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  capacity: {
    totalBeds: number;
    availableBeds: number;
    icuBeds: number;
    emergencyBeds: number;
  };
  staff: StaffMember[];
  emergencyResponse: {
    ambulanceAvailable: boolean;
    averageResponseTime: number; // in minutes
    emergencyNumber: string;
  };
  assignedPatients: string[];
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimary: boolean;
}

export interface WearableDevice {
  deviceId: string;
  deviceType: string;
  isActive: boolean;
  batteryLevel: number;
  lastSeen: string;
  firmwareVersion: string;
}

export interface PatientPreferences {
  emergencyNotifications: {
    sms: boolean;
    email: boolean;
    push: boolean;
  };
  dataSharing: {
    allowResearch: boolean;
    allowAnonymousAnalytics: boolean;
  };
  language: string;
  timezone: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  department: string;
  phone: string;
  email: string;
  isOnDuty: boolean;
}

export interface HealthData {
  id: string;
  patientId: string;
  timestamp: string;
  vitals: {
    heartRate: number;
    bloodPressure: {
      systolic: number;
      diastolic: number;
    };
    bodyTemperature: number;
    oxygenSaturation: number;
    respiratoryRate: number;
  };
  motion: {
    steps: number;
    accelerometer: {
      x: number;
      y: number;
      z: number;
    };
    fallDetected: boolean;
  };
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    address?: string;
  };
  deviceStatus: {
    batteryLevel: number;
    signalStrength: number;
    isCharging: boolean;
  };
  aiAnalysis?: AIAnalysis;
}

export interface AIAnalysis {
  riskScore: number; // 0-100
  anomaliesDetected: string[];
  recommendations: string[];
  healthTrend: 'improving' | 'stable' | 'declining';
  emergencyPrediction: {
    probability: number;
    timeWindow: number; // hours
    confidence: number;
  };
}

export interface Emergency {
  id: string;
  patientId: string;
  hospitalId?: string;
  type: 'fall' | 'cardiac' | 'respiratory' | 'critical_vitals' | 'manual' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'detected' | 'acknowledged' | 'responding' | 'resolved' | 'cancelled';
  detectedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  vitalsAtTime: {
    heartRate: number;
    bloodPressure: {
      systolic: number;
      diastolic: number;
    };
    bodyTemperature: number;
    oxygenSaturation: number;
  };
  responses: EmergencyResponse[];
  aiPrediction?: {
    confidence: number;
    factors: string[];
  };
}

export interface EmergencyResponse {
  id: string;
  responderId: string;
  responderName: string;
  responderType: 'hospital' | 'ambulance' | 'family' | 'doctor';
  responseTime: string;
  estimatedArrival?: string;
  status: 'dispatched' | 'enroute' | 'arrived' | 'completed';
  notes?: string;
}

export interface DashboardStats {
  patient: {
    currentVitals: {
      heartRate: number;
      bloodPressure: string;
      temperature: number;
      oxygenSaturation: number;
    };
    todayStats: {
      steps: number;
      averageHeartRate: number;
      sleepHours: number;
      caloriesBurned: number;
    };
    weeklyTrends: {
      heartRate: number[];
      steps: number[];
      sleep: number[];
    };
    deviceStatus: {
      batteryLevel: number;
      isConnected: boolean;
      lastSync: string;
    };
    emergencyCount: number;
    riskScore: number;
  };
  hospital: {
    totalPatients: number;
    activeEmergencies: number;
    bedOccupancy: {
      total: number;
      occupied: number;
      available: number;
    };
    staffOnDuty: number;
    todayEmergencies: number;
    averageResponseTime: number;
    criticalPatients: number;
  };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'emergency';
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Chart data types
export interface ChartDataPoint {
  timestamp: string;
  value: number;
  label?: string;
}

export interface HealthTrend {
  metric: string;
  data: ChartDataPoint[];
  trend: 'up' | 'down' | 'stable';
  changePercentage: number;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
  userType: 'patient' | 'hospital';
}

export interface PatientRegistrationForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  bloodGroup: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  medicalConditions: string[];
  medications: string[];
  allergies: string[];
}

export interface HospitalRegistrationForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
  };
  capacity: {
    totalBeds: number;
    icuBeds: number;
    emergencyBeds: number;
  };
  emergencyNumber: string;
}

// WebSocket event types
export interface WebSocketEvent {
  type: 'health-update' | 'emergency-alert' | 'device-status' | 'notification';
  data: any;
  timestamp: string;
}

export interface DeviceData {
  patientId: string;
  timestamp: string;
  heartRate: number;
  temperature: number;
  bloodPressure: {
    systolic: number;
    diastolic: number;
  };
  oxygenSaturation: number;
  accelerometer: {
    x: number;
    y: number;
    z: number;
  };
  location: {
    latitude: number;
    longitude: number;
  };
  batteryLevel: number;
}
