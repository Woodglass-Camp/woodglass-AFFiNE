import { EDGELESS_BLOCK_CHILD_PADDING } from '@blocksuite/affine-shared/consts';
import { cssVar } from '@toeverything/theme';
import { style } from '@vanilla-extract/css';

export const ACTIVE_NOTE_EXTRA_PADDING = 0;

const ACTIVE_NOTE_OUTLINE = 'rgba(48, 74, 190, 0.62)';
const ACTIVE_NOTE_GLOW = '0 0 0 2px rgba(28, 36, 96, 0.35)';

export const edgelessNoteContainer = style({
  height: '100%',
  padding: `${EDGELESS_BLOCK_CHILD_PADDING}px`,
  boxSizing: 'border-box',
  pointerEvents: 'all',
  transformOrigin: '0 0',
  fontWeight: '400',
  lineHeight: cssVar('lineHeight'),
  position: 'relative',
  selectors: {
    '&::after': {
      content: '',
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      borderRadius: 'inherit',
      border: '6px solid transparent',
      boxShadow: 'none',
      transition: 'border-color 0.18s ease, box-shadow 0.18s ease',
    },
    '&[data-editing="true"]::after': {
      borderColor: ACTIVE_NOTE_OUTLINE,
      boxShadow: ACTIVE_NOTE_GLOW,
    },
    '&[data-grid-cols][data-grid-rows]': {
      minWidth:
        'calc(var(--affine-gridmap-cols) * var(--affine-gridmap-cell-size, 64px))',
      minHeight:
        'calc(var(--affine-gridmap-rows) * var(--affine-gridmap-cell-size, 64px))',
    },
  },
});

export const collapseButton = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '28px',
  height: '28px',
  zIndex: 2,
  position: 'absolute',
  bottom: 0,
  left: '50%',
  transform: 'translateX(-50%)',
  opacity: 0.2,
  transition: 'opacity 0.3s',

  ':hover': {
    opacity: 1,
  },
  selectors: {
    '&.flip': {
      transform: 'translateX(-50%) rotate(180deg)',
    },
  },
});

export const noteBackground = style({
  position: 'absolute',
  borderColor: cssVar('black10'),
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
  borderRadius: 'inherit',
  transition: 'box-shadow 0.18s ease',
});

export const clipContainer = style({
  width: '100%',
  height: '100%',
});

export const collapsedContent = style({
  position: 'absolute',
  background: cssVar('white'),
  opacity: 0.5,
  pointerEvents: 'none',
  border: `2px ${cssVar('blue')} solid`,
  borderTop: 'unset',
  borderRadius: '0 0 8px 8px',
});
