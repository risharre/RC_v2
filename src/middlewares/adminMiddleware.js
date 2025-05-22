import dotenv from 'dotenv';
import { log } from '../utils/logger.js';

dotenv.config();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'risharre';

export const adminMiddleware = (ctx, next) => {
  const username = ctx.from?.username;
  
  if (!username || username !== ADMIN_USERNAME) {
    log(`Unauthorized admin attempt by ${username || 'unknown user'}`);
    return ctx.reply('⛔️ Извините, эта команда доступна только администраторам.');
  }
  
  log(`Admin command by ${username}: ${ctx.message?.text}`);
  return next();
}; 