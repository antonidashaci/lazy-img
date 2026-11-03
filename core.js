/**
 * DOM-free core of <lazy-img>: the decisions, without a browser.
 *
 * Kept separate so the logic is unit-testable in Node and so a bundler can
 * tree-shake it if you only want `buildSrcset`.
 */

/** Widths worth generating. Beyond ~2400 nobody notices on a phone. */
export const DEFAULT_WIDTHS = [320, 480, 640, 960, 1280, 1920, 2400];

/**
 * Build a `srcset` from a URL template.
 *
 * @param {string} template URL containing `{w}`, e.g. `/img/hero-{w}.webp`
 * @param {number[]} [widths]
 * @param {number} [maxWidth] drop candidates wider than the image itself
 * @returns {string} '' when the template has no `{w}` placeholder
 *
 * @example
 * buildSrcset('/i/a-{w}.webp', [320, 640]); // '/i/a-320.webp 320w, /i/a-640.webp 640w'
 */
export function buildSrcset(template, widths = DEFAULT_WIDTHS, maxWidth = Infinity) {
  if (typeof template !== 'string' || !template.includes('{w}')) return '';
  const usable = widths
    .filter((w) => Number.isFinite(w) && w > 0 && w <= maxWidth)
    .sort((a, b) => a - b);
  // Keep one candidate at the image's own width, or there is nothing to serve
  // a desktop at 1:1.
  if (!usable.length && Number.isFinite(maxWidth)) usable.push(maxWidth);
  return usable.map((w) => `${template.replace('{w}', String(w))} ${w}w`).join(', ');
}

/**
 * Aspect-ratio box so the element occupies its final height before loading.
 * Returns null when the dimensions are unknown - guessing a ratio causes the
 * very layout shift this exists to prevent.
 *
 * @param {number|string|null} width
 * @param {number|string|null} height
 * @returns {string|null} a CSS `aspect-ratio` value
 */
export function aspectRatio(width, height) {
  const w = Number(width);
  const h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  return `${w} / ${h}`;
}

/**
 * Backoff for a retried image request, in ms.
 * @param {number} attempt 0-based
 * @returns {number}
 */
export function retryDelay(attempt) {
  return Math.min(4000, 400 * 2 ** attempt);
}

