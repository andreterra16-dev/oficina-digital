/// <reference path="../types/dc-runtime.d.ts" />

/**
 * The site's own "AR" logomark — a drafting-corner badge reused across the
 * header, footer, About-section stamp, and each project modal's footer.
 *
 * Follows the active theme the same way `favicon.ts` does: same shape,
 * gradient/ink swapped per palette (Warm Forge orange / Cold Steel cyan),
 * recomputed on every `renderVals()` call — unlike the favicon (a `<link>`
 * outside React's tree, needing its own `updateFavicon()` call from
 * `toggleTheme`), this is a plain React element rendered by `Component`
 * itself, so it just re-renders for free whenever `state.theme` changes;
 * no separate wiring needed.
 *
 * @param size  rendered width/height in px.
 * @param withPulse  whether to draw the small blinking "live" dot (header only).
 * @param theme  active theme — picks the gradient/ink/shadow tint.
 */
export function logoMark(size: number, withPulse: boolean, theme: 'default' | 'alternate'): import('react').ReactElement {
  const R = React.createElement;
  const night = theme === 'alternate';
  const gradFrom = night ? '#22D3EE' : '#F4885A';
  const gradTo = night ? '#60A5FA' : '#E0A544';
  const ink = night ? '#111827' : '#1B1917';
  const shadowRgb = night ? '6,182,212' : '228,98,46';
  return R('svg', { viewBox: '0 0 40 40', width: size, height: size, style: { flex: 'none', filter: 'drop-shadow(0 6px 14px rgba(' + shadowRgb + ',.4))' } },
    R('defs', null,
      R('linearGradient', { id: 'arLogoGrad', x1: 2, y1: 2, x2: 38, y2: 38, gradientUnits: 'userSpaceOnUse' },
        R('stop', { offset: '0%', stopColor: gradFrom }),
        R('stop', { offset: '100%', stopColor: gradTo })
      )
    ),
    R('rect', { x: 1, y: 1, width: 38, height: 38, rx: 9, fill: 'url(#arLogoGrad)' }),
    R('rect', { x: 1, y: 1, width: 38, height: 38, rx: 9, fill: 'none', stroke: 'rgba(27,25,23,.22)' }),
    R('path', { d: 'M6.5 9.5 L6.5 13.5 M6.5 9.5 L10.5 9.5', fill: 'none', stroke: ink, strokeOpacity: .55, strokeWidth: 1.4, strokeLinecap: 'round' }),
    R('path', { d: 'M33.5 30.5 L33.5 26.5 M33.5 30.5 L29.5 30.5', fill: 'none', stroke: ink, strokeOpacity: .55, strokeWidth: 1.4, strokeLinecap: 'round' }),
    R('text', { x: 20, y: 26.5, textAnchor: 'middle', fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 15, letterSpacing: -.5, fill: ink }, 'AR'),
    withPulse ? R('circle', { cx: 32, cy: 8, r: 2.3, fill: ink, style: { animation: 'blink 2.2s ease-in-out infinite' } }) : null
  );
}
