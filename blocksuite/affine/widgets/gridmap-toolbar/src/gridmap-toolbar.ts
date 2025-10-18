import { DefaultTool } from '@blocksuite/affine-block-surface';
import type { RootBlockModel } from '@blocksuite/affine-model';
import { NoteTool } from '@blocksuite/affine-gfx-note';
import {
  GRIDMAP_NOTE_CHILD_FLAVOUR,
  GRIDMAP_NOTE_CHILD_TYPE,
  GRIDMAP_NOTE_TIP,
} from '@blocksuite/affine-block-root';
import { WidgetComponent } from '@blocksuite/std';
import { GfxControllerIdentifier } from '@blocksuite/std/gfx';
import { css, html } from 'lit';
import { state } from 'lit/decorators.js';

export class GridmapToolbarWidget extends WidgetComponent<RootBlockModel> {
  static override styles = css`
    :host {
      position: absolute;
      left: 50%;
      bottom: 24px;
      transform: translateX(-50%);
      pointer-events: none;
      font-family: var(--affine-font-family);
      z-index: var(--affine-z-index-toolbar, 1);
    }

    .toolbar {
      display: inline-flex;
      gap: 12px;
      padding: 10px 16px;
      border-radius: 999px;
      background: var(--affine-background-overlay-panel-color);
      box-shadow: var(--affine-shadow-2);
      border: 1px solid var(--affine-border-color, rgba(0, 0, 0, 0.08));
      pointer-events: auto;
      align-items: center;
    }

    button {
      appearance: none;
      outline: none;
      border: 0;
      border-radius: 999px;
      padding: 6px 14px;
      font-size: 13px;
      font-weight: 500;
      background: transparent;
      color: var(--affine-text-primary-color);
      cursor: pointer;
      transition: background-color 0.2s ease, color 0.2s ease;
    }

    button:hover {
      background: var(--affine-hover-color);
    }

    button[data-active='true'] {
      background: var(--affine-primary-color);
      color: var(--affine-on-primary-color, #fff);
    }

    .divider {
      width: 1px;
      height: 18px;
      background: var(--affine-border-color, rgba(0, 0, 0, 0.08));
      opacity: 0.7;
    }
  `;

  @state()
  private accessor _activeToolName = '';

  private get _gfx() {
    return this.std.get(GfxControllerIdentifier);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    const tool = this._gfx.tool;
    this._activeToolName = tool.currentToolName$.peek();
    this.disposables.add(
      tool.currentToolName$.subscribe(name => {
        this._activeToolName = name;
      })
    );
  }

  private _activateDefault = () => {
    if (this._gfx.selection.editing) {
      return;
    }
    this._gfx.tool.setTool(DefaultTool);
  };

  private _activateNote = () => {
    if (this._gfx.selection.editing) {
      return;
    }
    this._gfx.tool.setTool(NoteTool, {
      childFlavour: GRIDMAP_NOTE_CHILD_FLAVOUR,
      childType: GRIDMAP_NOTE_CHILD_TYPE,
      tip: GRIDMAP_NOTE_TIP,
    });
  };

  override render() {
    const defaultActive = this._activeToolName === DefaultTool.toolName;
    const noteActive = this._activeToolName === NoteTool.toolName;

    return html`
      <div class="toolbar">
        <button
          type="button"
          data-active=${defaultActive}
          @click=${this._activateDefault}
        >
          Select
        </button>
        <div class="divider"></div>
        <button
          type="button"
          data-active=${noteActive}
          @click=${this._activateNote}
        >
          Note
        </button>
      </div>
    `;
  }
}

export const gridmapToolbarWidget = {
  mount: (host: Element) => {
    const widget = document.createElement('gridmap-toolbar-widget');
    host.append(widget);
    return () => {
      widget.remove();
    };
  },
};
