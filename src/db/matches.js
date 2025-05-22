import supabase from './supabase.js';

const TABLE_NAME = 'matches';

export const createMatches = async (matchesData) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert(matchesData)
    .select();
  
  if (error) throw error;
  return data;
};

export const getRecentMatches = async (days = 30) => {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);
  
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .gte('created_at', dateThreshold.toISOString());
  
  if (error) throw error;
  return data;
};

export const getUserMatches = async (userId) => {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
};

export const getUserRecentMatches = async (userId, days = 30) => {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);
  
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .gte('created_at', dateThreshold.toISOString())
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}; 