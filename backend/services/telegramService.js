/*
 * Telegram Service - Telegram Bot integration for emergency alerts
 * Sends real-time emergency notifications to Telegram groups and individuals
 * 
 * Provides instant emergency communication to family and medical staff
 */

const TelegramBot = require('node-telegram-bot-api');

class TelegramService {
  constructor() {
    this.bot = null;
    this.chatIds = [];
    this.isInitialized = false;
    
    this.initialize();
  }
  
  // Initialize Telegram bot
  initialize() {
    try {
      if (!process.env.TELEGRAM_BOT_TOKEN) {
        console.warn('Telegram bot token not provided. Telegram service disabled.');
        return;
      }
      
      this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
      
      // Parse chat IDs from environment variable
      if (process.env.TELEGRAM_CHAT_ID) {
        this.chatIds = process.env.TELEGRAM_CHAT_ID.split(',').map(id => id.trim());
      }
      
      this.isInitialized = true;
      console.log('✅ Telegram service initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize Telegram service:', error);
    }
  }
  
  // Send emergency alert via Telegram
  async sendEmergencyAlert(emergency, patient) {
    if (!this.isInitialized) {
      console.warn('Telegram service not initialized');
      return null;
    }
    
    try {
      const message = this.formatEmergencyMessage(emergency, patient);
      const results = [];
      
      // Send to all configured chat IDs
      for (const chatId of this.chatIds) {
        try {
          const result = await this.bot.sendMessage(chatId, message, {
            parse_mode: 'HTML',
            disable_web_page_preview: true
          });
          
          results.push({
            type: 'telegram',
            recipient: { chatId: chatId },
            message: message,
            sentAt: new Date(),
            delivered: true,
            deliveredAt: new Date(),
            messageId: result.message_id
          });
          
        } catch (error) {
          console.error(`Failed to send Telegram message to ${chatId}:`, error);
          results.push({
            type: 'telegram',
            recipient: { chatId: chatId },
            message: message,
            sentAt: new Date(),
            delivered: false,
            failureReason: error.message
          });
        }
      }
      
      return results;
      
    } catch (error) {
      console.error('Error sending Telegram emergency alert:', error);
      return null;
    }
  }
  
  // Send health update notification
  async sendHealthUpdate(patient, healthData, alertLevel = 'info') {
    if (!this.isInitialized) return null;
    
    try {
      const message = this.formatHealthUpdateMessage(patient, healthData, alertLevel);
      const results = [];
      
      for (const chatId of this.chatIds) {
        try {
          const result = await this.bot.sendMessage(chatId, message, {
            parse_mode: 'HTML'
          });
          
          results.push({
            type: 'telegram',
            recipient: { chatId: chatId },
            message: message,
            sentAt: new Date(),
            delivered: true,
            messageId: result.message_id
          });
          
        } catch (error) {
          console.error(`Failed to send health update to ${chatId}:`, error);
        }
      }
      
      return results;
      
    } catch (error) {
      console.error('Error sending health update:', error);
      return null;
    }
  }
  
  // Send hospital notification
  async sendHospitalNotification(hospital, emergency, patient) {
    if (!this.isInitialized) return null;
    
    try {
      const message = this.formatHospitalNotification(hospital, emergency, patient);
      
      // You could have hospital-specific chat IDs here
      const results = [];
      
      for (const chatId of this.chatIds) {
        try {
          const result = await this.bot.sendMessage(chatId, message, {
            parse_mode: 'HTML'
          });
          
          results.push({
            type: 'telegram',
            recipient: { chatId: chatId, hospitalId: hospital._id },
            message: message,
            sentAt: new Date(),
            delivered: true,
            messageId: result.message_id
          });
          
        } catch (error) {
          console.error(`Failed to send hospital notification to ${chatId}:`, error);
        }
      }
      
      return results;
      
    } catch (error) {
      console.error('Error sending hospital notification:', error);
      return null;
    }
  }
  
  // Send patient status update
  async sendStatusUpdate(emergency, status, notes = '') {
    if (!this.isInitialized) return null;
    
    try {
      const message = this.formatStatusUpdate(emergency, status, notes);
      
      for (const chatId of this.chatIds) {
        try {
          await this.bot.sendMessage(chatId, message, {
            parse_mode: 'HTML'
          });
        } catch (error) {
          console.error(`Failed to send status update to ${chatId}:`, error);
        }
      }
      
    } catch (error) {
      console.error('Error sending status update:', error);
    }
  }
  
