/// <reference path="../types/dc-runtime.d.ts" />

/**
 * The site's own "AR" logomark — a drafting-corner badge reused across the
 * header, footer, About-section stamp, and each project modal's footer.
 *
 * @param size  rendered width/height in px.
 * @param withPulse  whether to draw the small blinking "live" dot (header only).
 */
export function logoMark(size: number, withPulse: boolean): import('react').ReactElement {
  const R = React.createElement;
  return R('svg', { viewBox: '0 0 40 40', width: size, height: size, style: { flex: 'none', filter: 'drop-shadow(0 6px 14px rgba(228,98,46,.4))' } },
    R('defs', null,
      R('linearGradient', { id: 'arLogoGrad', x1: 2, y1: 2, x2: 38, y2: 38, gradientUnits: 'userSpaceOnUse' },
        R('stop', { offset: '0%', stopColor: '#F4885A' }),
        R('stop', { offset: '100%', stopColor: '#E0A544' })
      )
    ),
    R('rect', { x: 1, y: 1, width: 38, height: 38, rx: 9, fill: 'url(#arLogoGrad)' }),
    R('rect', { x: 1, y: 1, width: 38, height: 38, rx: 9, fill: 'none', stroke: 'rgba(27,25,23,.22)' }),
    R('path', { d: 'M6.5 9.5 L6.5 13.5 M6.5 9.5 L10.5 9.5', fill: 'none', stroke: '#1B1917', strokeOpacity: .55, strokeWidth: 1.4, strokeLinecap: 'round' }),
    R('path', { d: 'M33.5 30.5 L33.5 26.5 M33.5 30.5 L29.5 30.5', fill: 'none', stroke: '#1B1917', strokeOpacity: .55, strokeWidth: 1.4, strokeLinecap: 'round' }),
    R('text', { x: 20, y: 26.5, textAnchor: 'middle', fontFamily: "'JetBrains Mono',monospace", fontWeight: 700, fontSize: 15, letterSpacing: -.5, fill: '#1B1917' }, 'AR'),
    withPulse ? R('circle', { cx: 32, cy: 8, r: 2.3, fill: '#1B1917', style: { animation: 'blink 2.2s ease-in-out infinite' } }) : null
  );
}
