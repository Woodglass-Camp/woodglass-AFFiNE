import type { ViewExtensionContext } from '@blocksuite/affine-ext-loader';
import { edgelessToolbarWidget } from '@blocksuite/affine-widget-edgeless-toolbar';
import { EdgelessToolbarViewExtension } from '@blocksuite/affine-widget-edgeless-toolbar/view';

export const GRIDMAP_NOTE_CHILD_FLAVOUR = 'affine:paragraph';
export const GRIDMAP_NOTE_CHILD_TYPE = 'text';
export const GRIDMAP_NOTE_TIP = 'Text';

export class GridmapToolbarViewExtension extends EdgelessToolbarViewExtension {
  override name = 'affine-gridmap-toolbar-widget';

  override setup(context: ViewExtensionContext) {
    super.setup(context);
    if (context.scope === 'gridmap') {
      context.register(edgelessToolbarWidget);
    }
  }
}
