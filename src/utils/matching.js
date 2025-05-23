import { getFreeUsers, setUserFree } from '../db/users.js';
import { createMatches, getUserRecentMatches } from '../db/matches.js';
import { log, error } from '../utils/logger.js';

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
  
  log(`Checking recent matches between users ${user1Id} and ${user2Id}`);
  
  // If there are no recent matches, return false immediately
  if (!recentMatches1 || recentMatches1.length === 0) {
    log('No recent matches found, users can be matched');
    return false;
  }
  
  // Check if these two users have been matched before
  const matched = recentMatches1.some(match => 
    (match.user1_id === user2Id) || (match.user2_id === user2Id)
  );
  
  if (matched) {
    log(`Users ${user1Id} and ${user2Id} have been matched recently`);
  } else {
    log(`Users ${user1Id} and ${user2Id} have not been matched recently`);
  }
  
  return matched;
};

export const matchUsers = async () => {
  try {
    // Get all free users
    let freeUsers = await getFreeUsers();
    
    log(`matchUsers: Found ${freeUsers.length} free users`);
    
    if (freeUsers.length < 2) {
      log('Not enough free users to create matches');
      return [];
    }
    
    // Shuffle users to ensure randomness
    freeUsers = shuffleArray(freeUsers);
    
    const matches = [];
    const matchedUsers = new Set();
    
    // Create pairs
    for (let i = 0; i < freeUsers.length; i++) {
      // Skip if user already matched in this round
      if (matchedUsers.has(freeUsers[i].id)) {
        log(`User ${freeUsers[i].full_name} already matched in this round`);
        continue;
      }
      
      log(`Finding match for user ${freeUsers[i].full_name}`);
      
      // Find a match for user[i]
      for (let j = i + 1; j < freeUsers.length; j++) {
        // Skip if user already matched in this round
        if (matchedUsers.has(freeUsers[j].id)) {
          log(`User ${freeUsers[j].full_name} already matched in this round`);
          continue;
        }
        
        log(`Checking compatibility between ${freeUsers[i].full_name} and ${freeUsers[j].full_name}`);
        
        // In testing mode, skip the recent match check
        let recentlyMatched = false;
        try {
          // Check if these users have been matched recently
          recentlyMatched = await hasRecentMatch(freeUsers[i].id, freeUsers[j].id);
        } catch (err) {
          error(`Error checking recent matches: ${err.message}`);
          log('Ignoring recent match check due to error');
          recentlyMatched = false;
        }
        
        if (!recentlyMatched) {
          log(`Creating match between ${freeUsers[i].full_name} and ${freeUsers[j].full_name}`);
          
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
        } else {
          log(`Users ${freeUsers[i].full_name} and ${freeUsers[j].full_name} were recently matched, skipping`);
        }
      }
    }
    
    // Save matches to database
    if (matches.length > 0) {
      await createMatches(matches);
      log(`Created ${matches.length} matches successfully`);
    } else {
      log('No matches were created');
    }
    
    return matches;
  } catch (err) {
    error(`Error matching users: ${err.message}`);
    throw err;
  }
}; 