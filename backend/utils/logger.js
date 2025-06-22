// Simple logger utility for Rescue.net AI Backend
// Hackathon version - lightweight logging

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
  }

  formatMessage(level, message, data = null) {
    const timestamp = new Date().toISOString();
    const baseMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    if (data) {
      return `${baseMessage} ${JSON.stringify(data, null, 2)}`;
    }
    return baseMessage;
  }

  info(message, data = null) {
    console.log(colors.blue + this.formatMessage('info', message, data) + colors.reset);
  }

  warn(message, data = null) {
    console.log(colors.yellow + this.formatMessage('warn', message, data) + colors.reset);
  }

  error(message, data = null) {
    console.log(colors.red + this.formatMessage('error', message, data) + colors.reset);
  }

  success(message, data = null) {
    console.log(colors.green + this.formatMessage('success', message, data) + colors.reset);
  }

  debug(message, data = null) {
    if (this.logLevel === 'debug') {
      console.log(colors.cyan + this.formatMessage('debug', message, data) + colors.reset);
    }
  }
}

module.exports = new Logger();
