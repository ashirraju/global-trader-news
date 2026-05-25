import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, '../.env') });

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  newsApiUrl: process.env.NEWS_API_URL ?? 'https://neo.kotaksecurities.com/api/1news/feeds',
  newsFeedMode: process.env.NEWS_FEED_MODE ?? 'all',
  cronSchedule: process.env.CRON_SCHEDULE ?? '*/2 * * * *',
  port: Number(process.env.PORT ?? 3000),
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  telegramChatId: process.env.TELEGRAM_CHAT_ID ?? '',
  dbPath: path.resolve(__dirname, '..', process.env.DB_PATH ?? './data/news.db'),
  dryRun: process.env.DRY_RUN === 'true',
};

export function assertTelegramConfig() {
  if (config.dryRun) {
    return;
  }
  required('TELEGRAM_BOT_TOKEN');
  required('TELEGRAM_CHAT_ID');
}
