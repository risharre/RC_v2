import { Markup } from 'telegraf';
import { createUser, getUserByTelegramId } from '../db/users.js';
import { log, error } from '../utils/logger.js';

// Enum for registration steps
const RegistrationStep = {
  FULL_NAME: 'full_name',
  POSITION: 'position',
  COMPANY: 'company',
  COMPLETED: 'completed',
};

// Scene session data
const registrationData = new Map();

export const handleRegister = async (ctx) => {
  try {
    const userId = ctx.from.id;
    
    // Check if user is already registered
    const existingUser = await getUserByTelegramId(userId);
    if (existingUser) {
      return ctx.reply(
        'Вы уже зарегистрированы.',
        Markup.keyboard([['Найти нового собеседника']]).resize()
      );
    }
    
    // Start registration process
    registrationData.set(userId, { step: RegistrationStep.FULL_NAME });
    
    return ctx.reply('Пожалуйста, введите ваше имя и фамилию:');
  } catch (err) {
    error('Error in registration start', err);
    return ctx.reply('Извините, что-то пошло не так. Пожалуйста, попробуйте позже.');
  }
};

export const handleRegistrationInput = async (ctx) => {
  const userId = ctx.from.id;
  const userRegData = registrationData.get(userId);
  
  if (!userRegData) return false; // Not in registration process
  
  const text = ctx.message.text;
  
  try {
    switch (userRegData.step) {
      case RegistrationStep.FULL_NAME:
        userRegData.full_name = text;
        userRegData.step = RegistrationStep.POSITION;
        ctx.reply('Пожалуйста, введите вашу должность:');
        break;
        
      case RegistrationStep.POSITION:
        userRegData.position = text;
        userRegData.step = RegistrationStep.COMPANY;
        ctx.reply('Пожалуйста, введите название вашей компании:');
        break;
        
      case RegistrationStep.COMPANY:
        userRegData.company = text;
        userRegData.step = RegistrationStep.COMPLETED;
        
        // Save user to database
        const userData = {
          telegram_id: userId,
          username: ctx.from.username || null,
          full_name: userRegData.full_name,
          position: userRegData.position,
          company: userRegData.company,
          is_free: true,
          is_banned: false
        };
        
        await createUser(userData);
        
        // Clean up registration data
        registrationData.delete(userId);
        
        ctx.reply(
          `✅ Вы зарегистрированы.\n\n` +
          `👤 Имя: ${userData.full_name}\n` +
          `💼 Должность: ${userData.position}\n` +
          `🏢 Компания: ${userData.company}\n\n` +
          `Ждите своего собеседника ☕️`,
          Markup.keyboard([['Найти нового собеседника']]).resize()
        );
        
        log(`New user registered: ${userData.full_name} (${userData.username || userId})`);
        break;
        
      default:
        return false;
    }
    
    return true;
  } catch (err) {
    error('Error in registration process', err);
    ctx.reply('Извините, что-то пошло не так. Пожалуйста, попробуйте позже.');
    registrationData.delete(userId);
    return true;
  }
};

export const setupRegisterCommand = (bot) => {
  bot.hears('Зарегистрироваться', handleRegister);
  
  // Add middleware to handle ongoing registration
  bot.use(async (ctx, next) => {
    if (ctx.message && ctx.message.text) {
      const handled = await handleRegistrationInput(ctx);
      if (handled) return;
    }
    return next();
  });
}; 