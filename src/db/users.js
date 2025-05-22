import supabase from './supabase.js';

const TABLE_NAME = 'users';

export const createUser = async (userData) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert([userData])
    .select();
  
  if (error) throw error;
  return data[0];
};

export const getUserByTelegramId = async (telegramId) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('telegram_id', telegramId)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned" error
  return data;
};

export const updateUser = async (telegramId, userData) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update(userData)
    .eq('telegram_id', telegramId)
    .select();
  
  if (error) throw error;
  return data[0];
};

export const getAllUsers = async () => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*');
  
  if (error) throw error;
  return data;
};

export const getFreeUsers = async () => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('is_free', true)
    .eq('is_banned', false);
  
  if (error) throw error;
  return data;
};

export const setUserFree = async (telegramId, isFree = true) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({ is_free: isFree })
    .eq('telegram_id', telegramId)
    .select();
  
  if (error) throw error;
  return data[0];
};

export const banUser = async (userId) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({ is_banned: true })
    .eq('id', userId)
    .select();
  
  if (error) throw error;
  return data[0];
};

export const unbanUser = async (userId) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({ is_banned: false })
    .eq('id', userId)
    .select();
  
  if (error) throw error;
  return data[0];
}; 