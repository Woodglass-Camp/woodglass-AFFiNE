import {
  type ViewExtensionContext,
  ViewExtensionProvider,
} from '@blocksuite/affine-ext-loader';
import { EdgelessToolbarWidget } from '@blocksuite/affine-widget-edgeless-toolbar';
import { WidgetViewExtension } from '@blocksuite/std';
import { literal, unsafeStatic } from 'lit/static-html.js';

export const GRIDMAP_TOOLBAR_TAG = 'gridmap-toolbar-widget';
export const GRIDMAP_NOTE_CHILD_FLAVOUR = 'affine:paragraph';
export const GRIDMAP_NOTE_CHILD_TYPE = 'text';
export const GRIDMAP_NOTE_TIP = 'Text';

function defineGridmapToolbarElement() {
  if (customElements.get(GRIDMAP_TOOLBAR_TAG)) {
    return;
  }
  class GridmapToolbarWidget extends EdgelessToolbarWidget {}
  customElements.define(GRIDMAP_TOOLBAR_TAG, GridmapToolbarWidget);
}

const gridmapToolbarWidget = WidgetViewExtension(
  'affine:page',
  GRIDMAP_TOOLBAR_TAG,
  literal`${unsafeStatic(GRIDMAP_TOOLBAR_TAG)}`
);

export class GridmapToolbarViewExtension extends ViewExtensionProvider {
  override name = 'affine-gridmap-toolbar-widget';

  override effect() {
    super.effect();
    defineGridmapToolbarElement();
  }

  override setup(context: ViewExtensionContext) {
    super.setup(context);
    if (context.scope === 'gridmap') {
      context.register(gridmapToolbarWidget);
    }
  }
}
