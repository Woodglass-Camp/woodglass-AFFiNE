import { GridmapToolbarWidget } from './gridmap-toolbar.js';

export function effects() {
  customElements.define('gridmap-toolbar-widget', GridmapToolbarWidget);
}

declare global {
  interface HTMLElementTagNameMap {
    'gridmap-toolbar-widget': GridmapToolbarWidget;
  }
}
