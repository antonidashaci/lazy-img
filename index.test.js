import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DEFAULT_WIDTHS, aspectRatio, buildSrcset, retryDelay } from './core.js';

test('buildSrcset expands the {w} placeholder', () => {
  assert.equal(
    buildSrcset('/i/a-{w}.webp', [320, 640]),
    '/i/a-320.webp 320w, /i/a-640.webp 640w',
  );
});

test('buildSrcset needs a {w} placeholder', () => {
  assert.equal(buildSrcset('/i/a.webp', [320]), '');
  assert.equal(buildSrcset(null), '');
  assert.equal(buildSrcset(undefined), '');
});

test('buildSrcset never offers more pixels than the image has', () => {
  const srcset = buildSrcset('/i/a-{w}.webp', DEFAULT_WIDTHS, 800);
  assert.equal(srcset, '/i/a-320.webp 320w, /i/a-480.webp 480w, /i/a-640.webp 640w');
  assert.ok(!srcset.includes('960'));
});

test('buildSrcset still produces a candidate for a tiny image', () => {
  // Nothing in the default list fits under 200px; serve the image's own width.
  assert.equal(buildSrcset('/i/a-{w}.webp', DEFAULT_WIDTHS, 200), '/i/a-200.webp 200w');
});

test('buildSrcset sorts and drops nonsense widths', () => {
  assert.equal(
    buildSrcset('/i/a-{w}.webp', [640, 320, 0, -1, NaN]),
    '/i/a-320.webp 320w, /i/a-640.webp 640w',
  );
});

test('aspectRatio reserves space from width and height', () => {
  assert.equal(aspectRatio(1600, 900), '1600 / 900');
  assert.equal(aspectRatio('800', '600'), '800 / 600');
});

test('aspectRatio returns null rather than guessing', () => {
  // Guessing a ratio causes the exact layout shift this prevents.
  assert.equal(aspectRatio(null, 900), null);
  assert.equal(aspectRatio(1600, null), null);
  assert.equal(aspectRatio(0, 900), null);
  assert.equal(aspectRatio('wide', 'tall'), null);
});

test('retryDelay backs off and caps', () => {
  assert.equal(retryDelay(0), 400);
  assert.equal(retryDelay(1), 800);
  assert.equal(retryDelay(2), 1600);
  assert.equal(retryDelay(10), 4000);
});
