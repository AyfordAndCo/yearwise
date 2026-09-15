/**
 * Category tree helpers.
 *
 * The tree is exactly two levels (A5): a parent has `parentId = null`, a child
 * has a non-null `parentId` and may not itself be a parent. Nothing here
 * assumes the data is well formed - an orphan or a cycle must degrade to
 * something renderable rather than hang the request.
 */

export interface CategoryLike {
  id: string;
  name: string;
  parentId: string | null;
}

export interface CategoryRow<Category extends CategoryLike> {
  category: Category;
  /** `0` for a parent, `1` for a child. Used for indentation. */
  depth: 0 | 1;
}

/**
 * Parent-then-children ordering for a picker or a screen.
 *
 * Sorted by name within each level so the order is stable across renders.
 * A category whose parent is missing from the input is treated as a root, so
 * a partial list still renders something sensible.
 */
export function buildCategoryRows<Category extends CategoryLike>(
  categories: readonly Category[],
): CategoryRow<Category>[] {
  const ids = new Set(categories.map((category) => category.id));

  const roots = categories
    .filter((category) => category.parentId === null || !ids.has(category.parentId))
    .sort(byName);

  const rows: CategoryRow<Category>[] = [];
  for (const root of roots) {
    rows.push({ category: root, depth: 0 });
    const children = categories
      .filter((category) => category.parentId === root.id && category.id !== root.id)
      .sort(byName);
    for (const child of children) {
      rows.push({ category: child, depth: 1 });
    }
  }
  return rows;
}

/**
 * Expand a selection so a parent implies every child.
 *
 * FEAT-FIN-03: "Selecting the parent Food matches transactions on Food and on
 * every child of Food." The expansion happens here, once, so the query layer
 * issues an `IN` over a resolved id set rather than a recursive query per row.
 *
 * Unknown ids are preserved: a selection that no longer resolves should filter
 * to nothing, not silently widen.
 */
export function resolveCategoryIds<Category extends CategoryLike>(
  categories: readonly Category[],
  selectedIds: readonly string[],
): string[] {
  const childrenByParent = new Map<string, string[]>();
  for (const category of categories) {
    if (category.parentId === null) continue;
    const siblings = childrenByParent.get(category.parentId);
    if (siblings === undefined) childrenByParent.set(category.parentId, [category.id]);
    else siblings.push(category.id);
  }

  const resolved = new Set<string>();
  for (const id of selectedIds) {
    if (resolved.has(id)) continue;
    resolved.add(id);

    // Breadth-first over descendants, guarded against a cycle in the data.
    const queue = [...(childrenByParent.get(id) ?? [])];
    while (queue.length > 0) {
      const childId = queue.shift()!;
      if (resolved.has(childId)) continue;
      resolved.add(childId);
      queue.push(...(childrenByParent.get(childId) ?? []));
    }
  }

  return [...resolved];
}

/** Ids of every child of the given parent. */
export function childIds<Category extends CategoryLike>(
  categories: readonly Category[],
  parentId: string,
): string[] {
  return categories
    .filter((category) => category.parentId === parentId)
    .map((category) => category.id);
}

function byName<Category extends CategoryLike>(a: Category, b: Category): number {
  return a.name.localeCompare(b.name);
}
