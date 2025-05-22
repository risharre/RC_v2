import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { setupStartCommand } from './commands/start.js';
import { setupRegisterCommand } from './commands/register.js';
import { setupEditCommand } from './commands/edit.js';
import { setupMatchCommand, notifyUsers } from './commands/match.js';
import { setupAdminCommands } from './commands/admin.js';
import { matchUsers } from './utils/matching.js';
import { log, error } from './utils/logger.js';

// Load environment variables
dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error('BOT_TOKEN is required in .env file');
  process.exit(1);
}

// Initialize bot
const bot = new Telegraf(BOT_TOKEN);

// Set up commands
setupStartCommand(bot);
setupRegisterCommand(bot);
setupEditCommand(bot);
setupMatchCommand(bot);
setupAdminCommands(bot);

// Schedule automatic matching every 3 hours
cron.schedule('0 */3 * * *', async () => {
  log('Running scheduled matching...');
  try {
    const matches = await matchUsers();
    log(`Scheduled matching completed. Created ${matches.length} pairs.`);
    
    if (matches.length > 0) {
      await notifyUsers(bot, matches);
    }
  } catch (err) {
    error('Error in scheduled matching', err);
  }
});

// Handle errors
bot.catch((err, ctx) => {
  error(`Error in bot update ${ctx.updateType}`, err);
  ctx.reply('Произошла ошибка. Пожалуйста, попробуйте позже.');
});

// Start bot
bot.launch()
  .then(() => {
    const now = new Date();
    log(`Bot started at ${now.toISOString()}`);
    console.log('Бот запущен...');
  })
  .catch(err => {
    error('Failed to start bot', err);
    process.exit(1);
  });

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 