import {
  type ViewExtensionContext,
  ViewExtensionProvider,
} from '@blocksuite/affine-ext-loader';
import { edgelessToolbarWidget } from '@blocksuite/affine-widget-edgeless-toolbar';
import { effects as registerEdgelessToolbarElements } from '../../../../widgets/edgeless-toolbar/src/effects.js';

export const GRIDMAP_NOTE_CHILD_FLAVOUR = 'affine:paragraph';
export const GRIDMAP_NOTE_CHILD_TYPE = 'text';
export const GRIDMAP_NOTE_TIP = 'Text';

export class GridmapToolbarViewExtension extends ViewExtensionProvider {
  override name = 'affine-gridmap-toolbar-widget';

  override effect(): void {
    super.effect();
    registerEdgelessToolbarElements();
  }

  override setup(context: ViewExtensionContext) {
    super.setup(context);
    if (context.scope === 'gridmap') {
      context.register(edgelessToolbarWidget);
    }
  }
}
