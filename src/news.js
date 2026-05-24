import { config } from './config.js';

/**
 * @returns {Promise<Array<{
 *   id: string;
 *   title: string;
 *   description: string;
 *   url: string;
 *   publishedAt: string;
 *   category: string;
 *   categories: string[];
 *   symbol?: string;
 *   companyName?: string;
 * }>>}
 */
export async function fetchLatestNews() {
  const url = new URL(config.newsApiUrl);
  url.searchParams.set('mode', config.newsFeedMode);

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`News API error: ${response.status} ${response.statusText}`);
  }

  const body = await response.json();
  const items = Array.isArray(body.data) ? body.data : [];

  return items
    .filter((item) => item.title?.trim())
    .map((item) => ({
      id: item._id,
      title: item.title.trim(),
      description: item.description?.trim() ?? '',
      url: item.url?.trim() ?? '',
      publishedAt: item.date ?? new Date().toISOString(),
      category: item.categories?.[0] || 'News',
      categories: item.categories ?? [],
      symbol: item.symbol,
      companyName: item.companyName,
    }));
}
