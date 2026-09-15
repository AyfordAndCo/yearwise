'use client';

import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { buildCategoryRows } from '@yearwise/logic';
import { MultiSelect } from './multi-select';
import type { MultiSelectOption } from './multi-select';

export interface CategoryOption {
  id: string;
  name: string;
  parentId: string | null;
  isArchived?: boolean;
}

export interface CategoryMultiSelectProps {
  categories: ReadonlyArray<CategoryOption>;
  value: ReadonlyArray<string>;
  onValueChange: (value: string[]) => void;
  label?: string;
  style?: CSSProperties;
}

/**
 * The ledger's category filter, showing the two-level tree.
 *
 * Options are ordered parent-then-children with an indent, via
 * `buildCategoryRows`. Selecting a parent does **not** rewrite `value` to
 * include its children: the selection is what the user made, and the expansion
 * happens in the query layer through `resolveCategoryIds`, which is what keeps
 * "Food" matching Food and every child of Food (FEAT-FIN-03).
 */
export function CategoryMultiSelect({
  categories,
  value,
  onValueChange,
  label = 'Categories',
  style,
}: CategoryMultiSelectProps) {
  const options = useMemo<MultiSelectOption[]>(
    () =>
      buildCategoryRows(categories).map((row) => ({
        value: row.category.id,
        label:
          row.category.isArchived === true
            ? `${row.category.name} (archived)`
            : row.category.name,
        depth: row.depth,
      })),
    [categories],
  );

  return (
    <MultiSelect
      label={label}
      options={options}
      value={value}
      onValueChange={onValueChange}
      placeholder="All categories"
      style={style}
    />
  );
}
