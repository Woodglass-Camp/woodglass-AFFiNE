import { GRIDMAP_GRID_SIZE } from '@blocksuite/affine-shared/consts';
import {
  DocModeProvider,
  GridSnapProvider,
} from '@blocksuite/affine-shared/services';
import { DisposableGroup } from '@blocksuite/global/disposable';
import { Bound } from '@blocksuite/global/gfx';
import { effect } from '@preact/signals-core';
import { LifeCycleWatcher } from '@blocksuite/std';
import {
  type DragExtensionInitializeContext,
  type ExtensionDragMoveContext,
  type ExtensionElementResizeContext,
  type ExtensionElementResizeMoveContext,
  type GfxController,
  GfxControllerIdentifier,
  type GfxModel,
  type GfxPrimitiveElementModel,
  InteractivityExtension,
  SurfaceMiddlewareBuilder,
} from '@blocksuite/std/gfx';

import type { SurfaceBlockModel } from '../surface-model';
import { EdgelessCRUDIdentifier } from './crud-extension';
import { EdgelessLegacySlotIdentifier } from './legacy-slot-extension';
import { isNoteBlock } from './query';

const GRIDMAP_MIN_SIZE = GRIDMAP_GRID_SIZE;
const GRIDMAP_SNAP_EPSILON = 0.5;
const GRIDMAP_EXCLUDED_TYPES = new Set([
  'connector',
  'mindmap',
  'brush',
  'highlighter',
]);

const GRIDMAP_NOTE_TYPE = 'affine:grid-note';

const computeGridSpan = (bound: Bound) => ({
  cols: Math.max(1, Math.round(bound.w / GRIDMAP_GRID_SIZE)),
  rows: Math.max(1, Math.round(bound.h / GRIDMAP_GRID_SIZE)),
});

const withGridSpanProps = <T extends Record<string, unknown>>(
  props: T,
  bound: Bound,
  type: string | undefined
): T => {
  if (type !== GRIDMAP_NOTE_TYPE) {
    return props;
  }

  return {
    ...props,
    grid: computeGridSpan(bound),
  };
};

const resolveElementType = (
  element: GfxPrimitiveElementModel | null
): string | undefined => {
  if (!element) {
    return undefined;
  }
  if (isNoteBlock(element)) {
    return element.flavour;
  }
  return element.type;
};

const snapPosition = (value: number) =>
  Math.round(value / GRIDMAP_GRID_SIZE) * GRIDMAP_GRID_SIZE;

const snapSize = (value: number) =>
  Math.max(
    GRIDMAP_MIN_SIZE,
    Math.ceil(value / GRIDMAP_GRID_SIZE) * GRIDMAP_GRID_SIZE
  );

const nearlyEqual = (a: number, b: number) =>
  Math.abs(a - b) < GRIDMAP_SNAP_EPSILON;

const boundsApproximatelyEqual = (a: Bound, b: Bound) =>
  nearlyEqual(a.x, b.x) &&
  nearlyEqual(a.y, b.y) &&
  nearlyEqual(a.w, b.w) &&
  nearlyEqual(a.h, b.h);

const snapBound = (bound: Bound) =>
  new Bound(
    snapPosition(bound.x),
    snapPosition(bound.y),
    snapSize(bound.w),
    snapSize(bound.h)
  );

const getPrimitiveElement = (
  model: GfxModel | null | undefined
): GfxPrimitiveElementModel | null => {
  if (!model) {
    return null;
  }
  if ('xywh' in model) {
    return model as GfxPrimitiveElementModel;
  }
  return null;
};

const shouldSnapElement = (
  element: GfxPrimitiveElementModel | null
): element is GfxPrimitiveElementModel => {
  if (!element) {
    return false;
  }
  if (GRIDMAP_EXCLUDED_TYPES.has(element.type)) {
    return false;
  }
  if (typeof element.rotate === 'number' && element.rotate !== 0) {
    return false;
  }
  return true;
};

const snapElement = (surface: SurfaceBlockModel, id: string) => {
  const element = getPrimitiveElement(surface.getElementById(id));
  if (!shouldSnapElement(element)) {
    return;
  }

  const currentBound = Bound.deserialize(element.xywh);
  const snapped = snapBound(currentBound);
  const elementType = resolveElementType(element);
  const shouldUpdateBound = !boundsApproximatelyEqual(currentBound, snapped);

  if (!shouldUpdateBound && elementType !== GRIDMAP_NOTE_TYPE) {
    return;
  }

  const serialized = snapped.serialize();
  surface.store.transact(() => {
    if (shouldUpdateBound) {
      element.yMap.set('xywh', serialized);
    }
    if (elementType === GRIDMAP_NOTE_TYPE) {
      element.yMap.set('grid', computeGridSpan(snapped));
    }
  });
};

const snapElements = (surface: SurfaceBlockModel) => {
  surface.elementModels.forEach(model => {
    const elementId = model?.model?.id;
    if (!elementId) {
      return;
    }
    snapElement(surface, elementId);
  });
};

