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

function shouldShowSummary(title, description) {
  const normalizedTitle = normalizeForComparison(title);
  const normalizedDescription = normalizeForComparison(description);

  if (!normalizedDescription) {
    return false;
  }

  if (!normalizedTitle) {
    return true;
  }

  return normalizedDescription !== normalizedTitle;
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

  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: config.timeZone,
      timeZoneName: 'short',
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }
}

function buildMessage(article) {
  const category = escapeHtml(normalizeText(article.category || 'News'));
  const rawTitleText = normalizeText(article.title);
  const rawDescriptionText = normalizeText(article.description);
  const titleText = truncateText(rawTitleText, 300);
  const descriptionText = truncateText(rawDescriptionText, 700);
  const publishedAt = formatPublishedAt(article.publishedAt);
  const symbol = normalizeText(article.symbol);
  const companyName = normalizeText(article.companyName);
  const parts = [
    '<b>Global Trader News</b>',
    category,
  ];

  if (symbol) {
    parts.push(
      companyName
        ? `<b>${escapeHtml(symbol)}</b> - ${escapeHtml(companyName)}`
        : `<b>${escapeHtml(symbol)}</b>`,
    );
  }

  parts.push(escapeHtml(titleText));

  if (shouldShowSummary(rawTitleText, rawDescriptionText)) {
    parts.push(escapeHtml(descriptionText));
  }

  if (publishedAt) {
    parts.push(`Published: ${escapeHtml(publishedAt)}`);
  }

  parts.push('------');

  let message = parts.join('\n\n');

  if (article.url) {
    message += `\n\nRead more: <a href="${escapeHtml(article.url)}">${escapeHtml(article.url)}</a>`;
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
  const startedAt = formatPublishedAt(new Date().toISOString());
  const message = [
    '🚀 <b>News notification server started</b>',
    `<i>${escapeHtml(startedAt)}</i>`,
    '',
    `<b>Mode:</b> ${escapeHtml(config.newsFeedMode)}`,
    `<b>Cron:</b> ${escapeHtml(config.cronSchedule)}`,
    `<b>Timezone:</b> ${escapeHtml(config.timeZone)}`,
  ].join('\n');

  await sendTelegramMessage(message);
}
