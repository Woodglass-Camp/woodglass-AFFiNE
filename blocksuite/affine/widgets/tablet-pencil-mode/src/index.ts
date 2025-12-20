import { EdgelessLegacySlotIdentifier } from '@blocksuite/affine-block-surface';
import type { RootBlockModel } from '@blocksuite/affine-model';
import { EditorSettingProvider } from '@blocksuite/affine-shared/services';
import { stopPropagation } from '@blocksuite/affine-shared/utils';
import { PenIcon } from '@blocksuite/icons/lit';
import type { PointerEventState } from '@blocksuite/std';
import { WidgetComponent, WidgetViewExtension } from '@blocksuite/std';
import { GfxControllerIdentifier } from '@blocksuite/std/gfx';
import { css, html } from 'lit';
import { state } from 'lit/decorators.js';
import { literal, unsafeStatic } from 'lit/static-html.js';

export const AFFINE_TABLET_PENCIL_MODE_WIDGET =
  'affine-tablet-pencil-mode-widget';

export class TabletPencilModeWidget extends WidgetComponent<RootBlockModel> {
  static override styles = css`
    :host {
      position: absolute;
      top: 16px;
      right: 16px;
      z-index: var(--affine-z-index-popover);
      font-family: var(--affine-font-family);
      pointer-events: none;
    }

    .tablet-pencil-toggle {
      pointer-events: auto;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: 18px;
      background-color: var(--affine-background-overlay-panel-color);
      border: 1px solid var(--affine-border-color);
      box-shadow: var(--affine-shadow-1);
      color: var(--affine-text-primary-color);
      font-size: 12px;
      font-weight: 500;
      line-height: 16px;
      cursor: pointer;
      transition:
        border-color 0.2s ease,
        color 0.2s ease;
    }

    .tablet-pencil-toggle[data-active='true'] {
      border-color: var(--affine-primary-color);
      color: var(--affine-primary-color);
    }

    .tablet-pencil-toggle:disabled {
      cursor: not-allowed;
      color: var(--affine-text-disable-color);
      border-color: var(--affine-border-color);
      opacity: 0.6;
    }

    .tablet-pencil-toggle__indicator {
      position: relative;
      width: 30px;
      height: 16px;
      border-radius: 999px;
      background-color: var(--affine-icon-secondary-color);
      transition: background-color 0.2s ease;
      flex-shrink: 0;
    }

    .tablet-pencil-toggle__indicator::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: var(--affine-background-primary-color);
      transition: transform 0.2s ease;
      box-shadow: var(--affine-shadow-1);
    }

    .tablet-pencil-toggle[data-active='true'] .tablet-pencil-toggle__indicator {
      background-color: var(--affine-primary-color);
    }

    .tablet-pencil-toggle[data-active='true']
      .tablet-pencil-toggle__indicator::after {
      transform: translateX(14px);
    }

    .tablet-pencil-toggle__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }
  `;

  private _dispose: (() => void) | null = null;
  @state()
  private accessor _enabled = false;
  private _activeTouchPan: {
    pointerId: number;
    lastX: number;
    lastY: number;
  } | null = null;
  private readonly _touchPointers = new Map<number, { x: number; y: number }>();
  private _pinchState: {
    startDistance: number;
    startZoom: number;
    smoothedZoom: number;
  } | null = null;
  private _pinchSmoothAlpha = 0.25;

  private _sortedTouchEntries() {
    return [...this._touchPointers.entries()].sort((a, b) => a[0] - b[0]);
  }

  private _setupPinchState() {
    if (this._touchPointers.size !== 2) {
      this._pinchState = null;
      return;
    }

    const entries = this._sortedTouchEntries();
    const [, firstPoint] = entries[0];
    const [, secondPoint] = entries[1];
    const dx = firstPoint.x - secondPoint.x;
    const dy = firstPoint.y - secondPoint.y;
    const distance = Math.hypot(dx, dy);
    this._pinchState = {
      startDistance: distance,
      startZoom: this._gfx.viewport.zoom,
      smoothedZoom: this._gfx.viewport.zoom,
    };
  }

