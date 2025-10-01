import {
  AFFINE_TABLET_PENCIL_MODE_WIDGET,
  TabletPencilModeWidget,
} from './index';

export function effects() {
  if (!customElements.get(AFFINE_TABLET_PENCIL_MODE_WIDGET)) {
    customElements.define(
      AFFINE_TABLET_PENCIL_MODE_WIDGET,
      TabletPencilModeWidget
    );
  }
}
