import {
  DefaultTool,
  normalizeWheelDeltaY,
  type SurfaceBlockComponent,
  type SurfaceBlockModel,
} from '@blocksuite/affine-block-surface';
import { PanTool } from '@blocksuite/affine-gfx-pointer';
import { type RootBlockModel } from '@blocksuite/affine-model';
import { GRIDMAP_GRID_SIZE } from '@blocksuite/affine-shared/consts';
import {
  FontLoaderService,
  ThemeProvider,
  ViewportElementProvider,
} from '@blocksuite/affine-shared/services';
import {
  isTouchPadPinchEvent,
  requestConnectedFrame,
  requestThrottledConnectedFrame,
} from '@blocksuite/affine-shared/utils';
import { IS_WINDOWS } from '@blocksuite/global/env';
import { Point, Vec } from '@blocksuite/global/gfx';
import {
  BlockComponent,
  type GfxBlockComponent,
  type UIEventHandler,
} from '@blocksuite/std';
import {
  GfxControllerIdentifier,
  type GfxViewportElement,
} from '@blocksuite/std/gfx';
import { effect } from '@preact/signals-core';
import { css, html } from 'lit';
import { query } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import type { EdgelessRootService } from '../edgeless/edgeless-root-service.js';
import { isCanvasElement } from '../edgeless/utils/query.js';
import { GridmapPageKeyboardManager } from './gridmap-keyboard.js';

export class GridmapRootBlockComponent extends BlockComponent<
  RootBlockModel,
  EdgelessRootService
