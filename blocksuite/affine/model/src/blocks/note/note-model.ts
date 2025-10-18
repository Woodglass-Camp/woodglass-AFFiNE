import { Bound } from '@blocksuite/global/gfx';
import type {
  GfxCompatibleProps,
  GfxElementGeometry,
} from '@blocksuite/std/gfx';
import { GfxCompatible } from '@blocksuite/std/gfx';
import {
  BlockModel,
  BlockSchemaExtension,
  defineBlockSchema,
} from '@blocksuite/store';
import { z } from 'zod';

import {
  DEFAULT_NOTE_BORDER_SIZE,
  DEFAULT_NOTE_BORDER_STYLE,
  DEFAULT_NOTE_CORNER,
  DEFAULT_NOTE_HEIGHT,
  DEFAULT_NOTE_SHADOW,
  DEFAULT_NOTE_WIDTH,
  NoteDisplayMode,
  NoteDisplayModeSchema,
  NoteShadowsSchema,
  type StrokeStyle,
  StrokeStyleSchema,
} from '../../consts/note';
import { GRIDMAP_GRID_SIZE } from '../../consts/gridmap';
import { type Color, ColorSchema, DefaultTheme } from '../../themes';

export const NoteZodSchema = z
  .object({
    background: ColorSchema,
    displayMode: NoteDisplayModeSchema,
    edgeless: z.object({
      style: z.object({
        borderRadius: z.number(),
        borderSize: z.number(),
        borderStyle: StrokeStyleSchema,
        shadowType: NoteShadowsSchema,
      }),
    }),
    grid: z
      .object({
        cols: z.number().int().min(1),
        rows: z.number().int().min(1),
      })
      .optional(),
  })
  .default({
    background: DefaultTheme.noteBackgrounColor,
    displayMode: NoteDisplayMode.EdgelessOnly,
    edgeless: {
      style: {
        borderRadius: DEFAULT_NOTE_CORNER,
        borderSize: DEFAULT_NOTE_BORDER_SIZE,
        borderStyle: DEFAULT_NOTE_BORDER_STYLE,
        shadowType: DEFAULT_NOTE_SHADOW,
      },
    },
    grid: undefined,
  });

const createDefaultNoteProps = (): NoteProps => ({
  xywh: `[0,0,${DEFAULT_NOTE_WIDTH},${DEFAULT_NOTE_HEIGHT}]`,
  background: DefaultTheme.noteBackgrounColor,
  index: 'a0',
  lockedBySelf: false,
  hidden: false,
  displayMode: NoteDisplayMode.DocAndEdgeless,
  edgeless: {
    style: {
      borderRadius: DEFAULT_NOTE_CORNER,
      borderSize: DEFAULT_NOTE_BORDER_SIZE,
      borderStyle: DEFAULT_NOTE_BORDER_STYLE,
      shadowType: DEFAULT_NOTE_SHADOW,
    },
  },
  comments: undefined,
  grid: undefined,
});

export const NoteBlockSchema = defineBlockSchema({
  flavour: 'affine:note',
  props: (): NoteProps => createDefaultNoteProps(),
  metadata: {
    version: 1,
    role: 'hub',
    parent: ['@root'],
    children: [
      '@content',
      'affine:database',
      'affine:data-view',
      'affine:callout',
    ],
  },
  toModel: () => {
    return new NoteBlockModel();
  },
});

export const NoteBlockSchemaExtension = BlockSchemaExtension(NoteBlockSchema);

const GRID_NOTE_DEFAULT_COLS = 4;
const GRID_NOTE_DEFAULT_ROWS = 3;

export const GridNoteBlockSchema = defineBlockSchema({
  flavour: 'affine:grid-note',
  props: (): NoteProps => {
    const props = createDefaultNoteProps();
    props.xywh = `[0,0,${GRIDMAP_GRID_SIZE * GRID_NOTE_DEFAULT_COLS},${GRIDMAP_GRID_SIZE * GRID_NOTE_DEFAULT_ROWS}]`;
    props.displayMode = NoteDisplayMode.EdgelessOnly;
    props.grid = {
      cols: GRID_NOTE_DEFAULT_COLS,
      rows: GRID_NOTE_DEFAULT_ROWS,
    };
    return props;
  },
  metadata: {
    version: 1,
    role: 'hub',
    parent: ['@root'],
    children: [
      '@content',
      'affine:database',
      'affine:data-view',
      'affine:callout',
    ],
  },
  toModel: () => new NoteBlockModel(),
});

export const GridNoteBlockSchemaExtension =
  BlockSchemaExtension(GridNoteBlockSchema);

export type NoteProps = {
  background: Color;
  displayMode: NoteDisplayMode;
  edgeless: NoteEdgelessProps;
  comments?: Record<string, boolean>;
  grid?: {
    cols: number;
    rows: number;
  };
  /**
   * @deprecated
   * use `displayMode` instead
   * hidden:true -> displayMode:NoteDisplayMode.EdgelessOnly:
   *  means the note is visible only in the edgeless mode
   * hidden:false -> displayMode:NoteDisplayMode.DocAndEdgeless:
   *  means the note is visible in the doc and edgeless mode
   */
  hidden: boolean;
} & GfxCompatibleProps;

export const NOTE_BLOCK_FLAVOURS = [
  NoteBlockSchema.model.flavour,
  GridNoteBlockSchema.model.flavour,
] as const;

export type NoteBlockFlavour = (typeof NOTE_BLOCK_FLAVOURS)[number];

export type NoteEdgelessProps = {
  style: {
    borderRadius: number;
    borderSize: number;
    borderStyle: StrokeStyle;
    shadowType: string;
  };
  collapse?: boolean;
  collapsedHeight?: number;
  scale?: number;
};

export class NoteBlockModel
  extends GfxCompatible<NoteProps>(BlockModel)
  implements GfxElementGeometry
{
  private _isSelectable(): boolean {
    return this.props.displayMode !== NoteDisplayMode.DocOnly;
  }

  override containsBound(bounds: Bound): boolean {
    if (!this._isSelectable()) return false;
    return super.containsBound(bounds);
  }

  override includesPoint(x: number, y: number): boolean {
    if (!this._isSelectable()) return false;

    const bound = Bound.deserialize(this.xywh);
    return bound.isPointInBound([x, y], 0);
  }

  override intersectsBound(bound: Bound): boolean {
    if (!this._isSelectable()) return false;
    return super.intersectsBound(bound);
  }

  override isEmpty(): boolean {
    if (this.children.length === 0) return true;
    if (this.children.length === 1) {
      const firstChild = this.children[0];
      if (firstChild.flavour === 'affine:paragraph') {
        return firstChild.isEmpty();
      }
    }
    return false;
  }

  /**
   * We define a note block as a page block if it is the first visible note
   */
  isPageBlock() {
    return (
      this.parent?.children.find(
        child =>
          child instanceof NoteBlockModel &&
          child.props.displayMode !== NoteDisplayMode.EdgelessOnly
      ) === this
    );
  }
}
