/// <reference path="../types/dc-runtime.d.ts" />

/**
 * The browser-tab favicon, as a theme-matched variant of the same "AR"
 * drafting-corner badge `logoMark()` draws inline on the page — same shape
 * (rounded square, corner ticks, monospace "AR"), different gradient per
 * theme, generated as a `data:image/svg+xml` URI (no separate asset file to
 * keep in sync).
 *
 * `logoMark()` itself stays a fixed Warm Forge orange regardless of the
 * active theme — a deliberate choice, the in-page brand mark shouldn't
 * shift under the visitor. The favicon is the one place asked to actually
 * *follow* the theme: primarily designed around Cold Steel ("tema
 * noturno" — the palette the header's 🌙 toggle button leads to, `theme:
 * 'alternate'`), and swapped live by `updateFavicon()` in `component.ts`
 * (mount + every `toggleTheme`) so a visitor who's actually in Warm Forge
 * still sees a tab icon that matches what's on screen, and it re-swaps
 * back the instant they toggle back to Cold Steel.
 */
function badge(gradFrom: string, gradTo: string, ink: string): string {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">'
    + '<defs><linearGradient id="g" x1="2" y1="2" x2="38" y2="38" gradientUnits="userSpaceOnUse">'
    + '<stop offset="0%" stop-color="' + gradFrom + '"/><stop offset="100%" stop-color="' + gradTo + '"/>'
    + '</linearGradient></defs>'
    + '<rect x="1" y="1" width="38" height="38" rx="9" fill="url(#g)"/>'
    + '<path d="M6.5 9.5 6.5 13.5M6.5 9.5 10.5 9.5" stroke="' + ink + '" stroke-opacity=".55" stroke-width="1.4" stroke-linecap="round" fill="none"/>'
    + '<path d="M33.5 30.5 33.5 26.5M33.5 30.5 29.5 30.5" stroke="' + ink + '" stroke-opacity=".55" stroke-width="1.4" stroke-linecap="round" fill="none"/>'
    + '<text x="20" y="26.5" text-anchor="middle" font-family="monospace" font-weight="700" font-size="15" fill="' + ink + '">AR</text>'
    + '</svg>';
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

/** Warm Forge — matches the static favicon shipped in the `.dc.html`'s `<helmet>`. */
const FAVICON_DEFAULT = badge('#F4885A', '#E0A544', '#1B1917');
/** Cold Steel ("tema noturno") — light cyan-to-blue tints of that theme's
 *  `--color-accent`/`--color-support-amber` (#06B6D4/#3B82F6), same
 *  lighten-for-contrast treatment the default gradient already uses, with
 *  ink switched to Cold Steel's own `--color-bg-base` (#111827). */
const FAVICON_ALTERNATE = badge('#22D3EE', '#60A5FA', '#111827');

export function faviconHref(theme: 'default' | 'alternate'): string {
  return theme === 'alternate' ? FAVICON_ALTERNATE : FAVICON_DEFAULT;
}

/** Swaps the `<link rel="icon">`'s `href` to match `theme` — called on
 *  mount and from `toggleTheme` so the tab icon never lags the palette
 *  actually on screen. No-ops if the tag isn't found (shouldn't happen;
 *  the `.dc.html` `<helmet>` always ships one, this only ever changes it). */
export function updateFavicon(theme: 'default' | 'alternate'): void {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (link) link.href = faviconHref(theme);
}
