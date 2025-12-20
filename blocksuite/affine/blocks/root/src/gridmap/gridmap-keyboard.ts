import { DefaultTool } from '@blocksuite/affine-block-surface';
import { NoteTool } from '@blocksuite/affine-gfx-note';
import {
  type BaseTool,
  type ToolOptions,
  type ToolType,
} from '@blocksuite/std/gfx';

import { PageKeyboardManager } from '../keyboard/keyboard-manager.js';
import type { GridmapRootBlockComponent } from './gridmap-root-block.js';
import {
  GRIDMAP_NOTE_CHILD_FLAVOUR,
  GRIDMAP_NOTE_CHILD_TYPE,
  GRIDMAP_NOTE_TIP,
} from './gridmap-toolbar-extension.js';

export class GridmapPageKeyboardManager extends PageKeyboardManager {
  constructor(rootComponent: GridmapRootBlockComponent) {
    super(rootComponent);
    rootComponent.bindHotKey(
      {
        v: () => {
          this._setTool(DefaultTool);
        },
        n: () => {
          this._setTool(NoteTool, {
            childFlavour: GRIDMAP_NOTE_CHILD_FLAVOUR,
            childType: GRIDMAP_NOTE_CHILD_TYPE,
            tip: GRIDMAP_NOTE_TIP,
          });
        },
      },
      { global: true }
    );
  }

  private _setTool<T extends BaseTool>(
    tool: ToolType<T>,
    options?: ToolOptions<T>
  ) {
    if (this.rootComponent.gfx.selection.editing) {
      return;
    }

    this.rootComponent.gfx.tool.setTool(tool, options);
  }
}
