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

// Initialize bot with polling settings
const bot = new Telegraf(BOT_TOKEN, {
  polling: {
    timeout: 30,  // Long polling timeout in seconds
    limit: 100,    // Limit of updates to fetch
    allowedUpdates: ['message', 'callback_query', 'inline_query'], // Filter updates
    retryAfter: 5000 // Retry after 5 seconds on error
  }
});

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
      await notifyUsers(bot.telegram, matches);
    }
  } catch (err) {
    error('Error in scheduled matching', err);
  }
});

// Add ping to keep connection alive
setInterval(() => {
  try {
    bot.telegram.getMe().catch(e => {
      error('Failed to ping Telegram API', e);
      // If we couldn't connect, try to restart polling
      bot.stop().then(() => bot.launch());
    });
  } catch (err) {
    error('Error in keep-alive ping', err);
  }
}, 5 * 60 * 1000); // Every 5 minutes

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