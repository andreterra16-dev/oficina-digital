// Ambient types for the Design Component runtime (`support.js`, vendored —
// see that file's own "não editar" note; it is not part of this TS source
// tree and is not converted).
//
// `support.js` executes the compiled contents of `<script data-dc-script>`
// via `new Function("DCLogic", "StreamableLogic", "React", src + "...")` —
// i.e. `DCLogic` and `React` are injected as function parameters, not
// imported. These declarations describe that injected shape so
// `src/logic/component.ts` can be fully typed without pretending it imports
// a real module.

/**
 * Base class every Design Component's `class Component extends DCLogic`
 * builds on (`StreamableLogic` in `support.js`). `P` is the shape of
 * `this.props` (populated from the component's `data-props` editor
 * schema); `S` is the shape of `this.state`.
 */
declare class DCLogic<P extends object = Record<string, unknown>, S extends object = Record<string, unknown>> {
  props: P;
  state: S;
  constructor(props: P);
  setState(update: Partial<S> | ((state: S) => Partial<S>), callback?: () => void): void;
  forceUpdate(): void;
  componentDidMount?(): void;
  componentDidUpdate?(prevProps: P): void;
  componentWillUnmount?(): void;
  /**
   * The flat object the `.dc.html` template renders against (merged over
   * props). Typed as `object` rather than `Record<string, unknown>` on
   * purpose: the runtime reads this reflectively (any shape works), and a
   * plain `object` upper bound lets a subclass override with a precise,
   * closed interface — a `Record<string, unknown>` return type would
   * reject any override type that doesn't itself declare a string index
   * signature, which a well-typed `RenderVals` interface deliberately
   * shouldn't need.
   */
  renderVals(): object;
}

/**
 * The runtime hands the real React namespace (loaded from a CDN UMD build,
 * see `support.js`) to the compiled script as a function parameter — so it
 * is ambient here, not an ES import (an `import` would emit module code
 * this eval-based execution model can't run). Typed against the real
 * `react` package (see devDependency `@types/react`) so every
 * `React.createElement(...)` call below is checked against real DOM/SVG
 * prop types.
 */
declare const React: typeof import('react');
