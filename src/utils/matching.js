import { getFreeUsers, setUserFree } from '../db/users.js';
import { createMatches, getUserRecentMatches } from '../db/matches.js';

// Shuffle array using Fisher-Yates algorithm
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// Check if users have been matched recently (within last 30 days)
const hasRecentMatch = async (user1Id, user2Id) => {
  const recentMatches1 = await getUserRecentMatches(user1Id);
  
  return recentMatches1.some(match => 
    (match.user1_id === user2Id) || (match.user2_id === user2Id)
  );
};

export const matchUsers = async () => {
  try {
    // Get all free users
    let freeUsers = await getFreeUsers();
    
    // Shuffle users to ensure randomness
    freeUsers = shuffleArray(freeUsers);
    
    const matches = [];
    const matchedUsers = new Set();
    
    // Create pairs
    for (let i = 0; i < freeUsers.length; i++) {
      // Skip if user already matched in this round
      if (matchedUsers.has(freeUsers[i].id)) continue;
      
      // Find a match for user[i]
      for (let j = i + 1; j < freeUsers.length; j++) {
        // Skip if user already matched in this round
        if (matchedUsers.has(freeUsers[j].id)) continue;
        
        // Check if these users have been matched recently
        const recentlyMatched = await hasRecentMatch(freeUsers[i].id, freeUsers[j].id);
        
        if (!recentlyMatched) {
          matches.push({
            user1_id: freeUsers[i].id,
            user2_id: freeUsers[j].id,
            user1_telegram_id: freeUsers[i].telegram_id,
            user2_telegram_id: freeUsers[j].telegram_id
          });
          
          // Mark both users as matched
          matchedUsers.add(freeUsers[i].id);
          matchedUsers.add(freeUsers[j].id);
          
          // Set both users as not free anymore
          await setUserFree(freeUsers[i].telegram_id, false);
          await setUserFree(freeUsers[j].telegram_id, false);
          
          break; // Found match for user[i], move to next unmatched user
        }
      }
    }
    
    // Save matches to database
    if (matches.length > 0) {
      await createMatches(matches);
    }
    
    return matches;
  } catch (error) {
    console.error('Error matching users:', error);
    throw error;
  }
}; 