const getSelectionBound = (
  elements: GfxPrimitiveElementModel[]
): Bound | null => {
  let bound: Bound | null = null;
  elements.forEach(model => {
    const elementBound = Bound.deserialize(model.xywh);
    bound = bound ? bound.unite(elementBound) : elementBound;
  });
  return bound;
};

const snapPropsWithElement = <T extends Record<string, unknown>>(
  props: T,
  element: GfxPrimitiveElementModel | null
): T => {
  if (!props || typeof props !== 'object') {
    return props;
  }
  if (!shouldSnapElement(element)) {
    return props;
  }

  const xywh = props.xywh;
  if (typeof xywh !== 'string') {
    return props;
  }

  const currentBound = Bound.deserialize(xywh);
  const snappedBound = snapBound(currentBound);
  const elementType = resolveElementType(element);

  if (boundsApproximatelyEqual(currentBound, snappedBound)) {
    return withGridSpanProps(props, snappedBound, elementType);
  }

  const updatedProps = {
    ...props,
    xywh: snappedBound.serialize(),
  };

  return withGridSpanProps(updatedProps, snappedBound, elementType);
};

const snapPropsWithType = <T extends Record<string, unknown>>(
  props: T,
  type: string | undefined
): T => {
  if (!props || typeof props !== 'object' || typeof props.xywh !== 'string') {
    return props;
  }
  if (type && GRIDMAP_EXCLUDED_TYPES.has(type)) {
    return props;
  }

  const currentBound = Bound.deserialize(props.xywh);
  const snappedBound = snapBound(currentBound);

  if (boundsApproximatelyEqual(currentBound, snappedBound)) {
    return withGridSpanProps(props, snappedBound, type);
  }

  const updatedProps = {
    ...props,
    xywh: snappedBound.serialize(),
  };

  return withGridSpanProps(updatedProps, snappedBound, type);
};

export class GridmapSurfaceMiddlewareBuilder extends SurfaceMiddlewareBuilder {
  static override key = 'gridmapGridSnap';

  protected isSnapEnabled(): boolean {
    const docMode = this.std.getOptional(DocModeProvider)?.getEditorMode?.();
    if (docMode === 'gridmap') {
      return true;
    }
    if (docMode === 'edgeless') {
      const provider = this.std.getOptional(GridSnapProvider);
      return provider?.enabled$.value ?? false;
    }
    const provider = this.std.getOptional(GridSnapProvider);
    return provider?.enabled$.value ?? true;
  }

  middleware = ctx => {
    if (!this.isSnapEnabled()) {
      return;
    }
    if (ctx.type !== 'beforeAdd') {
      return;
    }

    const { props, type } = ctx.payload;
    if (typeof props?.xywh !== 'string') {
      return;
    }

    ctx.payload.props = snapPropsWithType(props, type);
  };
}

export class GridmapSnapExtension extends InteractivityExtension {
  static override key = 'gridmap-snap-extension';

  protected isSnapEnabled(): boolean {
    const docMode = this.std.getOptional(DocModeProvider)?.getEditorMode?.();
    if (docMode === 'gridmap') {
      return true;
    }
    if (docMode === 'edgeless') {
      const provider = this.std.getOptional(GridSnapProvider);
      return provider?.enabled$.value ?? false;
    }
    const provider = this.std.getOptional(GridSnapProvider);
    return provider?.enabled$.value ?? true;
  }

  override mounted(): void {
    this.action.onDragInitialize((context: DragExtensionInitializeContext) => {
      if (!this.isSnapEnabled()) {
        return {};
      }
      const snappable = context.elements
        .map(element => getPrimitiveElement(element))
        .filter(shouldSnapElement);

      if (snappable.length === 0) {
        return {};
      }

      const selectionBound = getSelectionBound(snappable);
      if (!selectionBound) {
        return {};
      }

      return {
        onDragMove: (moveContext: ExtensionDragMoveContext) => {
          if (!this.isSnapEnabled()) {
            return;
          }
          const snappedDx =
            snapPosition(selectionBound.x + moveContext.dx) - selectionBound.x;
          const snappedDy =
            snapPosition(selectionBound.y + moveContext.dy) - selectionBound.y;

          moveContext.dx = snappedDx;
          moveContext.dy = snappedDy;
        },
      };
    });

    this.action.onElementResize((context: ExtensionElementResizeContext) => {
      const snappable = context.elements
        .map(element => getPrimitiveElement(element))
        .filter(shouldSnapElement);

      if (snappable.length === 0) {
        return {};
      }

      return {
        onResizeMove: (resizeContext: ExtensionElementResizeMoveContext) => {
          if (!this.isSnapEnabled()) {
            return {};
          }
          let nextScaleX = resizeContext.scaleX;
          let nextScaleY = resizeContext.scaleY;

          if (Math.abs(resizeContext.handleSign.x) > 0) {
            const currentWidth = resizeContext.originalBound.w * nextScaleX;
            if (
              Number.isFinite(currentWidth) &&
              resizeContext.originalBound.w
            ) {
              const snappedWidth = snapSize(Math.abs(currentWidth));
              const widthScale = snappedWidth / resizeContext.originalBound.w;
              nextScaleX = Math.sign(nextScaleX || 1) * widthScale;
            }
          }

          if (Math.abs(resizeContext.handleSign.y) > 0) {
            const currentHeight = resizeContext.originalBound.h * nextScaleY;
            if (
              Number.isFinite(currentHeight) &&
              resizeContext.originalBound.h
            ) {
              const snappedHeight = snapSize(Math.abs(currentHeight));
              const heightScale = snappedHeight / resizeContext.originalBound.h;
              nextScaleY = Math.sign(nextScaleY || 1) * heightScale;
            }
          }

          return {
            scaleX: Number.isFinite(nextScaleX)
              ? nextScaleX
              : resizeContext.scaleX,
            scaleY: Number.isFinite(nextScaleY)
              ? nextScaleY
              : resizeContext.scaleY,
          };
        },
      };
    });
  }
}

