import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('Set TELEGRAM_BOT_TOKEN in server/.env first.');
  process.exit(1);
}

console.log('1. Open Telegram and send any message to your bot.');
console.log('2. For a channel: add the bot as an admin, then post in the channel.\n');

const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
const result = await response.json();

if (!result.ok) {
  console.error('Telegram API error:', result.description);
  process.exit(1);
}

if (!result.result?.length) {
  console.log('No messages yet. Send a message to your bot, then run this again.');
  process.exit(0);
}

const seen = new Set();

for (const update of result.result) {
  const chat = update.message?.chat ?? update.channel_post?.chat;
  if (!chat || seen.has(chat.id)) {
    continue;
  }
  seen.add(chat.id);

  const label = chat.title ?? chat.username ?? `${chat.first_name ?? ''} ${chat.last_name ?? ''}`.trim();
  console.log(`Chat: ${label}`);
  console.log(`  TELEGRAM_CHAT_ID=${chat.id}`);
  if (chat.username) {
    console.log(`  (or use @${chat.username} for channels)`);
  }
  console.log('');
}
