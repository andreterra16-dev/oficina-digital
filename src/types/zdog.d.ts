// Zdog ships no type definitions and has no @types package, so this declares
// just the slice of its API <zdog-orbit> uses. Zdog's own options are plain
// property bags assigned onto the shape, hence the open index signatures.
declare module 'zdog' {
  class Anchor {
    constructor(options?: Record<string, unknown>);
    translate: { x: number; y: number; z: number };
    rotate: { x: number; y: number; z: number };
  }
  class Shape extends Anchor { color: string; [k: string]: unknown }
  class Illustration extends Anchor {
    zoom: number;
    setSize(width: number, height: number): void;
    updateRenderGraph(): void;
  }
  const Zdog: {
    Anchor: typeof Anchor;
    Shape: typeof Shape;
    Illustration: typeof Illustration;
    Box: typeof Shape;
    Ellipse: typeof Shape;
    Polygon: typeof Shape;
  };
  namespace Zdog { type Anchor = InstanceType<typeof Zdog.Anchor>; type Shape = InstanceType<typeof Zdog.Shape>; type Illustration = InstanceType<typeof Zdog.Illustration> }
  export default Zdog;
}
