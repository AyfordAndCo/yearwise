import { describe, expect, it } from 'vitest';
import { buildCategoryRows, childIds, resolveCategoryIds } from '../src/category-tree';

interface Category {
  id: string;
  name: string;
  parentId: string | null;
}

const categories: Category[] = [
  { id: 'food', name: 'Food', parentId: null },
  { id: 'groceries', name: 'Groceries', parentId: 'food' },
  { id: 'restaurants', name: 'Restaurants', parentId: 'food' },
  { id: 'housing', name: 'Housing', parentId: null },
  { id: 'rent', name: 'Rent', parentId: 'housing' },
  { id: 'income', name: 'Income', parentId: null },
];

describe('buildCategoryRows', () => {
  it('orders parents before their children', () => {
    const ids = buildCategoryRows(categories).map((row) => row.category.id);
    expect(ids).toEqual(['food', 'groceries', 'restaurants', 'housing', 'rent', 'income']);
  });

  it('assigns depth 0 to parents and 1 to children', () => {
    const depths = buildCategoryRows(categories).map((row) => row.depth);
    expect(depths).toEqual([0, 1, 1, 0, 1, 0]);
  });

  it('sorts siblings and roots by name', () => {
    const rows = buildCategoryRows(categories);
    const roots = rows.filter((row) => row.depth === 0).map((row) => row.category.name);
    expect(roots).toEqual(['Food', 'Housing', 'Income']);
  });

  it('treats a category with a missing parent as a root', () => {
    // A partial list must still render rather than dropping rows silently.
    const partial: Category[] = [{ id: 'orphan', name: 'Orphan', parentId: 'not-loaded' }];
    const rows = buildCategoryRows(partial);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.depth).toBe(0);
  });

  it('never nests deeper than one level', () => {
    const rows = buildCategoryRows(categories);
    expect(rows.every((row) => row.depth <= 1)).toBe(true);
  });

  it('returns nothing for corrupt cyclic data rather than hanging', () => {
    const cyclic: Category[] = [
      { id: 'a', name: 'A', parentId: 'b' },
      { id: 'b', name: 'B', parentId: 'a' },
    ];
    expect(buildCategoryRows(cyclic)).toEqual([]);
  });
});

describe('resolveCategoryIds', () => {
  it('expands a parent to include every child (FEAT-FIN-03)', () => {
    // "Selecting the parent Food matches transactions on Food and on every
    // child of Food."
    expect(resolveCategoryIds(categories, ['food']).sort()).toEqual([
      'food',
      'groceries',
      'restaurants',
    ]);
  });

  it('leaves a child selection alone', () => {
    expect(resolveCategoryIds(categories, ['groceries'])).toEqual(['groceries']);
  });

  it('de-duplicates overlapping selections', () => {
    const resolved = resolveCategoryIds(categories, ['food', 'groceries']);
    expect(resolved).toHaveLength(3);
    expect(new Set(resolved).size).toBe(resolved.length);
  });

  it('preserves an unknown id so the filter narrows rather than widens', () => {
    // A selection that no longer resolves should match nothing, not everything.
    expect(resolveCategoryIds(categories, ['deleted-id'])).toEqual(['deleted-id']);
  });

  it('returns nothing for an empty selection', () => {
    expect(resolveCategoryIds(categories, [])).toEqual([]);
  });

  it('terminates on corrupt cyclic data', () => {
    const cyclic: Category[] = [
      { id: 'a', name: 'A', parentId: 'b' },
      { id: 'b', name: 'B', parentId: 'a' },
    ];
    expect(resolveCategoryIds(cyclic, ['a']).sort()).toEqual(['a', 'b']);
  });
});

describe('childIds', () => {
  it('returns the direct children of a parent', () => {
    expect(childIds(categories, 'food').sort()).toEqual(['groceries', 'restaurants']);
  });

  it('returns nothing for a leaf', () => {
    expect(childIds(categories, 'groceries')).toEqual([]);
  });
});
