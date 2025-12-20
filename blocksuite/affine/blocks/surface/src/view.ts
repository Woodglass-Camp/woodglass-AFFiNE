import {
  type ViewExtensionContext,
  ViewExtensionProvider,
} from '@blocksuite/affine-ext-loader';
import { BlockViewExtension, FlavourExtension } from '@blocksuite/std';
import { literal } from 'lit/static-html.js';

import { effects } from './effects';
import {
  EdgelessCRUDExtension,
  EdgelessLegacySlotExtension,
  EditPropsMiddlewareBuilder,
  GridmapSnapExtension,
  GridmapSurfaceLifecycleExtension,
  GridmapSurfaceMiddlewareBuilder,
} from './extensions';
import { ExportManagerExtension } from './extensions/export-manager/export-manager';
import { DefaultTool } from './tool/default-tool';

export class SurfaceViewExtension extends ViewExtensionProvider {
  override name = 'affine-surface-block';

  override effect() {
    super.effect();
    effects();
  }

  override setup(context: ViewExtensionContext) {
    super.setup(context);
    context.register([
      FlavourExtension('affine:surface'),
      EdgelessCRUDExtension,
      EdgelessLegacySlotExtension,
      ExportManagerExtension,
    ]);
    if (context.scope === 'gridmap') {
      context.register([
        DefaultTool,
        GridmapSnapExtension,
        GridmapSurfaceLifecycleExtension,
        EditPropsMiddlewareBuilder,
        GridmapSurfaceMiddlewareBuilder,
      ]);
      context.register(
        BlockViewExtension('affine:surface', literal`affine-surface`)
      );
      return;
    }
    if (this.isEdgeless(context.scope)) {
      context.register([
        DefaultTool,
        GridmapSnapExtension,
        GridmapSurfaceLifecycleExtension,
        EditPropsMiddlewareBuilder,
        GridmapSurfaceMiddlewareBuilder,
      ]);
      context.register(
        BlockViewExtension('affine:surface', literal`affine-surface`)
      );
    } else {
      context.register(
        BlockViewExtension('affine:surface', literal`affine-surface-void`)
      );
    }
  }
}
