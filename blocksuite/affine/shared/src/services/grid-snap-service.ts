import { type Container, createIdentifier } from '@blocksuite/global/di';
import { type BlockStdScope, StdIdentifier } from '@blocksuite/std';
import { Extension } from '@blocksuite/store';
import { type Signal, signal } from '@preact/signals-core';

export interface GridSnapExtension {
  getEdgelessGridSnap?: (docId?: string) => Signal<boolean>;
}

export const GridSnapExtensionIdentifier = createIdentifier<GridSnapExtension>(
  'AffineGridSnapExtension'
);

export interface GridSnapService {
  readonly enabled$: Signal<boolean>;
}

export const GridSnapProvider = createIdentifier<GridSnapService>(
  'AffineGridSnapProvider'
);

export class DefaultGridSnapService
  extends Extension
  implements GridSnapService
{
  static override setup(di: Container) {
    di.addImpl(GridSnapProvider, DefaultGridSnapService, [StdIdentifier]);
  }

  readonly enabled$: Signal<boolean>;

  constructor(private readonly std: BlockStdScope) {
    super();
    const extension = this.std.getOptional(GridSnapExtensionIdentifier);
    this.enabled$ =
      extension?.getEdgelessGridSnap?.(this.std.store.id) ?? signal(false);
  }
}
