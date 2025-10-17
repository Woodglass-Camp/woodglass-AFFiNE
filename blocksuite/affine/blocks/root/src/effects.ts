import {
  EdgelessRootBlockComponent,
  EdgelessRootPreviewBlockComponent,
  GridmapRootBlockComponent,
  PageRootBlockComponent,
  PreviewRootBlockComponent,
} from './index.js';

export function effects() {
  // Register components by category
  registerRootComponents();
}

function registerRootComponents() {
  customElements.define('affine-page-root', PageRootBlockComponent);
  customElements.define('affine-preview-root', PreviewRootBlockComponent);
  customElements.define('affine-edgeless-root', EdgelessRootBlockComponent);
  customElements.define(
    'affine-edgeless-root-preview',
    EdgelessRootPreviewBlockComponent
  );
  customElements.define('affine-gridmap-root', GridmapRootBlockComponent);
}

declare global {
  interface HTMLElementTagNameMap {
    'affine-edgeless-root': EdgelessRootBlockComponent;
    'affine-page-root': PageRootBlockComponent;
    'affine-gridmap-root': GridmapRootBlockComponent;
  }
}
