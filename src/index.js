import cron from 'node-cron';

import { startApiServer } from './api.js';
import { assertTelegramConfig, config } from './config.js';
import { assertValidTelegramConfig } from './validate-telegram.js';
import { getDb } from './db.js';
import { runNewsCheck } from './job.js';
import { sendStartupNotification } from './telegram.js';

const runOnce = process.argv.includes('--once');

async function start() {
  getDb();

  try {
    assertTelegramConfig();
    assertValidTelegramConfig();
  } catch (error) {
    if (!config.dryRun && !runOnce) {
      console.warn(`Warning: ${error.message}`);
      console.warn('Set DRY_RUN=true to test without Telegram, or add bot credentials to .env');
    }
  }

  console.log('News notification server');
  console.log(`  API:      ${config.newsApiUrl}?mode=${config.newsFeedMode}`);
  console.log(`  Server:   http://localhost:${config.port}`);
  console.log(`  Cron:     ${config.cronSchedule}`);
  console.log(`  Database: ${config.dbPath}`);
  console.log(`  Dry run:  ${config.dryRun}`);

  if (!runOnce) {
    startApiServer();
  }

  if (!runOnce) {
    try {
      await sendStartupNotification();
      console.log('Startup notification sent to Telegram.');
    } catch (error) {
      console.error('Failed to send startup notification:', error.message);
    }
  }

  await runNewsCheck();

  if (runOnce) {
    process.exit(0);
  }

  if (!cron.validate(config.cronSchedule)) {
    console.error(`Invalid CRON_SCHEDULE: ${config.cronSchedule}`);
    process.exit(1);
  }

  cron.schedule(config.cronSchedule, () => {
    runNewsCheck().catch((error) => {
      console.error('Cron job failed:', error);
    });
  });

  console.log('Cron scheduler running. Press Ctrl+C to stop.');
}

start().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
