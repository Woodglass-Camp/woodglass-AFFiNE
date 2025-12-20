import { EdgelessClipboardConfig } from '@blocksuite/affine-block-surface';
import { DocModeProvider } from '@blocksuite/affine-shared/services';
import { type BlockSnapshot } from '@blocksuite/store';

export class EdgelessClipboardNoteConfig extends EdgelessClipboardConfig {
  static override readonly key = 'affine:note';

  override async createBlock(note: BlockSnapshot): Promise<null | string> {
    const oldId = note.id;

    delete note.props.index;
    if (!note.props.xywh) {
      console.error(`Note block(id: ${oldId}) does not have xywh property`);
      return null;
    }

    const newId = await this.onBlockSnapshotPaste(
      note,
      this.std.store,
      this.std.store.root!.id
    );
    if (!newId) {
      console.error(`Failed to paste note block(id: ${oldId})`);
      return null;
    }

    return newId;
  }
}

export class GridNoteClipboardConfig extends EdgelessClipboardConfig {
  static override readonly key = 'affine:grid-note';

  override async createBlock(note: BlockSnapshot): Promise<null | string> {
    const oldId = note.id;

    delete note.props.index;
    if (!note.props.xywh) {
      console.error(`Note block(id: ${oldId}) does not have xywh property`);
      return null;
    }

    const docMode = this.std.getOptional(DocModeProvider)?.getEditorMode();
    if (docMode !== 'gridmap') {
      note.flavour = 'affine:note';
      if (note.props && typeof note.props === 'object') {
        delete (note.props as Record<string, unknown>)['grid'];
      }
    }

    const newId = await this.onBlockSnapshotPaste(
      note,
      this.std.store,
      this.std.store.root!.id
    );
    if (!newId) {
      console.error(`Failed to paste grid note block(id: ${oldId})`);
      return null;
    }

    return newId;
  }
}
