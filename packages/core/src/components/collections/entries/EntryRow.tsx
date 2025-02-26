import { Info as InfoIcon } from '@styled-icons/material-outlined/Info';
import get from 'lodash/get';
import React, { useEffect, useMemo, useState } from 'react';

import { getFieldPreview } from '@staticcms/core/lib/registry';
import { getEntryBackupKey } from '@staticcms/core/lib/util/backup.util';
import {
  selectEntryCollectionTitle,
  selectFields,
  selectTemplateName,
} from '@staticcms/core/lib/util/collection.util';
import localForage from '@staticcms/core/lib/util/localForage';
import { isNullish } from '@staticcms/core/lib/util/null.util';
import { selectTheme } from '@staticcms/core/reducers/selectors/globalUI';
import { useAppSelector } from '@staticcms/core/store/hooks';
import TableCell from '../../common/table/TableCell';
import TableRow from '../../common/table/TableRow';

import type { BackupEntry, Collection, Entry, TranslatedProps } from '@staticcms/core/interface';
import type { FC } from 'react';

export interface EntryRowProps {
  entry: Entry;
  collection: Collection;
  collectionLabel?: string;
  summaryFields: string[];
}

const EntryRow: FC<TranslatedProps<EntryRowProps>> = ({
  collection,
  entry,
  collectionLabel,
  summaryFields,
  t,
}) => {
  const path = useMemo(
    () => `/collections/${collection.name}/entries/${entry.slug}`,
    [collection.name, entry.slug],
  );

  const summary = useMemo(() => selectEntryCollectionTitle(collection, entry), [collection, entry]);

  const fields = selectFields(collection, entry.slug);

  const templateName = useMemo(
    () => selectTemplateName(collection, entry.slug),
    [collection, entry.slug],
  );

  const theme = useAppSelector(selectTheme);

  const [hasLocalBackup, setHasLocalBackup] = useState(false);
  useEffect(() => {
    let alive = true;

    const checkLocalBackup = async () => {
      const key = getEntryBackupKey(collection.name, entry.slug);
      const backup = await localForage.getItem<BackupEntry>(key);

      if (alive) {
        setHasLocalBackup(Boolean(backup));
      }
    };

    checkLocalBackup();

    // Check again after small delay to ensure we capture the draft just made from the editor
    setTimeout(() => {
      checkLocalBackup();
    }, 250);

    return () => {
      alive = false;
    };
  }, [collection.name, entry.slug]);

  return (
    <TableRow
      className="
        hover:bg-gray-200
        dark:hover:bg-slate-700/70
      "
    >
      {collectionLabel ? (
        <TableCell key="collectionLabel" to={path}>
          {collectionLabel}
        </TableCell>
      ) : null}
      {summaryFields.map(fieldName => {
        if (fieldName === 'summary') {
          return (
            <TableCell key={fieldName} to={path}>
              {summary}
            </TableCell>
          );
        }

        const field = fields.find(f => f.name === fieldName);
        const value = get(entry.data, fieldName);
        const FieldPreviewComponent = getFieldPreview(templateName, fieldName);

        return (
          <TableCell key={fieldName} to={path}>
            {field && FieldPreviewComponent ? (
              <FieldPreviewComponent
                collection={collection}
                field={field}
                value={value}
                theme={theme}
              />
            ) : isNullish(value) ? (
              ''
            ) : (
              String(value)
            )}
          </TableCell>
        );
      })}
      <TableCell key="unsavedChanges" to={path} shrink>
        {hasLocalBackup ? (
          <InfoIcon
            className="
                w-5
                h-5
                text-blue-600
                dark:text-blue-300
              "
            title={t('ui.localBackup.hasLocalBackup')}
          />
        ) : null}
      </TableCell>
    </TableRow>
  );
};

export default EntryRow;
