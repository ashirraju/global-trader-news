export const NOTIFY_CATEGORIES = ['Global', 'Commentary', 'Special Coverage', 'Fixed_income', 'Commodities'];

export function shouldNotify(categories, symbol = '', trackedSymbols = new Set()) {
  if (
    typeof symbol === 'string'
    && symbol.trim()
    && trackedSymbols.has(symbol.trim().toUpperCase())
  ) {
    return true;
  }

  if (!Array.isArray(categories) || categories.length === 0) {
    return false;
  }

  return categories.some((category) => NOTIFY_CATEGORIES.includes(category));
}
