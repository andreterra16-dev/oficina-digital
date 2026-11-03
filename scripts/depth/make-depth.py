"""Generates the depth maps behind the 3D character (src/components/three-stage.ts).

One-off asset step, not part of `npm run build`: the maps are committed under
assets/depth/, and only need regenerating when a character image changes.

    pip install pillow numpy scipy
    python scripts/depth/make-depth.py

Each map is a small grayscale PNG, white = near the viewer, black = far. There is
no neural depth model here on purpose: the three character images are simple
enough (one figure on a plain backdrop) for classic segmentation, and the result
only has to be *plausible* — it drives a subtle parallax, not a reconstruction.

  1. Segment the figure (alpha channel, or color distance from the backdrop).
  2. Turn the mask into volume: the distance from the silhouette's edge, so the
     middle of the body sits nearer than its outline (a rounded "pillow").
  3. Blur it. Sharp depth edges would stretch the mesh like rubber when the
     camera moves; a soft ramp reads as a rounded form instead.
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets"
OUT = SRC / "depth"
OUT.mkdir(exist_ok=True)
WIDTH = 256  # depth maps are tiny on purpose — they are blurred anyway


def load(name: str, width: int) -> np.ndarray:
    im = Image.open(SRC / name).convert("RGBA")
    h = round(im.height * width / im.width)
    return np.asarray(im.resize((width, h), Image.LANCZOS), dtype=np.float32)


def disk(r: int) -> np.ndarray:
    y, x = np.ogrid[-r : r + 1, -r : r + 1]
    return x * x + y * y <= r * r


def keep_big(mask: np.ndarray, min_area: int) -> np.ndarray:
    lab, n = ndi.label(mask)
    if n == 0:
        return mask
    areas = ndi.sum(mask, lab, range(1, n + 1))
    keep = np.isin(lab, [i + 1 for i, a in enumerate(areas) if a >= min_area])
    return keep


def volume(mask: np.ndarray, base: float = 0.38, blur: float = 3.0) -> np.ndarray:
    """Mask -> soft pillow depth in [0, 1]."""
    m = ndi.binary_fill_holes(mask)
    dist = ndi.distance_transform_edt(m)
    peak = dist.max() or 1.0
    d = base * m + (1 - base) * np.sqrt(dist / peak)
    d = ndi.gaussian_filter(d * m, blur)
    return np.clip(d / (d.max() or 1.0), 0, 1)


def save(name: str, depth: np.ndarray) -> None:
    Image.fromarray((depth * 255).astype(np.uint8), "L").save(OUT / name, optimize=True)
    print(f"  assets/depth/{name}  {depth.shape[1]}x{depth.shape[0]}")


def portrait() -> None:
    """Circular portrait: the alpha is only the round crop, so the figure is
    found the same way as in `contact()` — colour distance from the grey
    backdrop sampled just inside the circle."""
    a = load("andre-portrait.png", WIDTH)
    h, w = a.shape[:2]
    rgb = a[..., :3]
    bg = np.median(rgb[int(h * 0.22) : int(h * 0.3), int(w * 0.12) : int(w * 0.2)].reshape(-1, 3), axis=0)
    mask = (a[..., 3] > 128) & (np.linalg.norm(rgb - bg, axis=2) > 24)
    mask = keep_big(ndi.binary_closing(ndi.binary_opening(mask, disk(2)), disk(3)), 800)
    save("andre-portrait.png", volume(mask, base=0.34, blur=3.2))


def contact() -> None:
    """Figure on a flat grey backdrop: everything unlike the backdrop's colour."""
    a = load("andre-retrato-contato.png", WIDTH)
    rgb = a[..., :3]
    # Sample the backdrop from the corners and the left/right margins.
    pts = np.concatenate([rgb[:8, :8].reshape(-1, 3), rgb[:8, -8:].reshape(-1, 3), rgb[-30:, :6].reshape(-1, 3)])
    bg = np.median(pts, axis=0)
    diff = np.linalg.norm(rgb - bg, axis=2)
    mask = diff > 26
    mask = ndi.binary_opening(mask, disk(2))
    mask = keep_big(ndi.binary_closing(mask, disk(3)), 600)
    save("andre-retrato-contato.png", volume(mask, base=0.34, blur=3.2))


def hero() -> None:
    """The whiteboard scene. Text, graphs and the board frame are all thin
    strokes, so a morphological opening removes them and leaves the big
    blobs: hair, shirt, jeans, skin, shoes."""
    w = 512
    a = load("hero-lousa.png", w)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    sat = (mx - mn) / np.maximum(mx, 1)
    h = a.shape[0]

    dark = lum < 70
    shirt = (b - r) > 25
    skin = (r > g) & (g > b) & (sat > 0.25) & (r > 140)
    below_board = np.arange(h)[:, None] > h * 0.54
    shoes = below_board & ((lum < 243) | (sat > 0.06))
    mask = dark | shirt | skin | shoes

    mask = ndi.binary_opening(mask, disk(5))
    mask = keep_big(ndi.binary_closing(mask, disk(4)), 2500)
    mask = ndi.binary_fill_holes(mask)

    d = volume(mask, base=0.34, blur=7.0)
    small = Image.fromarray((d * 255).astype(np.uint8), "L").resize((WIDTH, round(h * WIDTH / w)), Image.LANCZOS)
    save("hero-lousa.png", np.asarray(small, dtype=np.float32) / 255)
    # A flat preview of the segmentation, for eyeballing the mask (not shipped).
    Image.fromarray((mask * 255).astype(np.uint8), "L").save(OUT / "_hero-mask-preview.png")


if __name__ == "__main__":
    print("Generating depth maps…")
    portrait()
    contact()
    hero()
