import {
  type ViewExtensionContext,
  ViewExtensionProvider,
} from '@blocksuite/affine-ext-loader';

import { gridmapToolbarWidget } from './gridmap-toolbar.js';
import { effects } from './effects.js';

export class GridmapToolbarViewExtension extends ViewExtensionProvider {
  override name = 'affine-gridmap-toolbar-widget';

  override effect() {
    super.effect();
    effects();
  }

  override setup(context: ViewExtensionContext) {
    super.setup(context);
    if (context.scope === 'gridmap') {
      context.register(gridmapToolbarWidget);
    }
  }
}
