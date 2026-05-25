import { config } from './config.js';

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeText(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim();
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trimEnd()}...`;
}

function normalizeForComparison(text) {
  return normalizeText(text).replace(/[^A-Z0-9]+/gi, '').toUpperCase();
}

function formatPublishedAt(rawValue) {
  const value = normalizeText(rawValue);

  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(date);
}

function buildMessage(article) {
  const category = escapeHtml(normalizeText(article.category || 'News'));
  const titleText = truncateText(normalizeText(article.title), 300);
  const descriptionText = truncateText(normalizeText(article.description), 700);
  const publishedAt = formatPublishedAt(article.publishedAt);
  const symbol = normalizeText(article.symbol);
  const companyName = normalizeText(article.companyName);
  const parts = [
    `📈 <b>${category} Alert</b>`,
  ];

  if (symbol) {
    parts.push(
      companyName
        ? `<b>Symbol:</b> ${escapeHtml(symbol)} (${escapeHtml(companyName)})`
        : `<b>Symbol:</b> ${escapeHtml(symbol)}`,
    );
  }

  parts.push(`<b>Headline:</b> ${escapeHtml(titleText)}`);

  if (
    descriptionText
    && normalizeForComparison(descriptionText) !== normalizeForComparison(titleText)
  ) {
    parts.push(`<b>Summary:</b> ${escapeHtml(descriptionText)}`);
  }

  if (publishedAt) {
    parts.push(`<b>Published:</b> ${escapeHtml(publishedAt)}`);
  }

  let message = parts.join('\n\n');

  if (article.url) {
    message += `\n\n<a href="${escapeHtml(article.url)}">Open article</a>`;
  }

  return message;
}

async function sendTelegramMessage(text, { disableWebPagePreview = true } = {}) {
  if (config.dryRun) {
    console.log('[dry-run] Would send Telegram:', text);
    return;
  }

  if (!config.telegramBotToken || !config.telegramChatId) {
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
