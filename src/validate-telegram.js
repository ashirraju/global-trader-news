import { config } from './config.js';

export function validateTelegramChatId(chatId) {
  if (!chatId?.trim()) {
    return { ok: false, message: 'TELEGRAM_CHAT_ID is empty.' };
  }

  const value = chatId.trim();

  if (value.includes('t.me/')) {
    return {
      ok: false,
      message:
        'TELEGRAM_CHAT_ID must be a numeric id (e.g. 123456789) or @ChannelName — not a t.me link. Run: npm run telegram:chat-id',
    };
  }

  if (value.endsWith('_bot')) {
    return {
      ok: false,
      message:
        'TELEGRAM_CHAT_ID looks like a bot username. Use YOUR user id, or a channel/group id where the bot is a member. Run: npm run telegram:chat-id',
    };
  }

  return { ok: true, chatId: value };
}

export function assertValidTelegramConfig() {
  if (config.dryRun) {
    return;
  }

  if (!config.telegramBotToken?.trim()) {
    throw new Error('TELEGRAM_BOT_TOKEN is empty.');
  }

  const check = validateTelegramChatId(config.telegramChatId);
  if (!check.ok) {
    throw new Error(check.message);
  }
}
