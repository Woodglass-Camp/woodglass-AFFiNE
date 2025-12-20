import {
  type ViewExtensionContext,
  ViewExtensionProvider,
} from '@blocksuite/affine-ext-loader';
import { GridNoteBlockSchema, NoteBlockSchema } from '@blocksuite/affine-model';
import { BlockViewExtension, FlavourExtension } from '@blocksuite/std';
import { literal } from 'lit/static-html.js';

import {
  GridNoteSlashMenuConfigExtension,
  NoteSlashMenuConfigExtension,
} from './configs/slash-menu';
import { createBuiltinToolbarConfigExtension } from './configs/toolbar';
import {
  EdgelessClipboardNoteConfig,
  GridNoteClipboardConfig,
} from './edgeless-clipboard-config';
import { effects } from './effects';
import {
  EdgelessNoteInteraction,
  GridEdgelessNoteInteraction,
} from './note-edgeless-block';
import { GridNoteKeymapExtension, NoteKeymapExtension } from './note-keymap';

const noteFlavourConfigs = [
  {
    flavour: NoteBlockSchema.model.flavour,
    slashMenuExtension: NoteSlashMenuConfigExtension,
    keymapExtension: NoteKeymapExtension,
    clipboardExtension: EdgelessClipboardNoteConfig,
  },
  {
    flavour: GridNoteBlockSchema.model.flavour,
    slashMenuExtension: GridNoteSlashMenuConfigExtension,
    keymapExtension: GridNoteKeymapExtension,
    clipboardExtension: GridNoteClipboardConfig,
  },
] as const;

export class NoteViewExtension extends ViewExtensionProvider {
  override name = 'affine-note-block';

  override effect() {
    super.effect();
    effects();
  }

  override setup(context: ViewExtensionContext) {
    super.setup(context);
    const isEdgeless = this.isEdgeless(context.scope);

    for (const {
      flavour,
      slashMenuExtension,
      keymapExtension,
      clipboardExtension,
    } of noteFlavourConfigs) {
      context.register([
        FlavourExtension(flavour),
        slashMenuExtension,
        keymapExtension,
      ]);

      if (isEdgeless) {
        context.register(
          BlockViewExtension(flavour, literal`affine-edgeless-note`)
        );
        context.register(createBuiltinToolbarConfigExtension(flavour));
        context.register(clipboardExtension);
      } else {
        context.register(BlockViewExtension(flavour, literal`affine-note`));
      }
    }

    if (isEdgeless) {
      context.register(EdgelessNoteInteraction);
      context.register(GridEdgelessNoteInteraction);
    }
  }
}
