import { getUserByTelegramId, updateUser } from '../db/users.js';
import { error, log } from '../utils/logger.js';

// Enum for edit steps
const EditStep = {
  FULL_NAME: 'full_name',
  POSITION: 'position',
  COMPANY: 'company',
  COMPLETED: 'completed',
};

// Store edit sessions
const editSessions = new Map();

export const handleEdit = async (ctx) => {
  try {
    const userId = ctx.from.id;
    
    // Check if user exists
    const user = await getUserByTelegramId(userId);
    
    if (!user) {
      return ctx.reply('Сначала вам нужно зарегистрироваться. Используйте /start для регистрации.');
    }
    
    // Start edit process
    editSessions.set(userId, { 
      step: EditStep.FULL_NAME,
      userData: { ...user }
    });
    
    return ctx.reply(
      `Давайте обновим ваш профиль. Текущее имя: ${user.full_name}\n\nВведите новое имя (или отправьте текущее, чтобы оставить без изменений):`
    );
  } catch (err) {
    error('Error starting edit process', err);
    return ctx.reply('Извините, что-то пошло не так. Пожалуйста, попробуйте позже.');
  }
};

export const handleEditInput = async (ctx) => {
  const userId = ctx.from.id;
  const session = editSessions.get(userId);
  
  if (!session) return false; // Not in edit process
  
  const text = ctx.message.text;
  
  try {
    switch (session.step) {
      case EditStep.FULL_NAME:
        session.userData.full_name = text;
        session.step = EditStep.POSITION;
        ctx.reply(
          `Текущая должность: ${session.userData.position}\n\nВведите новую должность (или отправьте текущую, чтобы оставить без изменений):`
        );
        break;
        
      case EditStep.POSITION:
        session.userData.position = text;
        session.step = EditStep.COMPANY;
        ctx.reply(
          `Текущая компания: ${session.userData.company}\n\nВведите новое название компании (или отправьте текущее, чтобы оставить без изменений):`
        );
        break;
        
      case EditStep.COMPANY:
        session.userData.company = text;
        session.step = EditStep.COMPLETED;
        
        // Update user in database
        await updateUser(userId, {
          full_name: session.userData.full_name,
          position: session.userData.position,
          company: session.userData.company
        });
        
        // Clean up edit session
        editSessions.delete(userId);
        
        ctx.reply('✅ Ваш профиль успешно обновлен.');
        
        log(`User updated profile: ${session.userData.full_name} (${ctx.from.username || userId})`);
        break;
        
      default:
        return false;
    }
    
    return true;
  } catch (err) {
    error('Error in edit process', err);
    ctx.reply('Извините, что-то пошло не так. Пожалуйста, попробуйте позже.');
    editSessions.delete(userId);
    return true;
  }
};

export const setupEditCommand = (bot) => {
  bot.command('edit', handleEdit);
  
  // Edit process is handled by the middleware in register.js
}; 