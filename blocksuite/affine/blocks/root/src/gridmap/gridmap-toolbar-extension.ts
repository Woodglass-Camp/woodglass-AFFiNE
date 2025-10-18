import {
  type ViewExtensionContext,
  ViewExtensionProvider,
} from '@blocksuite/affine-ext-loader';
import {
  EdgelessToolbarWidget,
  edgelessToolbarWidget,
} from '@blocksuite/affine-widget-edgeless-toolbar';

export const GRIDMAP_NOTE_CHILD_FLAVOUR = 'affine:paragraph';
export const GRIDMAP_NOTE_CHILD_TYPE = 'text';
export const GRIDMAP_NOTE_TIP = 'Text';

export class GridmapToolbarViewExtension extends ViewExtensionProvider {
  override name = 'affine-gridmap-toolbar-widget';

  override effect(): void {
    super.effect();
    if (!customElements.get('affine-edgeless-toolbar')) {
      // effects() registers the custom element; this mimics the original registration.
      customElements.define('affine-edgeless-toolbar', EdgelessToolbarWidget);
    }
  }

  override setup(context: ViewExtensionContext) {
    super.setup(context);
    if (context.scope === 'gridmap') {
      context.register(edgelessToolbarWidget);
    }
  }
}