> {
  keyboardManager: GridmapPageKeyboardManager | null = null;

  static override styles = css`
    affine-gridmap-root {
      -webkit-user-select: none;
      user-select: none;
      display: block;
      height: 100%;
      touch-action: none;
      --affine-gridmap-cell-size: ${GRIDMAP_GRID_SIZE}px;
    }

    .widgets-container {
      position: absolute;
      left: 0;
      top: 0;
      pointer-events: none;
      contain: size layout;
      height: 100%;
      width: 100%;
    }

    .widgets-container > * {
      pointer-events: auto;
    }

    .gridmap-background {
      height: 100%;
      background-color: var(--affine-background-primary-color);
      background-image:
        linear-gradient(
          to right,
          var(--affine-gridmap-grid-color, rgba(0, 0, 0, 0.24)) 1px,
          transparent 1px
        ),
        linear-gradient(
          to bottom,
          var(--affine-gridmap-grid-color, rgba(0, 0, 0, 0.24)) 1px,
          transparent 1px
        );
    }

    .gridmap-container {
      color: var(--affine-text-primary-color);
      position: relative;
    }

    @media print {
      .selected {
        background-color: transparent !important;
      }
    }
  `;

  private readonly _refreshLayerViewport = requestThrottledConnectedFrame(
    () => {
      const { viewport } = this.gfx;
      const { zoom, translateX, translateY, viewScale } = viewport;

      if (this.backgroundElm) {
        const size = GRIDMAP_GRID_SIZE * zoom * viewScale;
        this.backgroundElm.style.setProperty(
          'background-position',
          `${translateX}px ${translateY}px`
        );
        this.backgroundElm.style.setProperty(
          'background-size',
          `${size}px ${size}px`
        );
      }
    },
    this
  );

  private _resizeObserver: ResizeObserver | null = null;

  get gfx() {
    return this.std.get(GfxControllerIdentifier);
  }

  get surfaceBlockModel() {
    return this.model.children.find(
      child => child.flavour === 'affine:surface'
    ) as SurfaceBlockModel;
  }

  get viewportElement(): HTMLElement {
    return this.std.get(ViewportElementProvider).viewportElement;
  }

  get fontLoader() {
    return this.std.get(FontLoaderService);
  }

  private _initFontLoader() {
    this.fontLoader.ready
      .then(() => {
        this.surface.refresh();
      })
      .catch(console.error);
  }

  private _initLayerUpdateEffect() {
    const updateLayers = requestThrottledConnectedFrame(() => {
      const blocks = Array.from(
        this.gfxViewportElm.children as HTMLCollectionOf<GfxBlockComponent>
      );

      blocks.forEach((block: GfxBlockComponent) => {
        block.updateZIndex?.();
      });
    });

    this._disposables.add(
      this.gfx.layer.slots.layerUpdated.subscribe(() => updateLayers())
    );
  }

  private _initPanEvent() {
    this.disposables.add(
      this.std.event.add('pan', ctx => {
        const { viewport } = this.gfx;
        if (viewport.locked) return;

        const multiPointersState = ctx.get('multiPointerState');
        const [p1, p2] = multiPointersState.pointers;

        const dx =
          (0.25 * (p1.delta.x + p2.delta.x)) /
          viewport.zoom /
          viewport.viewScale;
        const dy =
          (0.25 * (p1.delta.y + p2.delta.y)) /
          viewport.zoom /
          viewport.viewScale;

        // direction is opposite
        viewport.applyDeltaCenter(-dx, -dy);
      })
    );
  }

  private _initPinchEvent() {
    this.disposables.add(
      this.std.event.add('pinch', ctx => {
        const { viewport } = this.gfx;
        if (viewport.locked) return;

        const multiPointersState = ctx.get('multiPointerState');
        const [p1, p2] = multiPointersState.pointers;

        const currentCenter = new Point(
          0.5 * (p1.x + p2.x),
          0.5 * (p1.y + p2.y)
        );

        const distanceBefore =
          multiPointersState.prevPinchState?.distance ??
          Vec.distance(p1.prevPosition, p2.prevPosition);
        const distanceNow = Vec.distance(p1.position, p2.position);

        const delta = distanceNow - distanceBefore;

        const zoomFactor = 1 + normalizeWheelDeltaY(delta / 1024);

        viewport.zoomToPoint(zoomFactor, currentCenter.toTuple());
      })
    );
  }

  private _initWheelEvent() {
    this.disposables.add(
      this.std.event.add('wheel', ctx => {
        const state = ctx.get('defaultState');
        const event = state?.event as WheelEvent | undefined;
        if (!event) {
          return;
        }

        event.preventDefault();

        const { viewport } = this.gfx;
        if (viewport.locked) return;

        const isZoomGesture =
          isTouchPadPinchEvent(event) || event.ctrlKey || event.metaKey;

        if (isZoomGesture) {
          const rect = this.getBoundingClientRect();
          const [baseX, baseY] = this.gfx.viewport.toModelCoord(
            event.clientX - rect.x,
            event.clientY - rect.y
          );
          const zoom = normalizeWheelDeltaY(event.deltaY, viewport.zoom);
          viewport.setZoom(zoom, new Point(baseX, baseY), true);
          return;
        }

        const simulateHorizontalScroll = IS_WINDOWS && event.shiftKey;
        const dx = simulateHorizontalScroll
          ? event.deltaY / viewport.zoom
          : event.deltaX / viewport.zoom;
        const dy = simulateHorizontalScroll ? 0 : event.deltaY / viewport.zoom;

        viewport.applyDeltaCenter(dx, dy);
        viewport.viewportMoved.next([dx, dy]);
      })
    );
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.keyboardManager = new GridmapPageKeyboardManager(this);
    this._initFontLoader();
    this._observeTheme();
  }

  override disconnectedCallback(): void {
    this._resizeObserver?.disconnect();
    this.keyboardManager = null;
    super.disconnectedCallback();
  }

  override firstUpdated() {
    this._initResizeEffect();
    this._initPixelRatioChangeEffect();
    this._initFontLoader();
    this._initRemoteCursor();
    this._initLayerUpdateEffect();
    this._initSlotEffects();

    this._initWheelEvent();
    this._initPanEvent();
    this._initPinchEvent();

    if (this.store.readonly) {
      this.gfx.tool.setTool(PanTool, { panning: true });
    } else {
      this.gfx.tool.setTool(DefaultTool);
    }

    this.gfx.viewport.elementReady.next(this.gfxViewportElm);

    requestConnectedFrame(() => {
      this.requestUpdate();
    }, this);

    this._disposables.add(
      this.gfx.viewport.viewportUpdated.subscribe(() => {
        this._refreshLayerViewport();
      })
    );

    this._refreshLayerViewport();
  }

  override renderBlock() {
    const widgets = repeat(
      Object.entries(this.widgets),
      ([id]) => id,
      ([_, widget]) => widget
    );

    return html`
      <div class="gridmap-background gridmap-container">
        <gfx-viewport
          .maxConcurrentRenders=${6}
          .viewport=${this.gfx.viewport}
          .getModelsInViewport=${() => {
            const blocks = this.gfx.grid.search(
              this.gfx.viewport.viewportBounds,
              {
                useSet: true,
                filter: ['block'],
              }
            );

            return blocks;
          }}
          .host=${this.host}
        >
          ${this.renderChildren(this.model)}
          ${this.renderChildren(this.surfaceBlockModel)}
        </gfx-viewport>
      </div>

      <div class="gridmap-mount-point"></div>

      <div class="widgets-container">${widgets}</div>
    `;
  }

  @query('.gridmap-background')
  accessor backgroundElm: HTMLDivElement | null = null;

  @query('gfx-viewport')
  accessor gfxViewportElm!: GfxViewportElement;

  @query('.gridmap-mount-point')
  accessor mountElm: HTMLDivElement | null = null;

  @query('affine-surface')
  accessor surface!: SurfaceBlockComponent;

  private _initRemoteCursor() {
    const overlay = this.std.getOptional(ThemeProvider);
    if (!overlay) {
      return;
    }
    this._disposables.add(
      effect(() => {
        const prefersDark = overlay.edgeless$.value === 'dark';
        const color = prefersDark
          ? 'rgba(255, 255, 255, 0.42)'
          : 'rgba(0, 0, 0, 0.26)';
        this.style.setProperty('--affine-edgeless-grid-color', color);
        this.style.setProperty('--affine-gridmap-grid-color', color);
      })
    );
  }

  private _observeTheme() {
    const overlay = this.std.getOptional(ThemeProvider);
    if (!overlay) {
      return;
    }

    this._disposables.add(
      effect(() => {
        const theme = overlay.edgeless$.value;
        this.dataset.theme = theme;
      })
    );
  }

  private _initPixelRatioChangeEffect() {
    const { viewport } = this.gfx;
    const recalibrateBackground = requestThrottledConnectedFrame(() => {
      this._refreshLayerViewport();
    });

    this._disposables.add(
      viewport.viewportUpdated.subscribe(() => {
        recalibrateBackground();
      })
    );
  }

  private _initResizeEffect() {
    const resizeObserver = new ResizeObserver(() => {
      this.gfx.selection.set(this.gfx.selection.surfaceSelections);
      this.gfx.viewport.onResize();
    });

    resizeObserver.observe(this.viewportElement);
    this._resizeObserver = resizeObserver;
  }

  private _initSlotEffects() {
    this._disposables.add(
      this.std.get(ThemeProvider).theme$.subscribe(() => this.surface.refresh())
    );

    this._disposables.add(
      effect(() => {
        this.style.cursor = this.gfx.cursor$.value;
      })
    );
  }

  override handlePointerDown(event: PointerEvent) {
    if (event.defaultPrevented) return;
    if (isCanvasElement(event.target as Element, this.surface)) {
      event.stopPropagation();
      this.surface.deselectAll();
    }
  }

  private _handleViewportClick(event: PointerEvent) {
    if (this.surface.selection.nonEmpty) {
      event.preventDefault();
    }

    this.surface.selection.set({
      editing: false,
      elements: [],
    });
  }

  override renderChildren(model: RootBlockModel | SurfaceBlockModel) {
    const children = super.renderChildren(model);
    if (!(model.flavour === 'affine:surface')) {
      return children;
    }

    return html`
      <div class="gridmap-surface" @click=${this._handleViewportClick}>
        ${children}
      </div>
    `;
  }

  override renderWidget(_: string) {
    return null;
  }
}
