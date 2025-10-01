import {
  DefaultTool,
  EdgelessLegacySlotIdentifier,
} from '@blocksuite/affine-block-surface';
import { EditorSettingProvider } from '@blocksuite/affine-shared/services';
import { on } from '@blocksuite/affine-shared/utils';
import type { PointerEventState } from '@blocksuite/std';
import { BaseTool, MouseButton, type ToolOptions } from '@blocksuite/std/gfx';
import { Signal } from '@preact/signals-core';

interface RestorablePresentToolOptions {
  mode?: string; // 'fit' | 'fill', simplified to string for local use
  restoredAfterPan?: boolean;
}

export type PanToolOption = {
  panning: boolean;
};

export class PanTool extends BaseTool<PanToolOption> {
  static override toolName = 'pan';

  private _lastPoint: [number, number] | null = null;

  readonly panning$ = new Signal<boolean>(false);

  override get allowDragWithRightButton(): boolean {
    return true;
  }

  override dragEnd(_: PointerEventState): void {
    this._lastPoint = null;
    this.panning$.value = false;
  }

  override dragMove(e: PointerEventState): void {
    if (!this._lastPoint) return;

    const { viewport } = this.gfx;
    const { zoom } = viewport;

    const [lastX, lastY] = this._lastPoint;
    const deltaX = lastX - e.x;
    const deltaY = lastY - e.y;

    this._lastPoint = [e.x, e.y];

    viewport.applyDeltaCenter(deltaX / zoom, deltaY / zoom);
  }

  override dragStart(e: PointerEventState): void {
    this._lastPoint = [e.x, e.y];
    this.panning$.value = true;
  }

  override mounted(): void {
    this.addHook('pointerDown', evt => {
      const editorSetting = this.std.getOptional(
        EditorSettingProvider
      )?.setting$;
      const activation =
        (editorSetting?.peek().edgelessPanActivation as
          | 'middle'
          | 'right'
          | undefined) ?? 'middle';

      const isMiddle = evt.raw.button === MouseButton.MIDDLE;
      const isRight = evt.raw.button === MouseButton.SECONDARY;
      const shouldPan =
        (activation === 'middle' && isMiddle) ||
        (activation === 'right' && isRight);

      if (!shouldPan) return;

      // prevent default to avoid native behaviors (e.g., context menu)
      evt.raw.preventDefault();

      const currentTool = this.controller.currentToolOption$.peek();
      const restoreToPrevious = () => {
        const { toolType, options: originalToolOptions } = currentTool;
        const selectionToRestore = this.gfx.selection.surfaceSelections;
        if (!toolType) return;
        // restore to DefaultTool if previous tool is CopilotTool
        if (toolType.toolName === 'copilot') {
          this.controller.setTool(DefaultTool);
          return;
        }

        let finalOptions: ToolOptions<BaseTool<any>> | undefined =
          originalToolOptions;
        if (toolType.toolName === 'frameNavigator') {
          // When restoring PresentTool (frameNavigator) after a temporary pan (e.g., via middle mouse button),
          // set 'restoredAfterPan' to true. This allows PresentTool to avoid an unwanted viewport reset
          // and maintain the panned position.
          const currentPresentOptions = originalToolOptions as
            | RestorablePresentToolOptions
            | undefined;
          finalOptions = {
            ...currentPresentOptions,
            restoredAfterPan: true,
          } as RestorablePresentToolOptions;
        }
        this.controller.setTool(toolType, finalOptions);
        this.gfx.selection.set(selectionToRestore);
      };

      // If in presentation mode, disable black background after middle/right mouse drag
      if (currentTool.toolType?.toolName === 'frameNavigator') {
        const slots = this.std.get(EdgelessLegacySlotIdentifier);
        slots.navigatorSettingUpdated.next({
          blackBackground: false,
        });
      }

      const activatePan = () =>
        this.controller.setTool(PanTool, {
          panning: true,
        });

      // For right-button activation, we must switch tool synchronously
      // to ensure ToolController sees allowDragWithRightButton at dragStart time.
      if (activation === 'right') {
        activatePan();
      } else {
        requestAnimationFrame(activatePan);
      }

      // Prevent native context menu while panning with right button
      const disposeContextMenu = on(document, 'contextmenu', e => {
        e.preventDefault();
      });

      const dispose = on(document, 'pointerup', evt => {
        const expectedButton =
          activation === 'right' ? MouseButton.SECONDARY : MouseButton.MIDDLE;
        if (evt.button === expectedButton) {
          restoreToPrevious();
        }
        dispose();
        disposeContextMenu();
      });

      return false;
    });
  }
}
