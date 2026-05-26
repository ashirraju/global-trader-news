import http from 'node:http';

import { config } from './config.js';
import { getTrackedSymbols, removeTrackedSymbols, saveTrackedSymbols } from './db.js';
import { fetchLatestNews } from './news.js';

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString('utf8').trim();

  if (!rawBody) {
    throw new Error('Request body is required.');
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error('Request body must be valid JSON.');
  }
}

export function normalizeSymbols(input) {
  const values = Array.isArray(input) ? input : [input];

  return [...new Set(
    values
      .filter((value) => typeof value === 'string')
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean),
  )];
}

async function handleSymbolNews(req, res) {
  let body;

  try {
    body = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
    return;
  }

  const requestedSymbols = normalizeSymbols(body.symbol);

  if (!requestedSymbols.length) {
    sendJson(res, 400, {
      error: 'Provide "symbol" as a string or a non-empty array of strings.',
    });
    return;
  }

  try {
    saveTrackedSymbols(requestedSymbols);
    const savedSymbols = getTrackedSymbols();
    const activeSymbols = new Set(savedSymbols.map((symbol) => symbol.trim().toUpperCase()));

    const articles = await fetchLatestNews();
    const filteredArticles = articles.filter((article) =>
      article.symbol && activeSymbols.has(article.symbol.trim().toUpperCase()),
    );

    sendJson(res, 200, {
      savedSymbols,
      requestedSymbols,
      symbols: savedSymbols,
      count: filteredArticles.length,
      data: filteredArticles,
    });
  } catch (error) {
    console.error('Failed to fetch symbol news:', error);
    sendJson(res, 502, { error: 'Failed to fetch news data.' });
  }
}

async function handleRemoveSymbols(req, res) {
  let body;

  try {
    body = await readJsonBody(req);
  } catch (error) {
    sendJson(res, 400, { error: error.message });
    return;
  }

  const symbolsToRemove = normalizeSymbols(body.symbol);

  if (!symbolsToRemove.length) {
    sendJson(res, 400, {
      error: 'Provide "symbol" as a string or a non-empty array of strings.',
    });
    return;
  }

  const removedCount = removeTrackedSymbols(symbolsToRemove);
  const savedSymbols = getTrackedSymbols();

  sendJson(res, 200, {
    removedSymbols: symbolsToRemove,
    removedCount,
    symbols: savedSymbols,
  });
}

export function startApiServer() {
  const server = http.createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
      sendJson(res, 200, { status: 'ok' });
      return;
    }

    if (req.method === 'GET' && (req.url === '/symbols' || req.url === '/api/symbols')) {
      sendJson(res, 200, { symbols: getTrackedSymbols() });
      return;
    }

    if (req.method === 'DELETE' && (req.url === '/symbols' || req.url === '/api/symbols')) {
      handleRemoveSymbols(req, res);
      return;
    }

    if (
      req.method === 'POST'
      && (req.url === '/news' || req.url === '/api/news')
    ) {
      handleSymbolNews(req, res);
      return;
    }

    sendJson(res, 404, { error: 'Route not found.' });
  });

  server.listen(config.port, () => {
    console.log(`API server listening on http://localhost:${config.port}`);
    console.log('POST /news or /api/news with {"symbol":["RELIANCE","TCS"]}');
    console.log('GET /symbols or /api/symbols to view saved watchlist');
    console.log('DELETE /symbols or /api/symbols with {"symbol":["RELIANCE"]} to remove symbols');
  });

  return server;
}
