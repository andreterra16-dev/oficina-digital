"""Splits the contact portrait into two layers for the goodbye wave.

The first attempt at the wave bent the *mesh* around the arm (a vertex-shader
rotation weighted by position). That drags the pixels around the hand along with
it — the backdrop, the sleeve, the edge of the shirt — and the hand smeared. The
robust way to animate a limb in a 2D illustration is the one cut-out animation
uses: separate it into its own layer and move it as a rigid body.

    pip install pillow numpy scipy
    python scripts/depth/make-arm.py

Writes, next to the other 3D textures in assets/3d/:

  andre-retrato-contato-base.webp   the portrait with the waving forearm and hand
                                    removed and the backdrop rebuilt behind them
  andre-retrato-contato-arm.webp    that forearm and hand alone, with a soft alpha
                                    edge, aligned pixel-for-pixel with the base

<character-3d> draws the base as the scene and the arm as a second plane that
rotates about the elbow (see three-stage.ts). The pivot printed at the end is the
`wave="…"` attribute's first two numbers.

How the cut is made (nothing here is a learned model; the portrait is one figure
on a smooth grey backdrop):
  1. Model the backdrop: a heavily blurred copy of the image with the figure
     masked out, so it follows the backdrop's gradient and grain-free tone.
  2. The figure is wherever the image differs from that model.
  3. The waving arm is the part of the figure that is not shirt-blue, inside a
     box around the raised forearm/hand (left of the sleeve, above the elbow).
  4. The arm is split at the elbow: the forearm and hand are the moving layer, the
     upper arm stays in the base. Base = image with the forearm pixels (grown a
     little) replaced by the backdrop model. Arm layer = those pixels with a
     feathered alpha that fades out across the cut, so the moving edge blends into
     the static upper arm instead of ending in a visible line.
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "assets" / "andre-retrato-contato.png"
OUT = ROOT / "assets" / "3d"

# Box (pixels, in the 813x799 source) around the raised forearm and hand. Below
# SLEEVE_Y the sleeve is in the way, but it is shirt-blue and skin is not, so the
# box can stay wide there and the colour test alone separates arm from sleeve —
# which keeps the elbow whole instead of slicing it along a vertical line.
HAND_BOX_X1 = 236   # right edge above y = SLEEVE_Y
SLEEVE_Y = 430
FOREARM_X1 = 262    # right edge below y = SLEEVE_Y
ARM_Y1 = 600        # bottom: just past the elbow
PIVOT = (186, 560)  # the elbow, in source pixels


def disk(r: int) -> np.ndarray:
    y, x = np.ogrid[-r : r + 1, -r : r + 1]
    return x * x + y * y <= r * r


def backdrop_model(rgb: np.ndarray, figure: np.ndarray, sigma: float = 28.0) -> np.ndarray:
    """Normalised convolution: blur only the backdrop pixels, divide by the blurred mask."""
    w = (~figure).astype(np.float32)
    out = np.empty_like(rgb)
    for c in range(3):
        num = ndi.gaussian_filter(rgb[..., c] * w, sigma)
        den = ndi.gaussian_filter(w, sigma)
        out[..., c] = num / np.maximum(den, 1e-4)
    return out


def main() -> None:
    im = Image.open(SRC).convert("RGB")
    rgb = np.asarray(im, dtype=np.float32)
    h, w = rgb.shape[:2]

    # 1-2. figure vs backdrop, refined once with the backdrop model.
    corners = np.concatenate([rgb[:12, :12].reshape(-1, 3), rgb[:12, -12:].reshape(-1, 3)])
    figure = np.linalg.norm(rgb - np.median(corners, axis=0), axis=2) > 28
    figure = ndi.binary_dilation(figure, disk(6))
    bg = backdrop_model(rgb, figure)
    diff = np.linalg.norm(rgb - bg, axis=2)
    figure = diff > 16
    figure = ndi.binary_closing(figure, disk(2))

    # 3. the waving arm: figure pixels in the box that are not shirt-blue.
    yy, xx = np.mgrid[0:h, 0:w]
    box = ((yy < SLEEVE_Y) & (xx < HAND_BOX_X1) | (yy >= SLEEVE_Y) & (xx < FOREARM_X1)) & (yy < ARM_Y1) & (yy > 200)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    shirt = (b > r + 12) & (b > 140)
    arm = figure & box & ~shirt
    arm = ndi.binary_opening(arm, disk(1))
    lab, n = ndi.label(arm)
    if n == 0:
        raise SystemExit("no arm found — check the box constants")
    sizes = ndi.sum(arm, lab, range(1, n + 1))
    arm = lab == (int(np.argmax(sizes)) + 1)
    arm = ndi.binary_fill_holes(ndi.binary_closing(arm, disk(3)))

    # The elbow is a hinge: only the *forearm and hand* swing, the upper arm (which
    # runs from the elbow up to the sleeve) stays with the body. Split the arm along
    # a line through the pivot that bisects the forearm's direction (up, leaning
    # left) and the upper arm's (up and to the right).
    px, py = PIVOT
    side = 0.97 * (xx - px) + 0.25 * (yy - py)   # < 0: forearm side, > 0: upper-arm side
    forearm = arm & (side < 0)

    # 4a. base: the forearm (grown, to swallow its antialiased fringe) is replaced by
    # the backdrop model; the upper arm stays as it was.
    # The 14px strip right beside the cut keeps its arm pixels: when the forearm
    # swings away it uncovers *skin* there (as a bending elbow does), not backdrop.
    hole = ndi.binary_dilation(forearm, disk(4)) & (side < -14)
    base = np.where(hole[..., None], bg, rgb)

    # 4b. arm layer: opaque over the forearm, feathered 2px beyond its silhouette,
    # and faded out over 18px across the cut so the moving edge blends into the
    # static upper arm instead of ending in a visible line.
    dist = ndi.distance_transform_edt(~forearm)
    alpha = np.clip(1.0 - (dist - 1.0) / 2.0, 0, 1) * figure
    alpha = np.maximum(alpha, forearm.astype(np.float32))
    seam = arm & (side >= 0) & (side < 18)
    alpha = np.maximum(alpha, seam * np.clip(1.0 - side / 18.0, 0, 1))
    alpha = np.clip(alpha, 0, 1)
    rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)

    OUT.mkdir(exist_ok=True)
    Image.fromarray(np.clip(base, 0, 255).astype(np.uint8), "RGB").save(OUT / "andre-retrato-contato-base.webp", "WEBP", quality=90, method=6)
    Image.fromarray(rgba, "RGBA").save(OUT / "andre-retrato-contato-arm.webp", "WEBP", quality=90, method=6)
    # Debug previews (not shipped): the mask, and a rotated composite for eyeballing the seams.
    prev = OUT.parent / "depth"
    Image.fromarray((arm * 255).astype(np.uint8), "L").save(prev / "_arm-mask-preview.png")
    print(f"arm layer written. pivot px=({px},{py}) -> uv=({px / w:.3f}, {1 - py / h:.3f}); image {w}x{h}")


if __name__ == "__main__":
    main()
