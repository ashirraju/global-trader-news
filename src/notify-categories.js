export const NOTIFY_CATEGORIES = ['Global', 'Commentary'];

export function shouldNotify(categories) {
  if (!Array.isArray(categories) || categories.length === 0) {
    return false;
  }

  return categories.some((category) => NOTIFY_CATEGORIES.includes(category));
}