  // Format emergency message with proper styling
  formatEmergencyMessage(emergency, patient) {
    const emergencyIcon = this.getEmergencyIcon(emergency.type, emergency.severity);
    const severityEmoji = this.getSeverityEmoji(emergency.severity);
    
    let message = `🚨 <b>RESCUE.NET AI - EMERGENCY ALERT</b> 🚨\n\n`;
    message += `${emergencyIcon} <b>Emergency Type:</b> ${emergency.type.replace(/_/g, ' ').toUpperCase()}\n`;
    message += `${severityEmoji} <b>Severity:</b> ${emergency.severity.toUpperCase()}\n\n`;
    
    message += `👤 <b>Patient:</b> ${patient.name}\n`;
    message += `📱 <b>Phone:</b> ${patient.phone}\n`;
    message += `🆔 <b>Patient ID:</b> ${patient.patientId}\n\n`;
    
    message += `📋 <b>Details:</b> ${emergency.description}\n`;
    message += `🕐 <b>Detected At:</b> ${this.formatDateTime(emergency.detectedAt)}\n`;
    message += `🆔 <b>Emergency ID:</b> ${emergency.emergencyId}\n\n`;
    
    // Add location if available
    if (emergency.location && emergency.location.coordinates) {
      const [lng, lat] = emergency.location.coordinates;
      message += `📍 <b>Location:</b> ${lat.toFixed(6)}, ${lng.toFixed(6)}\n`;
      message += `🗺️ <b>Map:</b> https://maps.google.com/?q=${lat},${lng}\n\n`;
    }
    
    // Add vital signs if available
    if (emergency.triggerData) {
      message += `💓 <b>Vital Signs:</b>\n`;
      if (emergency.triggerData.heartRate) {
        message += `  • Heart Rate: ${emergency.triggerData.heartRate} bpm\n`;
      }
      if (emergency.triggerData.temperature) {
        message += `  • Temperature: ${emergency.triggerData.temperature}°C\n`;
      }
      if (emergency.triggerData.bloodPressure?.systolic) {
        message += `  • Blood Pressure: ${emergency.triggerData.bloodPressure.systolic}/${emergency.triggerData.bloodPressure.diastolic} mmHg\n`;
      }
      message += '\n';
    }
    
    // Add emergency contacts
    if (patient.emergencyContacts && patient.emergencyContacts.length > 0) {
      message += `📞 <b>Emergency Contacts:</b>\n`;
      patient.emergencyContacts.slice(0, 2).forEach(contact => {
        message += `  • ${contact.name} (${contact.relationship}): ${contact.phone}\n`;
      });
      message += '\n';
    }
    
    message += `⚡ <i>Rescue.net AI - India's Emergency Response System</i>`;
    
    return message;
  }
  
  // Format health update message
  formatHealthUpdateMessage(patient, healthData, alertLevel) {
    const icon = alertLevel === 'warning' ? '⚠️' : 'ℹ️';
    
    let message = `${icon} <b>HEALTH UPDATE</b>\n\n`;
    message += `👤 <b>Patient:</b> ${patient.name}\n`;
    message += `🕐 <b>Time:</b> ${this.formatDateTime(healthData.timestamp)}\n\n`;
    
    message += `💓 <b>Vital Signs:</b>\n`;
    if (healthData.vitals.heartRate?.value) {
      message += `  • Heart Rate: ${healthData.vitals.heartRate.value} bpm\n`;
    }
    if (healthData.vitals.temperature?.value) {
      message += `  • Temperature: ${healthData.vitals.temperature.value}°C\n`;
    }
    
    if (healthData.deviceStatus?.batteryLevel !== undefined) {
      message += `\n🔋 <b>Device Battery:</b> ${healthData.deviceStatus.batteryLevel}%\n`;
    }
    
    return message;
  }
  
  // Format hospital notification
  formatHospitalNotification(hospital, emergency, patient) {
    let message = `🏥 <b>HOSPITAL EMERGENCY ASSIGNMENT</b>\n\n`;
    message += `🏥 <b>Hospital:</b> ${hospital.name}\n`;
    message += `🚨 <b>Emergency ID:</b> ${emergency.emergencyId}\n`;
    message += `👤 <b>Patient:</b> ${patient.name}\n`;
    message += `📱 <b>Contact:</b> ${patient.phone}\n\n`;
    
    message += `⚡ <b>Type:</b> ${emergency.type.replace(/_/g, ' ')}\n`;
    message += `🔥 <b>Severity:</b> ${emergency.severity}\n`;
    message += `🕐 <b>Time:</b> ${this.formatDateTime(emergency.detectedAt)}\n\n`;
    
    if (emergency.location?.coordinates) {
      const [lng, lat] = emergency.location.coordinates;
      message += `📍 <b>Location:</b> https://maps.google.com/?q=${lat},${lng}\n\n`;
    }
    
    message += `⚡ Please respond immediately to coordinate emergency care.`;
    
    return message;
  }
  
  // Format status update message
  formatStatusUpdate(emergency, status, notes) {
    const statusEmoji = {
      'acknowledged': '✅',
      'responding': '🚑',
      'resolved': '✅',
      'false_alarm': '❌'
    };
    
    let message = `${statusEmoji[status] || 'ℹ️'} <b>EMERGENCY STATUS UPDATE</b>\n\n`;
    message += `🆔 <b>Emergency ID:</b> ${emergency.emergencyId}\n`;
    message += `📊 <b>Status:</b> ${status.toUpperCase()}\n`;
    message += `🕐 <b>Updated:</b> ${this.formatDateTime(new Date())}\n`;
    
    if (notes) {
      message += `\n📝 <b>Notes:</b> ${notes}`;
    }
    
    return message;
  }
  
  // Helper methods
  getEmergencyIcon(type, severity) {
    const icons = {
      'fall_detected': '🤕',
      'heart_rate_anomaly': '💓',
      'temperature_anomaly': '🌡️',
      'blood_pressure_anomaly': '💉',
      'inactivity_alert': '😴',
      'panic_button': '🆘',
      'device_malfunction': '⚠️'
    };
    
    return icons[type] || '🚨';
  }
  
  getSeverityEmoji(severity) {
    const emojis = {
      'low': '🟡',
      'medium': '🟠',
      'high': '🔴',
      'critical': '🆘'
    };
    
    return emojis[severity] || '⚠️';
  }
  
  formatDateTime(date) {
    return new Date(date).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }
  
  // Test method to verify Telegram connectivity
  async testConnection() {
    if (!this.isInitialized) {
      return { success: false, message: 'Telegram service not initialized' };
    }
    
    try {
      const me = await this.bot.getMe();
      return {
        success: true,
        botInfo: me,
        chatIds: this.chatIds
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = TelegramService;