  private get _gfx() {
    return this.std.get(GfxControllerIdentifier);
  }

  override connectedCallback(): void {
    super.connectedCallback();

    const setting = this.std.get(EditorSettingProvider);
    const sub = setting.setting$.subscribe(current => {
      this._applySetting(!!current.edgelessTabletPencilMode);
      const alpha = (current as any).edgelessPinchSmoothAlpha;
      if (typeof alpha === 'number' && isFinite(alpha)) {
        this._pinchSmoothAlpha = Math.max(0, Math.min(1, alpha));
      }
    });
    this.disposables.add({ dispose: () => sub.unsubscribe() });
    this.disposables.add({ dispose: () => this._clearHandlers() });

    const slots = this.std.get(EdgelessLegacySlotIdentifier);
    this.disposables.add(
      slots.readonlyUpdated.subscribe(() => {
        this._syncHandlers();
        this.requestUpdate();
      })
    );

    // init once
    const peek = setting.setting$.peek();
    this._applySetting(!!peek.edgelessTabletPencilMode);
    const alpha0 = (peek as any).edgelessPinchSmoothAlpha;
    if (typeof alpha0 === 'number' && isFinite(alpha0)) {
      this._pinchSmoothAlpha = Math.max(0, Math.min(1, alpha0));
    }
  }

  private _applySetting(enabled: boolean) {
    if (this._enabled !== enabled) {
      this._enabled = enabled;
    }
    this._syncHandlers();
  }

  private _syncHandlers() {
    const shouldEnable = this._enabled && !this.std.store.readonly;
    if (!shouldEnable) {
      this._clearHandlers();
      return;
    }

    if (this._dispose) {
      return;
    }

    const disposables: Array<() => void> = [];

    // Finger (touch) → only pan canvas; disable selection/click
    disposables.push(
      this.std.event.add('pointerDown', ctx => {
        const evt = ctx.get('pointerState') as PointerEventState;
        if (evt.raw.pointerType === 'touch') {
          this._touchPointers.set(evt.raw.pointerId, { x: evt.x, y: evt.y });
          if (this._touchPointers.size === 1) {
            this._activeTouchPan = {
              pointerId: evt.raw.pointerId,
              lastX: evt.x,
              lastY: evt.y,
            };
            this._pinchState = null;
          } else {
            this._activeTouchPan = null;
            this._setupPinchState();
          }
          evt.raw.preventDefault();
          return true;
        }
      })
    );
    disposables.push(
      this.std.event.add('click', ctx => {
        const evt = ctx.get('pointerState') as PointerEventState;
        if (evt.raw.pointerType === 'touch') {
          // block element selection by touch
          evt.raw.preventDefault();
          return true;
        }
      })
    );
    disposables.push(
      this.std.event.add('pointerMove', ctx => {
        const evt = ctx.get('pointerState') as PointerEventState;
        if (evt.raw.pointerType === 'touch') {
          this._touchPointers.set(evt.raw.pointerId, {
            x: evt.x,
            y: evt.y,
          });
        }

        const active = this._activeTouchPan;
        if (
          evt.raw.pointerType === 'touch' &&
          active &&
          active.pointerId === evt.raw.pointerId &&
          this._touchPointers.size === 1
        ) {
          const { viewport } = this._gfx;
          const viewScale = viewport.viewScale;
          const deltaX = active.lastX - evt.x;
          const deltaY = active.lastY - evt.y;
          this._activeTouchPan = {
            pointerId: active.pointerId,
            lastX: evt.x,
            lastY: evt.y,
          };
          viewport.applyDeltaCenter(
            deltaX / viewport.zoom / viewScale,
            deltaY / viewport.zoom / viewScale
          );
          evt.raw.preventDefault();
          return true;
        }

        if (evt.raw.pointerType === 'touch' && this._touchPointers.size >= 2) {
          evt.raw.preventDefault();

          if (!this._pinchState || this._touchPointers.size !== 2) {
            this._setupPinchState();
            return true;
          }

          const entries = this._sortedTouchEntries();
          const [, firstPoint] = entries[0];
          const [, secondPoint] = entries[1];

          const { startDistance, startZoom } = this._pinchState;
          const zoomStartDistance = startDistance;
          if (zoomStartDistance === 0) {
            return true;
          }

          const dx = firstPoint.x - secondPoint.x;
          const dy = firstPoint.y - secondPoint.y;
          const currentDistance = Math.hypot(dx, dy);
          const distanceDelta = currentDistance / zoomStartDistance;

          const { viewport } = this._gfx;
          let targetZoom = startZoom * distanceDelta;

          const centerView = {
            x: (firstPoint.x + secondPoint.x) / 2,
            y: (firstPoint.y + secondPoint.y) / 2,
          };

          const [centerModelX, centerModelY] = viewport.toModelCoord(
            centerView.x,
            centerView.y
          );
          // Apply slight smoothing to avoid jitter
          if (this._pinchState) {
            const sm =
              this._pinchState.smoothedZoom +
              this._pinchSmoothAlpha *
                (targetZoom - this._pinchState.smoothedZoom);
            this._pinchState.smoothedZoom = sm;
            targetZoom = sm;
          }
          viewport.setZoom(
            targetZoom,
            { x: centerModelX, y: centerModelY },
            undefined,
            true
          );
          return true;
        }
      })
    );
    const clearTouchPan = (evt: PointerEventState) => {
      if (evt.raw.pointerType !== 'touch') {
        return;
      }

      this._touchPointers.delete(evt.raw.pointerId);

      if (this._activeTouchPan?.pointerId === evt.raw.pointerId) {
        this._activeTouchPan = null;
      }

      if (this._touchPointers.size === 1) {
        const [id, point] = this._touchPointers.entries().next().value;
        this._activeTouchPan = {
          pointerId: id,
          lastX: point.x,
          lastY: point.y,
        };
        this._pinchState = null;
      } else {
        this._setupPinchState();
      }

      evt.raw.preventDefault();
      return true;
    };
    disposables.push(
      this.std.event.add('pointerUp', ctx =>
        clearTouchPan(ctx.get('pointerState') as PointerEventState)
      )
    );
    disposables.push(
      this.std.event.add('pointerOut', ctx =>
        clearTouchPan(ctx.get('pointerState') as PointerEventState)
      )
    );

    // store disposer
    this._dispose = () => {
      disposables.splice(0).forEach(off => off());
    };
  }

