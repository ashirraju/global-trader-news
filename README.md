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
| `PORT` | Local API server port, default `3000` |
| `TIME_ZONE` | Timezone for Telegram timestamps, default `Asia/Kolkata` |

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

## POST API

When the server is running, you can call:

```bash
POST /news
POST /api/news
```

Request body accepts either a single symbol or multiple:

```json
{
  "symbol": "RELIANCE"
}
```

```json
{
  "symbol": ["RELIANCE", "TCS"]
}
```

Example:

```bash
curl -X POST http://localhost:3000/news \
  -H "Content-Type: application/json" \
  -d '{"symbol":["RELIANCE","TCS"]}'
```

Posted symbols are saved in SQLite and survive server restarts. Each request adds new symbols to the saved watchlist.
The `/news` response filters articles using the full saved watchlist after saving the new symbols from that request.

To view the saved watchlist:

```bash
curl http://localhost:3000/symbols
```

To remove one or more saved symbols:

```bash
curl -X DELETE http://localhost:3000/symbols \
  -H "Content-Type: application/json" \
  -d '{"symbol":["RELIANCE","TCS"]}'
```

## Notification filter

Telegram alerts (and browser push in the Angular app) are sent when either:

- an article’s `categories` include **`Global`** or **`Commentary`**
- the article includes a `symbol` that matches the saved watchlist from the POST API

Other categories without a symbol (e.g. `Result`, `Default`) are still saved to the database but skipped for notifications.

## First run behavior

On the **first** run, all current articles are saved to the database **without** Telegram notifications (baseline). Every later run only alerts for **new** article IDs that pass the category filter.

The server keeps only the newest `500` stored articles and automatically deletes older rows after each news check.

To reset: delete `data/news.db` and restart.

## Deploy (VPS / Railway / Render)

Run `npm start` as a long-lived process (PM2, systemd, or platform worker).

Example with PM2:

```bash
pm2 start src/index.js --name news-notifier
pm2 save
```

## Deploy on Northflank

Use a single `Deployment service` for this app. Do not create a separate Northflank cron job, because this server already runs its own scheduler.

Northflank settings:

- Build method: `Dockerfile`
- Start port: `3000`
- Health check path: `/health`
- Persistent volume mount path: `/data`

Recommended runtime variables:

```bash
NEWS_API_URL=https://neo.kotaksecurities.com/api/1news/feeds
NEWS_FEED_MODE=all
CRON_SCHEDULE=*/2 * * * *
PORT=3000
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-telegram-chat-id
DB_PATH=/data/news.db
DRY_RUN=false
```

Without a persistent volume mounted at `/data`, saved symbols and article history will be lost when the container is replaced.

Useful endpoints after deploy:

```bash
POST /news
GET /symbols
DELETE /symbols
GET /health
```
