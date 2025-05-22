# Random Coffee Telegram Bot

A Telegram bot for connecting users for random coffee chats.

## Features

- User registration with name, position, and company
- Random matching of users every 3 hours
- Admin commands for manual matching and user management
- Avoid matching users who were paired recently

## Setup

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file with the following variables:
   ```
   BOT_TOKEN=your_telegram_bot_token
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   ADMIN_USERNAME=risharre
   ```
4. Set up Supabase database with the following tables:

   **users**
   ```sql
   CREATE TABLE users (
     id SERIAL PRIMARY KEY,
     telegram_id BIGINT UNIQUE NOT NULL,
     username TEXT,
     full_name TEXT NOT NULL,
     position TEXT NOT NULL,
     company TEXT NOT NULL,
     is_free BOOLEAN DEFAULT TRUE,
     is_banned BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

   **matches**
   ```sql
   CREATE TABLE matches (
     id SERIAL PRIMARY KEY,
     user1_id INTEGER REFERENCES users(id) NOT NULL,
     user2_id INTEGER REFERENCES users(id) NOT NULL,
     user1_telegram_id BIGINT NOT NULL,
     user2_telegram_id BIGINT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   ```

5. Run the bot:
   ```
   npm start
   ```

## User Flow

1. User starts the bot with `/start`
2. New users are prompted to register
3. Registered users are automatically matched every 3 hours
4. Users can edit their profile with `/edit`
5. After receiving a match, users can find a new partner after 15 minutes

## Admin Commands

- `/match` - Manually trigger the matching process
- `/alluser` - List all registered users
- `/bad <id>` - Ban a user by ID
- `/unban <id>` - Unban a user by ID
- `/log` - View application logs
- `/help` - Show admin commands

## Development

Run the bot in development mode with hot reloading:
```
npm run dev
``` 