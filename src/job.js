import {
  articleExists,
  getArticleCount,
  getTrackedSymbols,
  isInitialized,
  markInitialized,
  pruneOldArticles,
  saveArticle,
} from './db.js';
import { fetchLatestNews } from './news.js';
import { shouldNotify } from './notify-categories.js';
import { sendNewsNotification } from './telegram.js';

const MAX_ARTICLE_COUNT = 500;

export async function runNewsCheck() {
  const started = Date.now();
  console.log(`[${new Date().toISOString()}] Checking for new articles…`);

  const articles = await fetchLatestNews();
  const trackedSymbols = new Set(getTrackedSymbols().map((symbol) => symbol.toUpperCase()));
  const firstRun = !isInitialized();
  let newCount = 0;
  let notifiedCount = 0;

  for (const article of articles) {
    if (articleExists(article.id)) {
      continue;
    }

    saveArticle(article);
    newCount += 1;

    if (firstRun) {
      console.log(`[seed] ${article.title}`);
      continue;
    }

    if (!shouldNotify(article.categories, article.symbol, trackedSymbols)) {
      console.log(`[skip] ${article.title} (${article.categories.join(', ') || 'no category'})`);
      continue;
    }

    try {
      await sendNewsNotification(article);
      notifiedCount += 1;
      console.log(`[notify] ${article.title}`);
    } catch (error) {
      console.error(`[error] Failed to notify for "${article.title}":`, error.message);
    }
  }

  if (firstRun) {
    markInitialized();
    console.log(
      `First run complete — saved ${getArticleCount()} articles as baseline (no Telegram alerts).`,
    );
  }

  const prunedCount = pruneOldArticles(MAX_ARTICLE_COUNT);

  if (prunedCount > 0) {
    console.log(`Pruned ${prunedCount} older articles to keep the latest ${MAX_ARTICLE_COUNT}.`);
  }

  const elapsed = Date.now() - started;
  console.log(
    `Done in ${elapsed}ms — fetched ${articles.length}, new ${newCount}, notified ${notifiedCount}, pruned ${prunedCount}`,
  );

  return { fetched: articles.length, new: newCount, notified: notifiedCount, pruned: prunedCount };
}
