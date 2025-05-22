import { getAllUsers, banUser, unbanUser } from '../db/users.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';
import { getLog } from '../utils/logger.js';
import { log, error } from '../utils/logger.js';

export const handleListUsers = async (ctx) => {
  try {
    const users = await getAllUsers();
    
    if (!users || users.length === 0) {
      return ctx.reply('Пока нет зарегистрированных пользователей.');
    }
    
    const userCount = users.length;
    let message = `Всего пользователей: ${userCount}\n\n`;
    
    // List first 10 users with ID, name, and status
    const displayCount = Math.min(userCount, 10);
    for (let i = 0; i < displayCount; i++) {
      const user = users[i];
      const status = user.is_banned ? '🔴' : (user.is_free ? '🟢' : '🟡');
      
      message += `${status} ID: ${user.id} | ${user.full_name} (@${user.username || 'нет_юзернейма'}) | ${user.position} в ${user.company}\n`;
    }
    
    if (userCount > 10) {
      message += `\n... и ещё ${userCount - 10} пользователей.`;
    }
    
    return ctx.reply(message);
  } catch (err) {
    error('Error listing users', err);
    return ctx.reply(`Ошибка при получении списка пользователей: ${err.message}`);
  }
};

export const handleBanUser = async (ctx) => {
  const userId = ctx.message.text.split(' ')[1];
  
  if (!userId || isNaN(parseInt(userId))) {
    return ctx.reply('Пожалуйста, укажите корректный ID пользователя. Использование: /bad <id>');
  }
  
  try {
    await banUser(parseInt(userId));
    log(`Admin banned user ID: ${userId}`);
    return ctx.reply(`Пользователь с ID ${userId} заблокирован.`);
  } catch (err) {
    error(`Error banning user ${userId}`, err);
    return ctx.reply(`Ошибка при блокировке пользователя: ${err.message}`);
  }
};

export const handleUnbanUser = async (ctx) => {
  const userId = ctx.message.text.split(' ')[1];
  
  if (!userId || isNaN(parseInt(userId))) {
    return ctx.reply('Пожалуйста, укажите корректный ID пользователя. Использование: /unban <id>');
  }
  
  try {
    await unbanUser(parseInt(userId));
    log(`Admin unbanned user ID: ${userId}`);
    return ctx.reply(`Пользователь с ID ${userId} разблокирован.`);
  } catch (err) {
    error(`Error unbanning user ${userId}`, err);
    return ctx.reply(`Ошибка при разблокировке пользователя: ${err.message}`);
  }
};

export const handleGetLog = async (ctx) => {
  try {
    const logContent = getLog();
    
    // If log is too long, send only last 4000 characters
    const maxLength = 4000;
    const truncatedLog = logContent.length > maxLength 
      ? `...(обрезано)...\n${logContent.slice(-maxLength)}` 
      : logContent;
    
    return ctx.reply(truncatedLog || 'Лог пуст');
  } catch (err) {
    error('Error getting log', err);
    return ctx.reply(`Ошибка при получении лога: ${err.message}`);
  }
};

export const handleHelp = async (ctx) => {
  const helpText = 
    'Команды администратора:\n\n' +
    '/match - Запустить ручной подбор собеседников\n' +
    '/alluser - Список всех зарегистрированных пользователей\n' +
    '/bad <id> - Заблокировать пользователя по ID\n' +
    '/unban <id> - Разблокировать пользователя по ID\n' +
    '/log - Получить логи приложения\n' +
    '/help - Показать это сообщение';
  
  return ctx.reply(helpText);
};

export const setupAdminCommands = (bot) => {
  bot.command('alluser', adminMiddleware, handleListUsers);
  bot.command('bad', adminMiddleware, handleBanUser);
  bot.command('unban', adminMiddleware, handleUnbanUser);
  bot.command('log', adminMiddleware, handleGetLog);
  bot.command('help', adminMiddleware, handleHelp);
}; 