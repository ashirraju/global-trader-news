import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from '../config.js';
import { fetchLatestNews } from '../news.js';
import { shouldNotify } from '../notify-categories.js';
import { sendNewsNotification } from '../telegram.js';
import { assertValidTelegramConfig, validateTelegramChatId } from '../validate-telegram.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  const check = validateTelegramChatId(config.telegramChatId);
  if (!check.ok) {
    console.error('Config error:', check.message);
    process.exit(1);
  }

  assertValidTelegramConfig();

  const articles = await fetchLatestNews();
  const sample =
    articles.find((a) => shouldNotify(a.categories)) ??
    ({
      id: 'test',
      title: 'Test: News notification pipeline',
      description: 'If you see this, Telegram is configured correctly.',
      url: '',
      publishedAt: new Date().toString(),
      category: 'Global',
      categories: ['Global'],
    });

  console.log('Sending test notification to chat id:', check.chatId);
  await sendNewsNotification(sample);
  console.log('Sent successfully.');
}

main().catch((error) => {
  console.error('Failed:', error.message);
  process.exit(1);
});
