/**
 * <lazy-img> - a lazy, responsive image element that reserves its own space.
 *
 * `loading="lazy"` is built into browsers and you should usually just use it.
 * What it does not give you is the rest of the checklist that stops a gallery
 * from jumping around and burning mobile data:
 *
 * - reserved space from width/height, so there is no layout shift
 * - a blurred placeholder that cross-fades out on decode
 * - a generated srcset, so phones do not download the 2400px file
 * - a retry, because one dropped request should not leave a permanent hole
 * - a visible, styleable error state instead of a broken-image glyph
 *
 * The decisions live in ./core.js, which has no DOM dependency and is where
 * the tests point.
 */

import { DEFAULT_WIDTHS, aspectRatio, buildSrcset, retryDelay } from './core.js';

export { DEFAULT_WIDTHS, aspectRatio, buildSrcset, retryDelay } from './core.js';

const STYLE = `
  :host {
    display: block;
    position: relative;
    overflow: hidden;
    background: var(--lazy-img-bg, #e8e8e4);
  }
  :host([hidden]) { display: none; }
  img, .ph {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: var(--lazy-img-fit, cover);
  }
  .ph {
    position: absolute;
    inset: 0;
    filter: blur(12px);
    transform: scale(1.08);
    transition: opacity var(--lazy-img-fade, 300ms) ease;
  }
  img { opacity: 0; transition: opacity var(--lazy-img-fade, 300ms) ease; }
  :host([data-state="loaded"]) img { opacity: 1; }
  :host([data-state="loaded"]) .ph { opacity: 0; }
  .err {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font: 500 13px/1.4 system-ui, sans-serif;
    color: var(--lazy-img-error-fg, #6b6a63);
    background: var(--lazy-img-error-bg, #f2f1ec);
    text-align: center;
    padding: 8px;
  }
  @media (prefers-reduced-motion: reduce) {
    img, .ph { transition: none; }
  }
`;

export class LazyImg extends HTMLElement {
  static observedAttributes = ['src', 'srcset-template', 'alt', 'width', 'height', 'placeholder'];

  #img = null;
  #placeholder = null;
  #observer = null;
  #attempt = 0;
  #timer = null;
  #started = false;

  constructor() {
    super();
    const root = this.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = STYLE;
    root.append(style);
  }

  connectedCallback() {
    this.#render();
    // rootMargin: start fetching before it scrolls in, so the fade is over by
    // the time the user gets there.
    this.#observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) this.#load();
      },
      { rootMargin: this.getAttribute('root-margin') || '200px' },
    );
    this.#observer.observe(this);
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    clearTimeout(this.#timer);
  }

  attributeChangedCallback() {
    if (this.shadowRoot) this.#render();
  }

  #render() {
    const ratio = aspectRatio(this.getAttribute('width'), this.getAttribute('height'));
    if (ratio) this.style.aspectRatio = ratio;

    const placeholderSrc = this.getAttribute('placeholder');
    if (placeholderSrc && !this.#placeholder) {
      this.#placeholder = document.createElement('img');
      this.#placeholder.className = 'ph';
      this.#placeholder.alt = '';
      this.#placeholder.setAttribute('aria-hidden', 'true');
      this.#placeholder.src = placeholderSrc;
      this.shadowRoot.append(this.#placeholder);
    }

    if (!this.#img) {
      this.#img = document.createElement('img');
      this.#img.decoding = 'async';
      this.#img.addEventListener('load', () => this.#onLoad());
      this.#img.addEventListener('error', () => this.#onError());
      this.shadowRoot.append(this.#img);
    }

    this.#img.alt = this.getAttribute('alt') ?? '';
    if (this.hasAttribute('width')) this.#img.width = Number(this.getAttribute('width'));
    if (this.hasAttribute('height')) this.#img.height = Number(this.getAttribute('height'));
    if (!this.dataset.state) this.dataset.state = 'idle';
  }

  #load() {
    if (this.#started) return;
    const src = this.getAttribute('src');
    if (!src) return;
    this.#started = true;
    this.#observer?.disconnect();
    this.dataset.state = 'loading';

    const template = this.getAttribute('srcset-template');
    if (template) {
      const srcset = buildSrcset(
        template, DEFAULT_WIDTHS, Number(this.getAttribute('width')) || Infinity,
      );
      if (srcset) {
        this.#img.srcset = srcset;
        this.#img.sizes = this.getAttribute('sizes') || '100vw';
      }
    }
    this.#img.src = src;
  }

  #onLoad() {
    this.dataset.state = 'loaded';
    this.shadowRoot.querySelector('.err')?.remove();
    this.dispatchEvent(new CustomEvent('lazyload', { bubbles: true }));
  }

  #onError() {
    const maxRetries = Number(this.getAttribute('retries') ?? 2);
    if (this.#attempt < maxRetries) {
      const delay = retryDelay(this.#attempt);
      this.#attempt += 1;
      // Cache-bust, or the browser serves the failed response straight back.
      this.#timer = setTimeout(() => {
        const src = this.getAttribute('src');
        this.#img.src = `${src}${src.includes('?') ? '&' : '?'}_retry=${this.#attempt}`;
      }, delay);
      return;
    }
    this.dataset.state = 'error';
    if (!this.shadowRoot.querySelector('.err')) {
      const box = document.createElement('div');
      box.className = 'err';
      box.setAttribute('role', 'img');
      box.setAttribute('aria-label', this.getAttribute('alt') || 'Image failed to load');
      box.textContent = this.getAttribute('error-text') || 'Image unavailable';
      this.shadowRoot.append(box);
    }
    this.dispatchEvent(new CustomEvent('lazyerror', { bubbles: true }));
  }

  /** Load now, ignoring the viewport. Useful for a print or export path. */
  loadNow() {
    this.#load();
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('lazy-img')) {
  customElements.define('lazy-img', LazyImg);
}

export default LazyImg;
