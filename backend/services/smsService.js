/*
 * SMS Service - SMS alert system for emergency notifications
 * Handles SMS sending via Twilio for emergency alerts and notifications
 * 
 * Provides SMS backup communication when internet is unavailable
 */

const twilio = require('twilio');

class SMSService {
  constructor() {
    this.client = null;
    this.isInitialized = false;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
    
    this.initialize();
  }
  
  // Initialize Twilio client
  initialize() {
    try {
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        console.warn('Twilio credentials not provided. SMS service disabled.');
        return;
      }
      
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      
      this.isInitialized = true;
      console.log('✅ SMS service initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize SMS service:', error);
    }
  }
  
  // Send emergency alert SMS
  async sendEmergencyAlert(phoneNumber, emergency, patient, recipientName = '') {
    if (!this.isInitialized) {
      console.warn('SMS service not initialized');
      return null;
    }
    
    try {
      const message = this.formatEmergencyMessage(emergency, patient, recipientName);
      
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: phoneNumber
      });
      
      return {
        type: 'sms',
        recipient: {
          name: recipientName,
          phone: phoneNumber
        },
        message: message,
        sentAt: new Date(),
        delivered: true,
        deliveredAt: new Date(),
        messageId: result.sid,
        status: result.status
      };
      
    } catch (error) {
      console.error('Failed to send emergency SMS:', error);
      
      return {
        type: 'sms',
        recipient: {
          name: recipientName,
          phone: phoneNumber
        },
        message: this.formatEmergencyMessage(emergency, patient, recipientName),
        sentAt: new Date(),
        delivered: false,
        failureReason: error.message
      };
    }
  }
  
  // Send status update SMS
  async sendStatusUpdate(phoneNumber, emergency, status, recipientName = '') {
    if (!this.isInitialized) return null;
    
    try {
      const message = this.formatStatusMessage(emergency, status);
      
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: phoneNumber
      });
      
      return {
        type: 'sms',
        recipient: {
          name: recipientName,
          phone: phoneNumber
        },
        message: message,
        sentAt: new Date(),
        delivered: true,
        messageId: result.sid,
        status: result.status
      };
      
    } catch (error) {
      console.error('Failed to send status SMS:', error);
      return null;
    }
  }
  
  // Send hospital notification SMS
  async sendHospitalNotification(phoneNumber, emergency, patient, hospital) {
    if (!this.isInitialized) return null;
    
    try {
      const message = this.formatHospitalMessage(emergency, patient, hospital);
      
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: phoneNumber
      });
      
      return {
        type: 'sms',
        recipient: {
          phone: phoneNumber,
          hospitalId: hospital._id
        },
        message: message,
        sentAt: new Date(),
        delivered: true,
        messageId: result.sid
      };
      
    } catch (error) {
      console.error('Failed to send hospital SMS:', error);
      return null;
    }
  }
  
  // Send health alert SMS (non-emergency)
  async sendHealthAlert(phoneNumber, patient, alertType, details, recipientName = '') {
    if (!this.isInitialized) return null;
    
    try {
      const message = this.formatHealthAlertMessage(patient, alertType, details);
      
      const result = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to: phoneNumber
      });
      
      return {
        type: 'sms',
        recipient: {
          name: recipientName,
          phone: phoneNumber
        },
        message: message,
        sentAt: new Date(),
        delivered: true,
        messageId: result.sid
      };
      
    } catch (error) {
      console.error('Failed to send health alert SMS:', error);
      return null;
    }
  }
  
  // Format emergency message for SMS
  formatEmergencyMessage(emergency, patient, recipientName) {
    let message = `🚨 RESCUE.NET AI EMERGENCY ALERT 🚨\n\n`;
    
    if (recipientName) {
      message += `Dear ${recipientName},\n\n`;
    }
    
    message += `EMERGENCY: ${emergency.type.replace(/_/g, ' ').toUpperCase()}\n`;
    message += `Severity: ${emergency.severity.toUpperCase()}\n\n`;
    
    message += `Patient: ${patient.name}\n`;
    message += `Phone: ${patient.phone}\n`;
    message += `Patient ID: ${patient.patientId}\n\n`;
    
    message += `Details: ${emergency.description}\n`;
    message += `Time: ${this.formatDateTime(emergency.detectedAt)}\n`;
    message += `Emergency ID: ${emergency.emergencyId}\n\n`;
    
    // Add location if available
    if (emergency.location && emergency.location.coordinates) {
      const [lng, lat] = emergency.location.coordinates;
      message += `Location: https://maps.google.com/?q=${lat},${lng}\n\n`;
    }
    
    // Add vital signs
    if (emergency.triggerData) {
      message += `Vitals:\n`;
      if (emergency.triggerData.heartRate) {
        message += `HR: ${emergency.triggerData.heartRate} bpm\n`;
      }
      if (emergency.triggerData.temperature) {
        message += `Temp: ${emergency.triggerData.temperature}°C\n`;
      }
      message += '\n';
    }
    
    message += `Please contact emergency services immediately if needed.\n\n`;
    message += `Rescue.net AI - Emergency Response System`;
    
    return message;
  }
  
  // Format status update message
  formatStatusMessage(emergency, status) {
    let message = `RESCUE.NET AI - Status Update\n\n`;
    message += `Emergency ID: ${emergency.emergencyId}\n`;
    message += `Status: ${status.toUpperCase()}\n`;
    message += `Updated: ${this.formatDateTime(new Date())}\n\n`;
    
    const statusMessages = {
      'acknowledged': 'Emergency has been acknowledged by medical staff.',
      'responding': 'Emergency response team is on the way.',
      'resolved': 'Emergency has been resolved. Patient is safe.',
      'false_alarm': 'Alert was determined to be a false alarm.'
    };
    
    message += statusMessages[status] || 'Status has been updated.';
    
    return message;
  }
  
  // Format hospital notification message
  formatHospitalMessage(emergency, patient, hospital) {
    let message = `RESCUE.NET AI - Hospital Alert\n\n`;
    message += `Hospital: ${hospital.name}\n\n`;
    message += `EMERGENCY ASSIGNMENT\n`;
    message += `Emergency ID: ${emergency.emergencyId}\n`;
    message += `Type: ${emergency.type.replace(/_/g, ' ')}\n`;
    message += `Severity: ${emergency.severity}\n\n`;
    
    message += `Patient: ${patient.name}\n`;
    message += `Phone: ${patient.phone}\n`;
    message += `Time: ${this.formatDateTime(emergency.detectedAt)}\n\n`;
    
    if (emergency.location?.coordinates) {
      const [lng, lat] = emergency.location.coordinates;
      message += `Location: https://maps.google.com/?q=${lat},${lng}\n\n`;
    }
    
    message += `Please prepare for emergency patient arrival.\n`;
    message += `Contact: ${process.env.EMERGENCY_PHONE_1 || '+919067463863'}`;
    
    return message;
  }
  
  // Format health alert message
  formatHealthAlertMessage(patient, alertType, details) {
    let message = `RESCUE.NET AI - Health Alert\n\n`;
    message += `Patient: ${patient.name}\n`;
    message += `Alert: ${alertType}\n`;
    message += `Time: ${this.formatDateTime(new Date())}\n\n`;
    
    if (details) {
      message += `Details: ${details}\n\n`;
    }
    
    message += `This is a health monitoring alert. Please check on the patient if necessary.\n\n`;
    message += `For emergencies, call: ${process.env.EMERGENCY_PHONE_1 || '+919067463863'}`;
    
    return message;
  }
  
  // Bulk SMS sending for multiple recipients
  async sendBulkSMS(phoneNumbers, message) {
    if (!this.isInitialized) return [];
    
    const results = [];
    
    for (const phoneNumber of phoneNumbers) {
      try {
        const result = await this.client.messages.create({
          body: message,
          from: this.fromNumber,
          to: phoneNumber
        });
        
        results.push({
          phone: phoneNumber,
          success: true,
          messageId: result.sid,
          status: result.status
        });
        
      } catch (error) {
        results.push({
          phone: phoneNumber,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  // Format date and time for Indian locale
  formatDateTime(date) {
    return new Date(date).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  // Validate phone number format
  validatePhoneNumber(phoneNumber) {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Check if it's a valid Indian mobile number
    if (cleaned.length === 10 && cleaned.startsWith('9')) {
      return '+91' + cleaned;
    }
    
    // Check if it already has country code
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return '+' + cleaned;
    }
    
    // Check if it already has + prefix
    if (phoneNumber.startsWith('+91') && phoneNumber.length === 13) {
      return phoneNumber;
    }
    
    return null; // Invalid format
  }
  
  // Test SMS service connectivity
  async testConnection() {
    if (!this.isInitialized) {
      return { success: false, message: 'SMS service not initialized' };
    }
    
    try {
      // Try to get account info to test connection
      const account = await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      
      return {
        success: true,
        accountSid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = SMSService;
