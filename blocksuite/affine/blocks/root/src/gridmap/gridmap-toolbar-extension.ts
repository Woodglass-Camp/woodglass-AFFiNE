import { edgelessToolbarWidget } from '@blocksuite/affine-widget-edgeless-toolbar';

export const GRIDMAP_NOTE_CHILD_FLAVOUR = 'affine:paragraph';
export const GRIDMAP_NOTE_CHILD_TYPE = 'text';
export const GRIDMAP_NOTE_TIP = 'Text';

export const registerGridmapToolbar = () => {
  return edgelessToolbarWidget;
};
