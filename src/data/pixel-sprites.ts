// Pixel-art illustrations for the Bancada de IA terminal — one 24×24 sprite
// per skill (`Skill.id`), drawn in code rather than typed out as 576 literal
// characters each. A tiny pen (`Pen`) paints shapes onto a grid in painter's
// order and `bake()` flattens it into the rows of characters the
// <pixel-sprite> element reads; building them from primitives is what keeps
// every row exactly `SPRITE_SIZE` wide (a hand-typed grid can't promise that)
// and makes a shape easy to nudge by a pixel later.
//
// Palette keys (resolved against the active theme by <pixel-sprite>, never
// hard-coded here, so Warm Forge and Cold Steel both stay on-palette):
//   a  the skill's branch color        l  lighter tint of it
//   d  darker, background-tinted shade w  main text (cream / near-white)
//   y  support amber                   s  support steel
//   k  base background ("ink")         g  dim text
//   .  empty

export const SPRITE_SIZE = 24;

export type PaletteKey = 'a' | 'l' | 'd' | 'w' | 'y' | 's' | 'k' | 'g';

/** 3×5 pixel font — only the letters the sprites actually spell. */
const FONT: Record<string, readonly string[]> = {
  A: ['010', '101', '111', '101', '101'],
  R: ['110', '101', '110', '101', '101'],
  T: ['111', '010', '010', '010', '010'],
  S: ['011', '100', '010', '001', '110'],
  J: ['001', '001', '001', '101', '010'],
  I: ['111', '010', '010', '010', '111'],
  Q: ['111', '101', '101', '111', '001'],
  L: ['100', '100', '100', '100', '111'],
};

class Pen {
  readonly g: string[][];

  constructor(readonly n: number) {
    this.g = Array.from({ length: n }, () => new Array<string>(n).fill('.'));
  }

  px(x: number, y: number, c: string): this {
    const rx = Math.round(x), ry = Math.round(y);
    const row = this.g[ry];
    if (row && rx >= 0 && rx < this.n) row[rx] = c;
    return this;
  }

  rect(x: number, y: number, w: number, h: number, c: string): this {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
    return this;
  }

  /** 1px outline of a rectangle. */
  frame(x: number, y: number, w: number, h: number, c: string): this {
    this.rect(x, y, w, 1, c).rect(x, y + h - 1, w, 1, c);
    this.rect(x, y, 1, h, c).rect(x + w - 1, y, 1, h, c);
    return this;
  }

  /** A rectangle with its four corner pixels cut off — the pixel-art "rounded corner". */
  plate(x: number, y: number, w: number, h: number, c: string): this {
    this.rect(x, y, w, h, c);
    for (const [cx, cy] of [[x, y], [x + w - 1, y], [x, y + h - 1], [x + w - 1, y + h - 1]] as const) this.px(cx, cy, '.');
    return this;
  }

  line(x0: number, y0: number, x1: number, y1: number, c: string): this {
    let x = Math.round(x0), y = Math.round(y0);
    const ex = Math.round(x1), ey = Math.round(y1);
    const dx = Math.abs(ex - x), dy = -Math.abs(ey - y);
    const sx = x < ex ? 1 : -1, sy = y < ey ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x, y, c);
      if (x === ex && y === ey) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x += sx; }
      if (e2 <= dx) { err += dx; y += sy; }
    }
    return this;
  }

  disc(cx: number, cy: number, r: number, c: string): this {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) this.px(x, y, c);
      }
    }
    return this;
  }

  ring(cx: number, cy: number, r: number, thick: number, c: string): this {
    const inner = r - thick;
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const d2 = (x - cx) ** 2 + (y - cy) ** 2;
        if (d2 <= r * r && d2 > inner * inner) this.px(x, y, c);
      }
    }
    return this;
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: string): this {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) this.px(x, y, c);
      }
    }
    return this;
  }

  /** A rotated ellipse *outline* sampled parametrically — for the React atom's orbits. */
  orbit(cx: number, cy: number, rx: number, ry: number, deg: number, c: string): this {
    const a = (deg * Math.PI) / 180;
    for (let i = 0; i < 360; i++) {
      const t = (i * Math.PI) / 180;
      const ex = rx * Math.cos(t), ey = ry * Math.sin(t);
      this.px(cx + ex * Math.cos(a) - ey * Math.sin(a), cy + ex * Math.sin(a) + ey * Math.cos(a), c);
    }
    return this;
  }

  /** Even-odd polygon fill. */
  poly(pts: ReadonlyArray<readonly [number, number]>, c: string): this {
    for (let y = 0; y < this.n; y++) {
      for (let x = 0; x < this.n; x++) {
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const a = pts[i], b = pts[j];
          if (!a || !b) continue;
          if (a[1] > y !== b[1] > y && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
        }
        if (inside) this.px(x, y, c);
      }
    }
    return this;
  }

  text(s: string, x: number, y: number, c: string, scale = 1): this {
    let cx = x;
    for (const ch of s) {
      const glyph = FONT[ch];
      if (glyph) {
        glyph.forEach((row, j) => [...row].forEach((bit, i) => { if (bit === '1') this.rect(cx + i * scale, y + j * scale, scale, scale, c); }));
      }
      cx += 4 * scale;
    }
    return this;
  }

  /** A flat-shaded can: `rx`-wide ellipse caps joined by a body. */
  can(cx: number, top: number, h: number, rx: number, ry: number, body: string, cap: string): this {
    this.rect(cx - rx, top, rx * 2 + 1, h, body);
    this.ellipse(cx, top + h, rx, ry, body);
    this.ellipse(cx, top, rx, ry, cap);
    return this;
  }
}

