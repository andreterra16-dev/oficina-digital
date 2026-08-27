/// <reference path="../types/dc-runtime.d.ts" />
import type { IllustrationKey } from '../types/domain';

/**
 * Hand-drawn SVG illustration for a project card that has no official brand
 * logo (`Project.logo === null`) — one per `IllustrationKey`, tinted with
 * the project's own accent `color`.
 *
 * @param key    which illustration to draw.
 * @param color  the project's accent color (hex) — the gradient below uses
 *               `stopOpacity` rather than an `"r,g,b"` string, so unlike the
 *               inline `rgba(...)` styles elsewhere no separate rgb-string
 *               form of the color is needed here.
 */
export function illustration(key: IllustrationKey, color: string): import('react').ReactElement {
  const R = React.createElement;
  const grad = 'grad-' + key;
  const defs = R('defs', { key: 'defs' },
    R('radialGradient', { id: grad, cx: '50%', cy: '38%', r: '70%' },
      R('stop', { offset: '0%', stopColor: color, stopOpacity: .9 }),
      R('stop', { offset: '100%', stopColor: color, stopOpacity: .12 })
    )
  );
  const ring = R('circle', { key: 'ring', cx: 100, cy: 65, r: 46, fill: 'none', stroke: color, strokeOpacity: .35, strokeWidth: 1, strokeDasharray: '3 5' });

  if (key === 'valuation') {
    const bars = [
      { x: 78, h: 20 }, { x: 92, h: 34 }, { x: 106, h: 26 }, { x: 120, h: 44 },
    ].map((b, i) => R('rect', {
      key: 'b' + i, x: b.x, y: 92 - b.h, width: 10, height: b.h, rx: 2.5,
      fill: color, opacity: .55 + i * .11,
    }));
    return R('svg', { viewBox: '0 0 200 130', style: { width: '100%', height: '100%' } },
      defs,
      R('circle', { cx: 100, cy: 65, r: 58, fill: 'url(#' + grad + ')' }),
      ring,
      ...bars,
      R('path', { d: 'M74 70 L90 52 L104 60 L128 34', fill: 'none', stroke: color, strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' }),
      R('circle', { cx: 128, cy: 34, r: 4.2, fill: color }),
      R('circle', { cx: 74, cy: 70, r: 3, fill: color, opacity: .8 })
    );
  }

  if (key === 'onboarding') {
    const dots = [0, 60, 120, 180, 240, 300].map((deg, i) => {
      const rad = (deg - 90) * Math.PI / 180;
      const cx = 100 + Math.cos(rad) * 40, cy = 65 + Math.sin(rad) * 40;
      return R('circle', { key: 'd' + i, cx, cy, r: i === 0 ? 5 : 3.4, fill: color, opacity: i === 0 ? 1 : .55 });
    });
    return R('svg', { viewBox: '0 0 200 130', style: { width: '100%', height: '100%' } },
      defs,
      R('circle', { cx: 100, cy: 65, r: 58, fill: 'url(#' + grad + ')' }),
      R('circle', { cx: 100, cy: 65, r: 40, fill: 'none', stroke: color, strokeOpacity: .4, strokeWidth: 1 }),
      R('circle', { cx: 100, cy: 65, r: 26, fill: 'none', stroke: color, strokeOpacity: .55, strokeWidth: 1, strokeDasharray: '2 4' }),
      ...dots,
      R('path', { d: 'M100 65 L100 41', stroke: color, strokeWidth: 2, strokeLinecap: 'round' }),
      R('path', { d: 'M92 51 L100 41 L108 51', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' })
    );
  }

  // pricing — a price tag reading its own percentage, plus a small
  // ascending cost curve underneath (CMV → preço sugerido).
  return R('svg', { viewBox: '0 0 200 130', style: { width: '100%', height: '100%' } },
    defs,
    R('circle', { cx: 100, cy: 65, r: 58, fill: 'url(#' + grad + ')' }),
    ring,
    R('g', { transform: 'rotate(-10 100 62)' },
      R('rect', { x: 70, y: 36, width: 62, height: 50, rx: 9, fill: 'none', stroke: color, strokeWidth: 2.2 }),
      R('circle', { cx: 84, cy: 49, r: 3.6, fill: 'none', stroke: color, strokeWidth: 2 }),
      R('line', { x1: 92, y1: 82, x2: 118, y2: 45, stroke: color, strokeWidth: 2.2, strokeLinecap: 'round' }),
      R('circle', { cx: 96, cy: 51, r: 3.2, fill: color }),
      R('circle', { cx: 114, cy: 76, r: 3.2, fill: color })
    ),
    R('path', { d: 'M68 100 L84 92 L98 98 L118 78 L134 84', fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', opacity: .85 }),
    R('circle', { cx: 134, cy: 84, r: 3.4, fill: color })
  );
}
