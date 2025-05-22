import { Markup } from 'telegraf';
import { getUserByTelegramId } from '../db/users.js';
import { log } from '../utils/logger.js';

export const handleStart = async (ctx) => {
  try {
    // Get user data if already registered
    const userId = ctx.from.id;
    const existingUser = await getUserByTelegramId(userId);
    
    if (existingUser) {
      // User already registered
      return ctx.reply(
        `С возвращением, ${existingUser.full_name}! Вы уже зарегистрированы.`,
        Markup.keyboard([['Найти нового собеседника']]).resize()
      );
    }
    
    // New user
    log(`New user started the bot: ${ctx.from.username || ctx.from.id}`);
    
    return ctx.reply(
      'Добро пожаловать в бот Random Coffee!\n\n Соединяем участников ProductCamp для нетворка и хорошего времяпровождения:)',
      Markup.keyboard([
        ['Зарегистрироваться'],
        ['Команды']
      ]).resize()
    );
  } catch (error) {
    log(`Error in start command: ${error.message}`, 'ERROR');
    return ctx.reply('Извините, что-то пошло не так. Пожалуйста, попробуйте позже.');
  }
};

export const handleCommands = (ctx) => {
  return ctx.reply(
    'Доступные команды:\n\n' +
    '/start - Запустить бота\n' +
    '/edit - Редактировать профиль\n' +
    '/help - Показать это сообщение'
  );
};

export const setupStartCommand = (bot) => {
  bot.command('start', handleStart);
  bot.command('help', handleCommands);
  bot.hears('Команды', handleCommands);
}; 