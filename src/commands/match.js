import { Markup } from 'telegraf';
import { getUserByTelegramId, setUserFree, getAllUsers, getFreeUsers } from '../db/users.js';
import { matchUsers } from '../utils/matching.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';
import { log, error } from '../utils/logger.js';

// Store timeout IDs for each user
const userTimeouts = new Map();

export const notifyUsers = async (telegram, matches) => {
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
        await telegram.sendMessage(
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
          telegram.sendMessage(
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
        await telegram.sendMessage(
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
          telegram.sendMessage(
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
    
    // Диагностика - проверим, сколько пользователей всего и сколько свободных
    const allUsers = await getAllUsers();
    const freeUsers = await getFreeUsers();
    
    log(`Diagnostic: Total users: ${allUsers.length}, Free users: ${freeUsers.length}`);
    
    // Логируем состояние каждого пользователя
    allUsers.forEach(user => {
      log(`User ${user.full_name} (${user.username || 'no username'}): is_free=${user.is_free}, is_banned=${user.is_banned}`);
    });
    
    // Если нет свободных пользователей, сделаем всех свободными для тестирования
    if (freeUsers.length < 2) {
      ctx.reply('Недостаточно свободных пользователей. Сбрасываю статусы для тестирования...');
      
      // Сделаем всех пользователей свободными
      for (const user of allUsers) {
        await setUserFree(user.telegram_id, true);
        log(`Reset user ${user.full_name} to free status`);
      }
      
      // Получим обновленный список
      const updatedFreeUsers = await getFreeUsers();
      log(`After reset: Free users: ${updatedFreeUsers.length}`);
      
      // Попробуем снова
      const matches = await matchUsers();
      
      if (matches.length === 0) {
        return ctx.reply('По-прежнему не могу составить пары. Проверьте логи для диагностики.');
      }
      
      await notifyUsers(ctx.telegram, matches);
      
      return ctx.reply(`Успешно составлено ${matches.length * 2} пользователей (${matches.length} пар) после сброса статусов.`);
    }
    
    const matches = await matchUsers();
    
    if (matches.length === 0) {
      return ctx.reply(`Нет свободных пользователей для составления пар. Всего пользователей: ${allUsers.length}, Свободных: ${freeUsers.length}`);
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