  private _clearHandlers() {
    if (this._dispose) {
      this._dispose();
      this._dispose = null;
    }
    this._activeTouchPan = null;
    this._touchPointers.clear();
    this._pinchState = null;
  }

  private _handleToggle(event: Event) {
    stopPropagation(event);
    event.preventDefault();

    if (this.std.store.readonly) {
      return;
    }

    const next = !this._enabled;
    const setting = this.std.get(EditorSettingProvider);
    if (setting.set) {
      setting.set('edgelessTabletPencilMode', next);
      this._applySetting(next);
    } else {
      this._applySetting(next);
    }
  }

  override render() {
    const readonly = this.std.store.readonly;

    return html`
      <button
        class="tablet-pencil-toggle"
        data-active=${this._enabled}
        aria-pressed=${this._enabled}
        type="button"
        ?disabled=${readonly}
        @click=${this._handleToggle}
        @pointerdown=${stopPropagation}
        @pointerup=${stopPropagation}
      >
        <span class="tablet-pencil-toggle__icon"
          >${PenIcon({ width: '16', height: '16' })}</span
        >
        <span>平板 Pencil 模式</span>
        <span class="tablet-pencil-toggle__indicator" aria-hidden="true"></span>
      </button>
    `;
  }
}

export const tabletPencilModeWidget = WidgetViewExtension(
  'affine:page',
  AFFINE_TABLET_PENCIL_MODE_WIDGET,
  literal`${unsafeStatic(AFFINE_TABLET_PENCIL_MODE_WIDGET)}`
);

declare global {
  interface HTMLElementTagNameMap {
    [AFFINE_TABLET_PENCIL_MODE_WIDGET]: TabletPencilModeWidget;
  }
}
