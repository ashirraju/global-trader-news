import { config } from './config.js';

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildMessage(article) {
  const category = escapeHtml(article.category);
  const title = escapeHtml(article.title);
  const description = escapeHtml(article.description.slice(0, 500));
  const date = escapeHtml(article.publishedAt);
  const symbolLine = article.symbol
    ? `\n<b>${escapeHtml(article.symbol)}</b>${article.companyName ? ` — ${escapeHtml(article.companyName)}` : ''}\n`
    : '';

  let message = `📰 <b>New ${category} News</b>${symbolLine}\n<b>${title}</b>\n\n${description}\n\n<i>${date}</i>`;

  if (article.url) {
    message += `\n\n<a href="${escapeHtml(article.url)}">Read more</a>`;
  }

  return message;
}

async function sendTelegramMessage(text, { disableWebPagePreview = true } = {}) {
  if (config.dryRun) {
    console.log('[dry-run] Would send Telegram:', text);
    return;
  }

  if (!config.telegramBotToken || !config.telegramChatId) {
    console.log(config)
    throw new Error('Telegram is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.');
  }

  const apiUrl = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: config.telegramChatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: disableWebPagePreview,
    }),
  });

  const result = await response.json();

  if (!response.ok || !result.ok) {
    throw new Error(`Telegram API error: ${result.description ?? response.statusText}`);
  }
}

export async function sendNewsNotification(article) {
  await sendTelegramMessage(buildMessage(article), {
    disableWebPagePreview: !article.url,
  });
}

export async function sendStartupNotification() {
  const startedAt = new Date().toISOString();
  const message = [
    '🚀 <b>News notification server started</b>',
    `<i>${escapeHtml(startedAt)}</i>`,
    '',
    `<b>Mode:</b> ${escapeHtml(config.newsFeedMode)}`,
    `<b>Cron:</b> ${escapeHtml(config.cronSchedule)}`,
  ].join('\n');

  await sendTelegramMessage(message);
}
