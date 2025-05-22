import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logPath = path.join(__dirname, '../../logs');

// Create logs directory if it doesn't exist
if (!fs.existsSync(logPath)) {
  fs.mkdirSync(logPath, { recursive: true });
}

const logFilePath = path.join(logPath, 'bot.log');

export const log = (message, type = 'INFO') => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${type}] ${message}\n`;
  
  // Log to console
  console.log(logMessage.trim());
  
  // Log to file
  fs.appendFileSync(logFilePath, logMessage);
};

export const getLog = () => {
  try {
    if (fs.existsSync(logFilePath)) {
      return fs.readFileSync(logFilePath, 'utf8');
    }
    return 'Log file is empty';
  } catch (error) {
    console.error('Error reading log file:', error);
    return 'Error reading log file';
  }
};

export const error = (message, error) => {
  const errorMessage = error ? `${message}: ${error.message}` : message;
  log(errorMessage, 'ERROR');
  if (error?.stack) {
    log(error.stack, 'ERROR_STACK');
  }
}; 