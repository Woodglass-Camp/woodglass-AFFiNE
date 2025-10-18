import { edgelessToolbarWidget } from '@blocksuite/affine-widget-edgeless-toolbar';
import { EdgelessToolbarViewExtension } from '@blocksuite/affine-widget-edgeless-toolbar/view';

export const GRIDMAP_NOTE_CHILD_FLAVOUR = 'affine:paragraph';
export const GRIDMAP_NOTE_CHILD_TYPE = 'text';
export const GRIDMAP_NOTE_TIP = 'Text';

let toolbarElementsRegistered = false;

export const registerGridmapToolbar = () => {
  if (!toolbarElementsRegistered) {
    // ensure the custom elements used by edgeless toolbar are registered
    new EdgelessToolbarViewExtension().effect();
    toolbarElementsRegistered = true;
  }
  return edgelessToolbarWidget;
};
