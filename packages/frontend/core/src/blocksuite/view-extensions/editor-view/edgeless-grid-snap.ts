import { DocService, DocsService } from '@affine/core/modules/doc';
import { type Container } from '@blocksuite/affine/global/di';
import {
  type GridSnapExtension,
  GridSnapExtensionIdentifier,
} from '@blocksuite/affine/shared/services';
import {
  createSignalFromObservable,
  type Signal,
} from '@blocksuite/affine/shared/utils';
import { LifeCycleWatcher, StdIdentifier } from '@blocksuite/affine/std';
import type { FrameworkProvider } from '@toeverything/infra';
import { map, type Observable, of, switchMap } from 'rxjs';

export function patchEdgelessGridSnapService(
  framework: FrameworkProvider
): typeof LifeCycleWatcher {
  class AffineEdgelessGridSnapExtension
    extends LifeCycleWatcher
    implements GridSnapExtension
  {
    static override key = 'affine-edgeless-grid-snap';

    private readonly cache = new Map<string, Signal<boolean>>();
    private readonly disposables: (() => void)[] = [];

    static override setup(di: Container) {
      super.setup(di);
      di.override(
        GridSnapExtensionIdentifier,
        AffineEdgelessGridSnapExtension,
        [StdIdentifier]
      );
    }

    private _observeDoc(docId?: string): Observable<boolean> {
      const docService = framework.get(DocService);
      const docsService = framework.get(DocsService);

      if (!docId || docId === docService.doc.id) {
        return docService.doc.properties$.map(
          props => !!props.edgelessGridSnap
        );
      }

      return docsService.list.doc$(docId).pipe(
        switchMap(record => record?.properties$ ?? of(undefined)),
        map(props => !!props?.edgelessGridSnap)
      );
    }

    getEdgelessGridSnap(docId?: string): Signal<boolean> {
      const id = docId ?? framework.get(DocService).doc.id ?? 'affine-doc';
      const cached = this.cache.get(id);
      if (cached) {
        return cached;
      }

      const observable$ = this._observeDoc(id);
      const { signal, cleanup } = createSignalFromObservable<boolean>(
        observable$,
        false
      );
      this.cache.set(id, signal);
      this.disposables.push(cleanup);
      return signal;
    }

    override unmounted(): void {
      this.disposables.forEach(dispose => dispose());
      this.cache.clear();
    }
  }

  return AffineEdgelessGridSnapExtension;
}
