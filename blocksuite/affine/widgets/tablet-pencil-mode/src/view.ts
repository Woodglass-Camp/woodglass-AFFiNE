import {
  type ViewExtensionContext,
  ViewExtensionProvider,
} from '@blocksuite/affine-ext-loader';

import { effects } from './effects';
import { tabletPencilModeWidget } from './index';

export class TabletPencilModeViewExtension extends ViewExtensionProvider {
  override name = 'affine-tablet-pencil-mode-widget';

  override effect() {
    super.effect();
    effects();
  }

  override setup(context: ViewExtensionContext) {
    super.setup(context);
    if (this.isEdgeless(context.scope)) {
      context.register(tabletPencilModeWidget);
    }
  }
}
