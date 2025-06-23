/*
 * Demo Data Setup - Creates demo patient and hospital accounts
 * Used for Central India Hackathon 2.0 demonstration
 * 
 * Run this script to populate demo credentials in the database
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Patient = require('./models/Patient');
const Hospital = require('./models/Hospital');

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rescue-net-ai');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Create demo patient
const createDemoPatient = async () => {
  try {
    // Check if demo patient already exists
    const existingPatient = await Patient.findOne({ 
      $or: [{ email: '9876543210' }, { phone: '9876543210' }] 
    });
    
    if (existingPatient) {
      console.log('Demo patient already exists');
      return existingPatient;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('patient123', 12);

    // Create demo patient
    const demoPatient = new Patient({
      patientId: 'DEMO-PAT-001',
      name: 'Demo Patient',
      email: '9876543210', // Using phone as email for demo
      phone: '9876543210',
      password: hashedPassword,
      dateOfBirth: new Date('1990-01-01'),
      gender: 'male',
      bloodGroup: 'B+',
      height: 175,
      weight: 70,
      address: {
        street: 'Demo Street 123',
        city: 'Bhopal',
        state: 'Madhya Pradesh',
        pincode: '462001',
        country: 'India'
      },
      emergencyContacts: [
        {
          name: 'Demo Family Member',
          relationship: 'spouse',
          phone: '+91-9876543211',
          telegramId: 'demo_family',
          isPrimary: true
        }
      ],
      medicalHistory: {
        conditions: ['None'],
        surgeries: [],
        familyHistory: ['Heart Disease']
      },
      medications: [],
      allergies: [],
      deviceId: 'demo-device-001',
      isActive: true,
      preferences: {
        emergencyAlerts: true,
        telegramNotifications: true,
        smsNotifications: true,
        language: 'en'
      }
    });

    await demoPatient.save();
    console.log('Demo patient created successfully');
    return demoPatient;
  } catch (error) {
    console.error('Error creating demo patient:', error);
    throw error;
  }
};

// Create demo hospital
const createDemoHospital = async () => {
  try {
    // Check if demo hospital already exists
    const existingHospital = await Hospital.findOne({ email: 'demo@hospital.com' });
    
    if (existingHospital) {
      console.log('Demo hospital already exists');
      return existingHospital;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('hospital123', 12);

    // Create demo hospital
    const demoHospital = new Hospital({
      hospitalId: 'HOSP-DEMO-001',
      name: 'Demo General Hospital',
      email: 'demo@hospital.com',
      phone: '+91-755-1234567',
      password: hashedPassword,
      address: {
        street: 'Hospital Road 456',
        city: 'Bhopal',
        state: 'Madhya Pradesh',
        pincode: '462002',
        country: 'India'
      },
      contactPerson: {
        name: 'Dr. Demo Admin',
        designation: 'Administrator',
        phone: '+91-9876543212',
        email: 'admin@demo.hospital.com'
      },
      departments: [
        'Emergency',
        'Cardiology',
        'General Medicine',
        'ICU',
        'Surgery'
      ],
      facilities: [
        'Emergency Care',
        '24/7 Ambulance',
        'ICU',
        'Surgery Theater',
        'Diagnostic Lab'
      ],
      emergencyCapacity: {
        beds: 50,
        availableBeds: 35,
        ventilators: 10,
        availableVentilators: 7
      },
      operatingHours: {
        emergency: '24/7',
        general: '8:00 AM - 8:00 PM'
      },
      coordinates: {
        latitude: 23.2599,
        longitude: 77.4126
      },
      isActive: true,
      isVerified: true,
      accreditation: ['NABH', 'JCI'],
      insuranceAccepted: ['Government', 'Private', 'Ayushman Bharat']
    });

    await demoHospital.save();
    console.log('Demo hospital created successfully');
    return demoHospital;
  } catch (error) {
    console.error('Error creating demo hospital:', error);
    throw error;
  }
};

// Main setup function
const setupDemoData = async () => {
  try {
    console.log('Setting up demo data for Rescue.net AI...');
    
    await connectDB();
    
    const patient = await createDemoPatient();
    const hospital = await createDemoHospital();
    
    console.log('\n✅ Demo data setup completed successfully!');
    console.log('\n📋 Demo Credentials:');
    console.log('Patient Login:');
    console.log('  Phone: 9876543210');
    console.log('  Password: patient123');
    console.log('\nHospital Login:');
    console.log('  Email: demo@hospital.com');
    console.log('  Password: hospital123');
    
    console.log('\n🚀 You can now test the login functionality!');
    
    process.exit(0);
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
};

// Run setup if this file is executed directly
if (require.main === module) {
  require('dotenv').config();
  setupDemoData();
}

module.exports = { setupDemoData, createDemoPatient, createDemoHospital };
