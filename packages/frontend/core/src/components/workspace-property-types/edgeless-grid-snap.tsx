import { Checkbox, MenuItem, PropertyValue } from '@affine/component';
import type { FilterParams } from '@affine/core/modules/collection-rules';
import { DocService, type DocRecord } from '@affine/core/modules/doc';
import { useI18n } from '@affine/i18n';
import { GridIcon } from '@blocksuite/icons/rc';
import { useLiveData, useService } from '@toeverything/infra';
import { useCallback, type ChangeEvent } from 'react';

import { PlainTextDocGroupHeader } from '../explorer/docs-view/group-header';
import { StackProperty } from '../explorer/docs-view/stack-property';
import type { GroupHeaderProps } from '../explorer/types';
import { FilterValueMenu } from '../filter/filter-value-menu';
import type { PropertyValueProps } from '../properties/types';
import * as styles from './template.css';

export const EdgelessGridSnapValue = ({ readonly }: PropertyValueProps) => {
  const docService = useService(DocService);
  const enabled = useLiveData(
    docService.doc.properties$.selector(props => !!props.edgelessGridSnap)
  );

  const toggle = useCallback(() => {
    if (readonly) return;
    docService.doc.record.setProperty('edgelessGridSnap', !enabled);
  }, [docService.doc.record, enabled, readonly]);

  const onChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (readonly) return;
      docService.doc.record.setProperty('edgelessGridSnap', event.target.checked);
    },
    [docService.doc.record, readonly]
  );

  return (
    <PropertyValue className={styles.property} readonly hoverable={false}>
      <Checkbox
        checked={!!enabled}
        onChange={onChange}
        onClick={toggle}
        disabled={readonly}
        data-testid="toggle-edgeless-grid-checkbox"
        className={styles.checkbox}
      />
    </PropertyValue>
  );
};

export const EdgelessGridSnapDocListProperty = ({ doc }: { doc: DocRecord }) => {
  const t = useI18n();
  const enabled = useLiveData(
    doc.properties$.selector(props => !!props.edgelessGridSnap)
  );

  return (
    <StackProperty icon={<GridIcon />}>
      {enabled
        ? t['com.affine.page-properties.property.edgelessGridSnap.enabled']?.() ??
          t['Enabled']?.()
        : t['com.affine.page-properties.property.edgelessGridSnap.disabled']?.() ??
          t['Disabled']?.()}
    </StackProperty>
  );
};

export const EdgelessGridSnapGroupHeader = ({
  groupId,
  docCount,
}: GroupHeaderProps) => {
  const t = useI18n();
  const text =
    groupId === 'true'
      ? t['com.affine.page-properties.property.edgelessGridSnap.enabled']?.() ??
        t['Enabled']?.()
      : t['com.affine.page-properties.property.edgelessGridSnap.disabled']?.() ??
        t['Disabled']?.();

  return (
    <PlainTextDocGroupHeader groupId={groupId} docCount={docCount}>
      {text}
    </PlainTextDocGroupHeader>
  );
};

export const EdgelessGridSnapFilterValue = ({
  filter,
  isDraft,
  onDraftCompleted,
  onChange,
}: {
  filter: FilterParams;
  isDraft?: boolean;
  onDraftCompleted?: () => void;
  onChange?: (filter: FilterParams) => void;
}) => {
  const t = useI18n();

  return (
    <FilterValueMenu
      isDraft={isDraft}
      onDraftCompleted={onDraftCompleted}
      items={
        <>
          <MenuItem
            onClick={() => {
              onChange?.({ ...filter, value: 'true' });
            }}
            selected={filter.value === 'true'}
          >
            {t['com.affine.page-properties.property.edgelessGridSnap.enabled']?.() ??
              t['Enabled']?.()}
          </MenuItem>
          <MenuItem
            onClick={() => {
              onChange?.({ ...filter, value: 'false' });
            }}
            selected={filter.value !== 'true'}
          >
            {t['com.affine.page-properties.property.edgelessGridSnap.disabled']?.() ??
              t['Disabled']?.()}
          </MenuItem>
        </>
      }
    >
      <span>
        {filter.value === 'true'
          ? t['com.affine.page-properties.property.edgelessGridSnap.enabled']?.() ??
            t['Enabled']?.()
          : t['com.affine.page-properties.property.edgelessGridSnap.disabled']?.() ??
            t['Disabled']?.()}
      </span>
    </FilterValueMenu>
  );
};