function bake(draw: (p: Pen) => void): readonly string[] {
  const p = new Pen(SPRITE_SIZE);
  draw(p);
  return p.g.map((row) => row.join(''));
}

/** Which tone each sprite is drawn in — the `--color-branch-*` token whose color 'a' resolves to. */
export type SpriteTone = 'ia' | 'web' | 'dados' | 'core';

export interface Sprite {
  tone: SpriteTone;
  /** `SPRITE_SIZE` strings of `SPRITE_SIZE` palette characters each. */
  rows: readonly string[];
}

const sprite = (tone: SpriteTone, draw: (p: Pen) => void): Sprite => ({ tone, rows: bake(draw) });

export const SPRITES: Record<string, Sprite> = {
  // ── núcleo ────────────────────────────────────────────────────────────
  core: sprite('ia', (p) => {
    p.plate(2, 2, 20, 20, 'a').plate(3, 3, 18, 18, 'd');
    p.text('AR', 5, 7, 'w', 2);
    p.rect(2, 4, 1, 2, 'y').rect(4, 2, 2, 1, 'y').rect(21, 18, 1, 2, 'y').rect(18, 21, 2, 1, 'y');
  }),

  // ── ramo IA ───────────────────────────────────────────────────────────
  ia: sprite('ia', (p) => {
    for (const k of [7, 10, 13, 16]) {
      p.rect(k, 2, 1, 3, 'y').rect(k, 19, 1, 3, 'y').rect(2, k, 3, 1, 'y').rect(19, k, 3, 1, 'y');
    }
    p.plate(5, 5, 14, 14, 'a').plate(6, 6, 12, 12, 'd');
    p.text('AI', 9, 9, 'w');
    p.px(6, 6, 'l').px(17, 6, 'l').px(6, 17, 'l').px(17, 17, 'l');
  }),

  llm: sprite('ia', (p) => {
    p.plate(2, 3, 14, 10, 'a').rect(4, 13, 2, 2, 'a').px(4, 15, 'a');
    for (const x of [5, 8, 11]) p.rect(x, 7, 2, 2, 'w');
    p.plate(9, 14, 13, 7, 'y').rect(17, 21, 2, 2, 'y');
    p.rect(11, 16, 8, 1, 'k').rect(11, 18, 5, 1, 'k');
  }),

  rag: sprite('ia', (p) => {
    p.rect(3, 2, 13, 18, 'd').frame(3, 2, 13, 18, 'l');
    p.rect(5, 5, 8, 1, 'a').rect(5, 8, 6, 1, 'a').rect(5, 11, 8, 1, 'a').rect(5, 14, 5, 1, 'a').rect(5, 17, 7, 1, 'a');
    p.disc(15, 14, 6, 'w').disc(15, 14, 4, 'k');
    p.rect(13, 12, 4, 1, 'a').rect(12, 15, 5, 1, 'a');
    p.line(19, 18, 22, 21, 'y').line(20, 18, 22, 20, 'y').line(19, 19, 21, 21, 'y');
  }),

  agent: sprite('ia', (p) => {
    p.rect(11, 5, 2, 3, 'w').disc(11.5, 3.5, 1.7, 'y');
    p.plate(4, 8, 16, 12, 'a');
    p.rect(2, 12, 2, 4, 'd').rect(20, 12, 2, 4, 'd');
    p.rect(7, 11, 4, 4, 'w').rect(13, 11, 4, 4, 'w').rect(9, 12, 2, 2, 'k').rect(15, 12, 2, 2, 'k');
    p.rect(9, 17, 6, 1, 'k');
    p.rect(5, 9, 3, 1, 'l');
  }),

  auto: sprite('ia', (p) => {
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      p.rect(Math.round(11.5 + 8.6 * Math.cos(a)) - 1, Math.round(11.5 + 8.6 * Math.sin(a)) - 1, 3, 3, 'a');
    }
    p.disc(11.5, 11.5, 7.5, 'a').ring(11.5, 11.5, 7.5, 1.2, 'l').disc(11.5, 11.5, 3.8, 'k');
    p.rect(12, 9, 2, 2, 'y').rect(10, 11, 3, 2, 'y').rect(10, 13, 2, 2, 'y');
  }),

  eval: sprite('ia', (p) => {
    p.rect(4, 3, 16, 19, 'd').frame(4, 3, 16, 19, 'a');
    p.rect(8, 1, 8, 4, 'y').rect(10, 2, 4, 2, 'k');
    [8, 13, 18].forEach((y, i) => {
      if (i < 2) p.rect(7, y, 4, 4, 'a').px(7, y + 2, 'w').px(8, y + 3, 'w').px(9, y + 2, 'w').px(10, y + 1, 'w');
      else p.frame(7, y, 4, 4, 'w');
      p.rect(13, y + 1, i === 1 ? 4 : 5, 1, 'g').rect(13, y + 3, 3, 1, 'g');
    });
  }),

  // ── ramo web ──────────────────────────────────────────────────────────
  web: sprite('web', (p) => {
    p.rect(2, 4, 20, 17, 'd').frame(2, 4, 20, 17, 'a').rect(2, 4, 20, 4, 'a');
    p.px(4, 5, 'k').px(6, 5, 'y').px(8, 5, 'w');
    p.rect(4, 10, 16, 4, 'l').rect(4, 16, 7, 3, 'a').rect(13, 16, 7, 3, 'a');
    p.rect(6, 11, 6, 1, 'k');
  }),

  react: sprite('web', (p) => {
    p.orbit(11.5, 11.5, 10.5, 3.6, 0, 'a').orbit(11.5, 11.5, 10.5, 3.6, 60, 'l').orbit(11.5, 11.5, 10.5, 3.6, 120, 'a');
    p.disc(11.5, 11.5, 2.2, 'y');
  }),

  next: sprite('web', (p) => {
    p.disc(11.5, 11.5, 10.5, 'w').disc(11.5, 11.5, 9.3, 'd');
    p.rect(8, 7, 2, 10, 'w').rect(15, 7, 2, 7, 'w');
    p.line(8, 7, 15, 16, 'w').line(9, 7, 16, 16, 'w').line(10, 7, 17, 16, 'a');
    p.rect(15, 15, 2, 2, 'a');
  }),

  node: sprite('web', (p) => {
    const hex: Array<readonly [number, number]> = [[11.5, 0.8], [21.4, 6.4], [21.4, 17.6], [11.5, 23.2], [1.6, 17.6], [1.6, 6.4]];
    p.poly(hex, 'a');
    const inner: Array<readonly [number, number]> = [[11.5, 2.8], [19.7, 7.4], [19.7, 16.6], [11.5, 21.2], [3.3, 16.6], [3.3, 7.4]];
    p.poly(inner, 'd');
    p.text('JS', 8, 9, 'w');
  }),

  ts: sprite('web', (p) => {
    p.plate(2, 2, 20, 20, 'a');
    p.rect(3, 3, 18, 1, 'l').rect(3, 3, 1, 18, 'l');
    p.text('TS', 8, 11, 'k', 2);
  }),

  ux: sprite('web', (p) => {
    p.plate(2, 3, 16, 14, 'd').frame(2, 3, 16, 14, 'a');
    p.rect(4, 5, 12, 5, 'l').rect(4, 12, 7, 3, 'a').rect(12, 13, 4, 1, 'g');
    const cursor = ['X', 'XX', 'XXX', 'XXXX', 'XXXXX', 'XXXXXX', 'XXXXXXX', 'XXXXX', 'XX.XX', 'X..XX', '....XX', '....XX'];
    cursor.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'X') p.px(13 + i, 10 + j, 'k'); }));
    cursor.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === 'X' && i > 0 && i < row.length - 1 && j > 0 && j < 7) p.px(13 + i, 10 + j, 'w'); }));
    p.px(20, 4, 'y').px(21, 3, 'y').px(21, 5, 'y').px(22, 4, 'y').px(21, 4, 'w');
  }),

  // ── ramo dados & infra ────────────────────────────────────────────────
  dados: sprite('dados', (p) => {
    p.can(11.5, 4, 15, 8, 3, 'd', 'l');
    p.ellipse(11.5, 9, 8, 3, 'd').ellipse(11.5, 14, 8, 3, 'd');
    for (const y of [9, 14, 19]) for (let x = 3; x <= 20; x++) {
      const dy = Math.round(3 * Math.sqrt(Math.max(0, 1 - ((x - 11.5) / 8) ** 2)));
      p.px(x, y + dy, 'a');
    }
    p.rect(3, 4, 1, 15, 'a').rect(20, 4, 1, 15, 'a');
    p.rect(16, 11, 2, 1, 'y').rect(16, 16, 2, 1, 'y');
  }),

  sql: sprite('dados', (p) => {
    p.rect(2, 3, 20, 18, 'd').frame(2, 3, 20, 18, 'a').rect(2, 3, 20, 7, 'a');
    p.text('SQL', 6, 4, 'k');
    p.rect(8, 10, 1, 11, 'a').rect(15, 10, 1, 11, 'a').rect(2, 14, 20, 1, 'a').rect(2, 18, 20, 1, 'a');
    p.rect(9, 15, 6, 3, 'y').rect(4, 11, 3, 2, 'g').rect(17, 11, 3, 2, 'g').rect(4, 19, 3, 1, 'g').rect(17, 15, 3, 2, 'g');
  }),

  pg: sprite('dados', (p) => {
    p.disc(4.8, 9.5, 4.8, 's').disc(18.2, 9.5, 4.8, 's').disc(4.8, 9.5, 2.6, 'd').disc(18.2, 9.5, 2.6, 'd');
    p.disc(11.5, 10, 6.8, 's').rect(10, 14, 3, 6, 's').rect(10, 19, 6, 2, 's').rect(15, 18, 2, 3, 's');
    p.rect(7, 15, 1, 5, 'w').rect(16, 15, 1, 4, 'w').px(6, 19, 'w').px(17, 18, 'w');
    p.rect(8, 8, 2, 2, 'k').rect(14, 8, 2, 2, 'k').px(8, 8, 'w').px(14, 8, 'w');
    p.rect(8, 3, 8, 1, 'l');
  }),

  docker: sprite('dados', (p) => {
    for (const x of [4, 8, 12, 16]) p.rect(x, 9, 3, 3, 'w').px(x + 1, 10, 'a');
    for (const x of [8, 12]) p.rect(x, 5, 3, 3, 'w').px(x + 1, 6, 'a');
    p.rect(12, 1, 3, 3, 'w').px(13, 2, 'a');
    p.poly([[1, 13], [22, 13], [20.5, 18], [14, 21], [6, 21], [2.5, 17]], 'a');
    p.poly([[19, 13], [23, 10], [23, 14], [21, 16]], 'a');
    p.rect(3, 14, 15, 1, 'l').px(6, 17, 'k').px(7, 17, 'k');
    for (const x of [2, 6, 10, 14, 18]) p.px(x, 22, 'l').px(x + 1, 22, 'l');
  }),

  dash: sprite('dados', (p) => {
    p.rect(2, 2, 1, 19, 'g').rect(2, 20, 20, 1, 'g');
    p.rect(5, 14, 3, 6, 'a').rect(9, 10, 3, 10, 'l').rect(13, 12, 3, 8, 'a').rect(17, 6, 3, 14, 'l');
    p.line(6, 11, 10, 7, 'y').line(10, 7, 14, 9, 'y').line(14, 9, 18, 3, 'y');
    for (const [x, y] of [[6, 11], [10, 7], [14, 9], [18, 3]] as const) p.rect(x - 1, y - 1, 3, 3, 'w');
  }),
};

/** Fallback when a skill id has no dedicated sprite yet: its branch's header icon. */
export function spriteFor(id: string): Sprite | undefined {
  return SPRITES[id];
}
