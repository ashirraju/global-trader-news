# News notification server

Polls the Kotak news API on a schedule, stores article IDs in SQLite, and sends **Telegram** alerts for new articles.

```
News API → Cron job → Check new articles → SQLite → Telegram
```

## Setup

### 1. Install dependencies

```bash
cd server
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set:

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | From [@BotFather](https://t.me/BotFather) |
| `TELEGRAM_CHAT_ID` | Your chat id (e.g. from [@userinfobot](https://t.me/userinfobot)) |
| `NEWS_FEED_MODE` | Feeds mode, default `all` |
| `CRON_SCHEDULE` | Cron expression, default every 2 minutes |

### 3. Telegram bot

1. Open Telegram → [@BotFather](https://t.me/BotFather) → `/newbot` → copy the token into `TELEGRAM_BOT_TOKEN`.
2. Start a chat with your new bot (send any message).
3. Get your chat id from [@userinfobot](https://t.me/userinfobot) → set `TELEGRAM_CHAT_ID`.
4. For a **group**, add the bot to the group and use the group chat id.

## Run

```bash
# Test once (seeds DB on first run, no alerts on first run)
DRY_RUN=true npm run run-once

# Run once with Telegram
npm run run-once

# Start cron scheduler (runs forever)
npm start

# Dev with auto-restart on file changes
npm run dev
```

## Notification filter

Telegram alerts (and browser push in the Angular app) are sent **only** when an article’s `categories` include **`Global`** or **`Commentary`**. Other categories (e.g. `Result`, `Default`) are still saved to the database but skipped for notifications.

## First run behavior

On the **first** run, all current articles are saved to the database **without** Telegram notifications (baseline). Every later run only alerts for **new** article IDs that pass the category filter.

To reset: delete `data/news.db` and restart.

## Deploy (VPS / Railway / Render)

Run `npm start` as a long-lived process (PM2, systemd, or platform worker).

Example with PM2:

```bash
pm2 start src/index.js --name news-notifier
pm2 save
```
