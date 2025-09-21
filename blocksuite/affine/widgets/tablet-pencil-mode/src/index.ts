import { BrushTool } from '@blocksuite/affine-gfx-brush';
import { PanTool } from '@blocksuite/affine-gfx-pointer';
import type { RootBlockModel } from '@blocksuite/affine-model';
import { EditorSettingProvider } from '@blocksuite/affine-shared/services';
import type { PointerEventState } from '@blocksuite/std';
import { WidgetComponent, WidgetViewExtension } from '@blocksuite/std';
import { GfxControllerIdentifier } from '@blocksuite/std/gfx';
import { nothing } from 'lit';
import { literal, unsafeStatic } from 'lit/static-html.js';

export const AFFINE_TABLET_PENCIL_MODE_WIDGET =
  'affine-tablet-pencil-mode-widget';

export class TabletPencilModeWidget extends WidgetComponent<RootBlockModel> {
  private _dispose: (() => void) | null = null;

  private get _gfx() {
    return this.std.get(GfxControllerIdentifier);
  }

  override connectedCallback(): void {
    super.connectedCallback();

    const setting = this.std.get(EditorSettingProvider);
    const sub = setting.setting$.subscribe(current => {
      const enabled = !!current.edgelessTabletPencilMode;
      this._toggle(enabled);
    });
    this.disposables.add({ dispose: () => sub.unsubscribe() });
    // init once
    this._toggle(!!setting.setting$.peek().edgelessTabletPencilMode);
  }

  private _toggle(enabled: boolean) {
    // clean previous handlers
    if (this._dispose) {
      this._dispose();
      this._dispose = null;
    }
    if (!enabled) return;

    const disposables: Array<() => void> = [];

    // Finger (touch) → only pan canvas; disable selection/click
    disposables.push(
      this.std.event.add('pointerDown', ctx => {
        const evt = ctx.get('pointerState') as PointerEventState;
        if (evt.raw.pointerType === 'touch') {
          this._gfx.tool.setTool(PanTool, { panning: true });
          evt.raw.preventDefault();
          return false;
        }
      })
    );
    disposables.push(
      this.std.event.add('click', ctx => {
        const evt = ctx.get('pointerState') as PointerEventState;
        if (evt.raw.pointerType === 'touch') {
          // block element selection by touch
          evt.raw.preventDefault();
          return false;
        }
      })
    );

    // Pencil (pen) → force Brush tool，禁止其它操作
    disposables.push(
      this.std.event.add('pointerDown', ctx => {
        const evt = ctx.get('pointerState') as PointerEventState;
        if (
          evt.raw.pointerType === 'pen' &&
          this._gfx.tool.currentToolName$.peek() !== BrushTool.toolName
        ) {
          this._gfx.tool.setTool(BrushTool);
        }
      })
    );
    disposables.push(
      this.std.event.add('click', ctx => {
        const evt = ctx.get('pointerState') as PointerEventState;
        if (
          evt.raw.pointerType === 'pen' &&
          this._gfx.tool.currentToolName$.peek() !== BrushTool.toolName
        ) {
          evt.raw.preventDefault();
          return false;
        }
      })
    );

    // store disposer
    this._dispose = () => {
      disposables.splice(0).forEach(off => off());
    };
  }

  override render() {
    // no UI element
    return nothing;
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
