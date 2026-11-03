# lazy-img

**[Open the demo page →](https://antonidashaci.github.io/lazy-img/demo.html)**

`<lazy-img>` — a lazy, responsive image element that **reserves its own space**,
fades in from a blurred placeholder, generates a `srcset`, and retries a failed
request instead of leaving a hole. Zero dependencies, ~200 lines.

## Why, when `loading="lazy"` exists

It does, and most of the time you should just use it. What the native attribute
doesn't give you is the rest of the checklist that stops a gallery from jumping
around and burning mobile data:

| | native `loading="lazy"` | `<lazy-img>` |
| --- | --- | --- |
| defers offscreen images | yes | yes |
| reserves space before load | only if you set width/height yourself | from `width`/`height` |
| blur placeholder + cross-fade | no | yes |
| builds a `srcset` for you | no | from a `{w}` template |
| retries a dropped request | no | backoff, cache-busted |
| styleable error state | broken-image glyph | `[data-state="error"]` box |

## Install

```bash
npm install lazy-img-element
```

```js
import 'lazy-img-element';
```

Or drop `index.js` and `core.js` next to your HTML and `import './index.js'`.

## Use

```html
<lazy-img
  src="/img/hero-1280.webp"
  srcset-template="/img/hero-{w}.webp"
  sizes="(max-width: 700px) 100vw, 700px"
  width="1280" height="720"
  placeholder="/img/hero-tiny.webp"
  alt="The view from the roof">
</lazy-img>
```

| Attribute | |
| --- | --- |
| `src` | required; also the `srcset` fallback |
| `srcset-template` | URL with `{w}`, e.g. `/img/hero-{w}.webp` |
| `sizes` | passed through; defaults to `100vw` |
| `width`, `height` | intrinsic size — **this is what reserves the space** |
| `placeholder` | a tiny image, blurred until the real one decodes |
| `alt` | required for anything meaningful; `""` for decoration |
| `root-margin` | how early to start, default `200px` |
| `retries` | default `2` |
| `error-text` | shown in the error box |

Events: `lazyload` and `lazyerror`, both bubbling. `element.loadNow()` loads
immediately, for a print or export path.

## Styling

The shadow root exposes custom properties and a state attribute:

```css
lazy-img {
  --lazy-img-bg: #e8e8e4;      /* before anything loads  */
  --lazy-img-fit: cover;       /* object-fit              */
  --lazy-img-fade: 300ms;
  --lazy-img-error-bg: #f2f1ec;
  --lazy-img-error-fg: #6b6a63;
  border-radius: 10px;
}
lazy-img[data-state="error"] { outline: 1px dashed #c33; }
```

`data-state` cycles through `idle` → `loading` → `loaded` | `error`.

## Decisions worth knowing

- **No dimensions, no guess.** `aspectRatio()` returns `null` when `width` or
  `height` is missing, so the element reserves nothing rather than reserving the
  *wrong* thing — guessing 16:9 causes the exact layout shift this exists to
  prevent. Give the host a height in CSS instead.
- **`srcset` is capped at the image's own width.** No point offering a 2400px
  candidate for a 900px asset.
- **Retries are cache-busted.** Without a changed URL the browser hands back the
  failed response instantly and the retry is theatre.
- **The error box is `role="img"` with the `alt` as its label**, so a screen
  reader still gets the meaning when the file is gone.
- **`prefers-reduced-motion` disables the fade.**

## Layout

- `core.js` — the decisions (`buildSrcset`, `aspectRatio`, `retryDelay`), no DOM
- `index.js` — the custom element
- `demo.html` — open it and scroll

## Test

```bash
npm test
```

8 tests against `core.js`, `node --test`, no jsdom and no framework. The DOM
shell is deliberately thin so the logic can be tested without one; `demo.html`
covers the visual half.

## License

MIT
