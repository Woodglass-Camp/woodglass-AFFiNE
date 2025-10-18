import {
  NOTE_BLOCK_FLAVOURS,
  type Connectable,
  type NoteBlockModel,
} from '@blocksuite/affine-model';
import type { GfxModel } from '@blocksuite/std/gfx';
import type { BlockModel } from '@blocksuite/store';

export function isConnectable(
  element: GfxModel | null
): element is Connectable {
  return !!element && element.connectable;
}

export function isNoteBlock(
  element: BlockModel | GfxModel | null
): element is NoteBlockModel {
  return (
    !!element &&
    'flavour' in element &&
    NOTE_BLOCK_FLAVOURS.includes(
      element.flavour as (typeof NOTE_BLOCK_FLAVOURS)[number]
    )
  );
}
