import React, { useCallback, useMemo } from 'react';
import { translate } from 'react-polyglot';

import { VIEW_STYLE_TABLE } from '@staticcms/core/constants/views';
import { selectFields, selectInferredField } from '@staticcms/core/lib/util/collection.util';
import { toTitleCaseFromKey } from '@staticcms/core/lib/util/string.util';
import EntryListingGrid from './EntryListingGrid';
import EntryListingTable from './EntryListingTable';

import type { ViewStyle } from '@staticcms/core/constants/views';
import type {
  Collection,
  CollectionEntryData,
  Collections,
  Entry,
  Field,
  TranslatedProps,
} from '@staticcms/core/interface';
import type Cursor from '@staticcms/core/lib/util/Cursor';
import type { FC } from 'react';

export interface BaseEntryListingProps {
  entries: Entry[];
  viewStyle: ViewStyle;
  cursor?: Cursor;
  isLoadingEntries: boolean;
  filterTerm: string;
  handleCursorActions?: (action: string) => void;
  page?: number;
}

export interface SingleCollectionEntryListingProps extends BaseEntryListingProps {
  collection: Collection;
}

export interface MultipleCollectionEntryListingProps extends BaseEntryListingProps {
  collections: Collections;
}

export type EntryListingProps =
  | SingleCollectionEntryListingProps
  | MultipleCollectionEntryListingProps;

const EntryListing: FC<TranslatedProps<EntryListingProps>> = ({
  entries,
  cursor,
  viewStyle,
  isLoadingEntries,
  filterTerm,
  handleCursorActions,
  t,
  ...otherProps
}) => {
  const hasMore = useMemo(() => cursor?.actions?.has('append_next'), [cursor?.actions]);

  const handleLoadMore = useCallback(() => {
    if (hasMore) {
      handleCursorActions?.('append_next');
    }
  }, [handleCursorActions, hasMore]);

  const inferFields = useCallback(
    (
      collection?: Collection,
    ): {
      titleField?: string | null;
      descriptionField?: string | null;
      imageField?: string | null;
      remainingFields?: Field[];
    } => {
      if (!collection) {
        return {};
      }

      const titleField = selectInferredField(collection, 'title');
      const descriptionField = selectInferredField(collection, 'description');
      const imageField = selectInferredField(collection, 'image');
      const fields = selectFields(collection);
      const inferredFields = [titleField, descriptionField, imageField];
      const remainingFields = fields && fields.filter(f => inferredFields.indexOf(f.name) === -1);
      return { titleField, descriptionField, imageField, remainingFields };
    },
    [],
  );

  const summaryFields = useMemo(() => {
    let fields: string[] | undefined;
    if ('collection' in otherProps) {
      fields = otherProps.collection.summary_fields;
    }

    return fields ?? ['summary'];
  }, [otherProps]);

  const isSingleCollectionInList = useMemo(
    () => !('collections' in otherProps) || Object.keys(otherProps.collections).length === 1,
    [otherProps],
  );

  const entryData: CollectionEntryData[] = useMemo(() => {
    if ('collection' in otherProps) {
      const inferredFields = inferFields(otherProps.collection);

      return entries.map(entry => ({
        collection: otherProps.collection,
        imageFieldName: inferredFields.imageField,
        viewStyle,
        entry,
        key: entry.slug,
        summaryFields,
      }));
    }

    return entries
      .map(entry => {
        const collectionName = entry.collection;
        const collection = Object.values(otherProps.collections).find(
          coll => coll.name === collectionName,
        );

        const collectionLabel = !isSingleCollectionInList ? collection?.label : undefined;
        const inferredFields = inferFields(collection);
        return collection
          ? {
              collection,
              entry,
              imageFieldName: inferredFields.imageField,
              viewStyle,
              collectionLabel,
              key: entry.slug,
              summaryFields,
            }
          : null;
      })
      .filter(e => e) as CollectionEntryData[];
  }, [entries, inferFields, isSingleCollectionInList, otherProps, summaryFields, viewStyle]);

  const summaryFieldHeaders = useMemo(() => {
    if ('collection' in otherProps) {
      const collectionFields = selectFields(otherProps.collection).reduce((acc, f) => {
        acc[f.name] = f;
        return acc;
      }, {} as Record<string, Field>);
      return summaryFields.map(summaryField => {
        const field = collectionFields[summaryField];
        return !field
          ? toTitleCaseFromKey(summaryField)
          : field.label ?? toTitleCaseFromKey(field.name);
      });
    }

    return [];
  }, [otherProps, summaryFields]);

  if (viewStyle === VIEW_STYLE_TABLE) {
    return (
      <div className="pb-3 overflow-hidden">
        <EntryListingTable
          key="table"
          entryData={entryData}
          isSingleCollectionInList={isSingleCollectionInList}
          summaryFieldHeaders={summaryFieldHeaders}
          loadNext={handleLoadMore}
          canLoadMore={Boolean(hasMore && handleLoadMore)}
          isLoadingEntries={isLoadingEntries}
          t={t}
        />
      </div>
    );
  }

  return (
    <EntryListingGrid
      key={'collection' in otherProps ? otherProps.collection.name : `search-grid-${filterTerm}`}
      entryData={entryData}
      onLoadMore={handleLoadMore}
      canLoadMore={Boolean(hasMore && handleLoadMore)}
      isLoadingEntries={isLoadingEntries}
      t={t}
    />
  );
};

export default translate()(EntryListing) as FC<EntryListingProps>;