export class GridmapSurfaceLifecycleExtension extends LifeCycleWatcher {
  static override key = 'gridmap-surface-lifecycle';

  private readonly _snapDisposables = new DisposableGroup();
  private readonly _listenerDisposables = new DisposableGroup();
  private _setupScheduled = false;

  protected isSnapEnabled(): boolean {
    const docMode = this.std.getOptional(DocModeProvider)?.getEditorMode?.();
    if (docMode === 'gridmap') {
      return true;
    }
    if (docMode === 'edgeless') {
      const provider = this.std.getOptional(GridSnapProvider);
      return provider?.enabled$.value ?? false;
    }
    const provider = this.std.getOptional(GridSnapProvider);
    return provider?.enabled$.value ?? true;
  }

  override mounted(): void {
    this._scheduleSetup();
    const provider = this.std.getOptional(GridSnapProvider);
    if (provider) {
      const dispose = effect(() => {
        provider.enabled$.value;
        this._scheduleSetup();
      });
      this._listenerDisposables.add(() => dispose());
    }
  }

  override rendered(): void {
    this._scheduleSetup();
  }

  override unmounted(): void {
    this._snapDisposables.dispose();
    this._listenerDisposables.dispose();
  }

  private _scheduleSetup() {
    if (this._setupScheduled) {
      return;
    }
    this._setupScheduled = true;
    queueMicrotask(() => {
      this._setupScheduled = false;
      this._setup();
    });
  }

  private _setup() {
    this._snapDisposables.dispose();

    if (!this.isSnapEnabled()) {
      return;
    }

    let gfx;
    try {
      gfx = this.std.get(GfxControllerIdentifier);
    } catch {
      requestAnimationFrame(() => this._scheduleSetup());
      return;
    }
    const surface = gfx.surface as SurfaceBlockModel | null;
    if (!surface) {
      requestAnimationFrame(() => this._scheduleSetup());
      return;
    }

    this._setupSnapping(gfx, surface);
  }

  private _setupSnapping(gfx: GfxController, surface: SurfaceBlockModel) {
    const disposables = new DisposableGroup();

    const shouldSnap = () => this.isSnapEnabled();

    const snapById = (id: string) => {
      if (!shouldSnap()) return;
      snapElement(surface, id);
    };

    const snapLater = (id: string) => {
      if (!shouldSnap()) return;
      requestAnimationFrame(() => {
        if (!shouldSnap()) return;
        snapById(id);
      });
    };

    if (shouldSnap()) {
      snapElements(surface);
    }

    const elementAddedSub = surface.elementAdded.subscribe(({ id }) => {
      snapLater(id);
    });
    const elementUpdatedSub = surface.elementUpdated.subscribe(({ id }) => {
      snapLater(id);
    });
    const resizeEndSub = this.std
      .get(EdgelessLegacySlotIdentifier)
      .elementResizeEnd.subscribe(() => {
        snapElements(surface);
      });

    disposables.add(() => elementAddedSub.unsubscribe());
    disposables.add(() => elementUpdatedSub.unsubscribe());
    disposables.add(() => resizeEndSub.unsubscribe());

    const originalUpdate = gfx.updateElement.bind(gfx);
    gfx.updateElement = (element, props) => {
      const snappedProps = snapPropsWithElement(
        props as Record<string, unknown>,
        getPrimitiveElement(element)
      );
      return originalUpdate(element, snappedProps);
    };
    disposables.add(() => {
      gfx.updateElement = originalUpdate;
    });

    const crud =
      this.std.getOptional(EdgelessCRUDIdentifier) ??
      (() => {
        try {
          return this.std.get(EdgelessCRUDIdentifier);
        } catch {
          return null;
        }
      })();

    if (crud) {
      const originalAdd = crud.addElement.bind(crud);
      const originalUpdateElement = crud.updateElement.bind(crud);

      crud.addElement = (type, props) => {
        const result = originalAdd(type, snapPropsWithType(props, type));
        if (result) {
          snapLater(result);
        }
        return result;
      };
      crud.updateElement = (id, props) =>
        originalUpdateElement(
          id,
          snapPropsWithElement(
            props,
            getPrimitiveElement(surface.getElementById(id))
          )
        );

      disposables.add(() => {
        crud.addElement = originalAdd;
        crud.updateElement = originalUpdateElement;
      });
    }

    this._snapDisposables.add(() => disposables.dispose());
  }
}
