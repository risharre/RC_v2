import { Markup } from 'telegraf';
import { getUserByTelegramId, setUserFree } from '../db/users.js';
import { matchUsers } from '../utils/matching.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';
import { log, error } from '../utils/logger.js';

// Store timeout IDs for each user
const userTimeouts = new Map();

export const notifyUsers = async (bot, matches) => {
  try {
    for (const match of matches) {
      // Get user details
      const user1 = await getUserByTelegramId(match.user1_telegram_id);
      const user2 = await getUserByTelegramId(match.user2_telegram_id);
      
      if (!user1 || !user2) {
        error(`Failed to find matched users: ${match.user1_telegram_id}, ${match.user2_telegram_id}`);
        continue;
      }
      
      // Send message to user 1
      try {
        await bot.telegram.sendMessage(
          user1.telegram_id,
          `🎉 Ваш собеседник:\n\n` +
          `👤 ${user2.full_name}\n` +
          `💼 ${user2.position}\n` +
          `🏢 ${user2.company}\n` +
          (user2.username ? `📱 @${user2.username}\n\n` : '\n') +
          `Напишите и договоритесь о встрече!`
        );
        
        // Set timeout for "find new partner" button
        clearTimeout(userTimeouts.get(user1.telegram_id));
        userTimeouts.set(user1.telegram_id, setTimeout(() => {
          bot.telegram.sendMessage(
            user1.telegram_id,
            'Хотите найти нового собеседника?',
            Markup.keyboard([['Найти нового собеседника']]).resize()
          );
        }, 15 * 60 * 1000)); // 15 minutes
      } catch (err) {
        error(`Failed to send match notification to user ${user1.telegram_id}`, err);
      }
      
      // Send message to user 2
      try {
        await bot.telegram.sendMessage(
          user2.telegram_id,
          `🎉 Ваш собеседник:\n\n` +
          `👤 ${user1.full_name}\n` +
          `💼 ${user1.position}\n` +
          `🏢 ${user1.company}\n` +
          (user1.username ? `📱 @${user1.username}\n\n` : '\n') +
          `Напишите и договоритесь о встрече!`
        );
        
        // Set timeout for "find new partner" button
        clearTimeout(userTimeouts.get(user2.telegram_id));
        userTimeouts.set(user2.telegram_id, setTimeout(() => {
          bot.telegram.sendMessage(
            user2.telegram_id,
            'Хотите найти нового собеседника?',
            Markup.keyboard([['Найти нового собеседника']]).resize()
          );
        }, 15 * 60 * 1000)); // 15 minutes
      } catch (err) {
        error(`Failed to send match notification to user ${user2.telegram_id}`, err);
      }
      
      log(`Matched users: ${user1.full_name} and ${user2.full_name}`);
    }
  } catch (err) {
    error('Error notifying users about matches', err);
  }
};

export const handleFindNewPartner = async (ctx) => {
  try {
    const userId = ctx.from.id;
    const user = await getUserByTelegramId(userId);
    
    if (!user) {
      return ctx.reply('Сначала вам нужно зарегистрироваться. Используйте /start для регистрации.');
    }
    
    // Set user as free
    await setUserFree(userId, true);
    
    return ctx.reply('Вы добавлены в список доступных пользователей. Вам подберут собеседника во время следующего раунда!');
  } catch (err) {
    error('Error finding new partner', err);
    return ctx.reply('Извините, что-то пошло не так. Пожалуйста, попробуйте позже.');
  }
};

export const handleAdminMatch = async (ctx) => {
  try {
    ctx.reply('Запускаю процесс ручного подбора пар...');
    
    const matches = await matchUsers();
    
    if (matches.length === 0) {
      return ctx.reply('Нет свободных пользователей для составления пар.');
    }
    
    await notifyUsers(ctx.telegram, matches);
    
    return ctx.reply(`Успешно составлено ${matches.length * 2} пользователей (${matches.length} пар).`);
  } catch (err) {
    error('Error in admin match command', err);
    return ctx.reply(`Ошибка запуска процесса подбора: ${err.message}`);
  }
};

export const setupMatchCommand = (bot) => {
  // Admin command to trigger matching manually
  bot.command('match', adminMiddleware, handleAdminMatch);
  
  // User button to find a new partner
  bot.hears('Найти нового собеседника', handleFindNewPartner);
}; 