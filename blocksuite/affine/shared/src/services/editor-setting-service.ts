import { createIdentifier } from '@blocksuite/global/di';
import type { DeepPartial } from '@blocksuite/global/utils';
import type { ExtensionType } from '@blocksuite/store';
import type { Signal } from '@preact/signals-core';
import { z } from 'zod';

import { NodePropsSchema } from '../utils/index.js';

export const GeneralSettingSchema = z
  .object({
    edgelessScrollZoom: z.boolean().default(false),
    edgelessDisableScheduleUpdate: z.boolean().default(false),
    // Tablet Pencil mode: enable palm rejection and mode-specific interactions
    edgelessTabletPencilMode: z.boolean().default(false),
    // Which mouse button activates temporary canvas pan in edgeless
    edgelessPanActivation: z
      .enum(['middle', 'right'] as const)
      .default('middle'),
    // Placement of the edgeless toolbar
    edgelessToolbarPosition: z
      .enum(['bottom', 'top'] as const)
      .default('bottom'),
    // Smoothing coefficient for two-finger pinch zoom in Tablet Pencil mode
    // 0 = no smoothing, 1 = fully sticky (not recommended). Typical: 0.15~0.35
    edgelessPinchSmoothAlpha: z.number().min(0).max(1).default(0.25),
    docCanvasPreferView: z
      .enum(['affine:embed-linked-doc', 'affine:embed-synced-doc'])
      .default('affine:embed-synced-doc'),
  })
  .merge(NodePropsSchema);

export type EditorSetting = z.infer<typeof GeneralSettingSchema>;

export interface EditorSettingService {
  setting$: Signal<DeepPartial<EditorSetting>>;
  set?: (
    key: keyof EditorSetting,
    value: EditorSetting[keyof EditorSetting]
  ) => void;
}

export const EditorSettingProvider = createIdentifier<EditorSettingService>(
  'AffineEditorSettingProvider'
);

export function EditorSettingExtension(
  service: EditorSettingService
): ExtensionType {
  return {
    setup: di => {
      di.override(EditorSettingProvider, () => service);
    },
  };
}
