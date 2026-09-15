'use client';

import { useState } from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { useTheme } from './theme';
import { tokens } from './tokens';

export type TableAlign = 'left' | 'right' | 'center';

export interface TableColumn<Row> {
  /** Stable key, also the React key for the cell. */
  key: string;
  header: ReactNode;
  align?: TableAlign;
  width?: string;
  render: (row: Row) => ReactNode;
}

export interface TableProps<Row> {
  columns: ReadonlyArray<TableColumn<Row>>;
  rows: ReadonlyArray<Row>;
  getRowKey: (row: Row) => string;
  /** Accessible name. Rendered as a visually hidden caption. */
  label: string;
  /**
   * Groups rows and renders a full-width header before each group. The ledger
   * groups by date string; never by a parsed instant (A6).
   */
  groupBy?: (row: Row) => string;
  /** Enables pointer and keyboard (Enter/Space) row activation. */
  onRowActivate?: (row: Row) => void;
  loading?: boolean;
  skeletonRows?: number;
  /** Rendered across the full width when there are no rows and not loading. */
  empty?: ReactNode;
}

const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  borderWidth: 0,
};

interface Section<Row> {
  key: string;
  header?: string;
  rows: Row[];
}

function toSections<Row>(
  rows: ReadonlyArray<Row>,
  groupBy: ((row: Row) => string) | undefined,
): Section<Row>[] {
  if (groupBy === undefined) {
    return [{ key: '__all__', rows: [...rows] }];
  }

  const sections: Section<Row>[] = [];
  for (const row of rows) {
    const key = groupBy(row);
    const last = sections[sections.length - 1];
    if (last !== undefined && last.key === key) {
      last.rows.push(row);
    } else {
      sections.push({ key, header: key, rows: [row] });
    }
  }
  return sections;
}

/**
 * The ledger's table.
 *
 * Presentational: it renders rows and never fetches. Money alignment is the
 * caller's job through the column's `align`, and amounts are rendered with
 * `MoneyText` so sign and tone stay consistent.
 *
 * A row is activatable by pointer and by keyboard. The row itself carries no
 * ARIA `role` (a `role="button"` on a `tr` is invalid); screens that need
 * unambiguous affordance place a real control in a cell, as the ledger's row
 * actions menu does.
 */
export function Table<Row>({
  columns,
  rows,
  getRowKey,
  label,
  groupBy,
  onRowActivate,
  loading = false,
  skeletonRows = 8,
  empty,
}: TableProps<Row>) {
  const { colours } = useTheme();
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const cellStyle = (align: TableAlign): CSSProperties => ({
    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
    textAlign: align,
    borderBottom: `1px solid ${colours.border}`,
    fontSize: tokens.typeScale.sm,
    whiteSpace: 'nowrap',
    verticalAlign: 'middle',
  });

  const headerCellStyle: CSSProperties = {
    position: 'sticky',
    top: 0,
    zIndex: 1,
    background: colours.surface,
    color: colours.muted,
    fontSize: tokens.typeScale.xs,
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    borderBottom: `1px solid ${colours.borderStrong}`,
  };

  const groupHeaderStyle: CSSProperties = {
    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
    textAlign: 'left',
    background: colours.surface,
    color: colours.muted,
    fontSize: tokens.typeScale.xs,
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    borderBottom: `1px solid ${colours.border}`,
  };

  const skeletonBlock: CSSProperties = {
    display: 'block',
    height: '0.75rem',
    width: '70%',
    borderRadius: tokens.radius.sm,
    background: colours.border,
  };

  const sections = toSections(rows, groupBy);
  const showEmpty = !loading && rows.length === 0;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <caption style={visuallyHidden}>{label}</caption>

      <thead>
        <tr>
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              style={{
                ...cellStyle(column.align ?? 'left'),
                ...headerCellStyle,
                width: column.width,
              }}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>

      {loading &&
        Array.from({ length: skeletonRows }, (_, rowIndex) => (
          <tbody key={`skeleton-${rowIndex}`}>
            <tr aria-hidden="true">
              {columns.map((column) => (
                <td key={column.key} style={cellStyle(column.align ?? 'left')}>
                  <span style={skeletonBlock} />
                </td>
              ))}
            </tr>
          </tbody>
        ))}

      {showEmpty && (
        <tbody>
          <tr>
            <td colSpan={columns.length} style={cellStyle('left')}>
              {empty}
            </td>
          </tr>
        </tbody>
      )}

      {!loading &&
        !showEmpty &&
        sections.map((section) => (
          <tbody key={section.key}>
            {section.header !== undefined && (
              <tr>
                <th scope="colgroup" colSpan={columns.length} style={groupHeaderStyle}>
                  {section.header}
                </th>
              </tr>
            )}

            {section.rows.map((row) => {
              const rowKey = getRowKey(row);
              const isActive = activeKey === rowKey;

              const handleKeyDown = (event: ReactKeyboardEvent<HTMLTableRowElement>) => {
                if (onRowActivate === undefined) return;
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                onRowActivate(row);
              };

              return (
                <tr
                  key={rowKey}
                  tabIndex={onRowActivate === undefined ? undefined : 0}
                  onClick={onRowActivate === undefined ? undefined : () => onRowActivate(row)}
                  onKeyDown={onRowActivate === undefined ? undefined : handleKeyDown}
                  onMouseEnter={onRowActivate === undefined ? undefined : () => setActiveKey(rowKey)}
                  onMouseLeave={onRowActivate === undefined ? undefined : () => setActiveKey(null)}
                  onFocus={onRowActivate === undefined ? undefined : () => setActiveKey(rowKey)}
                  onBlur={onRowActivate === undefined ? undefined : () => setActiveKey(null)}
                  style={{
                    background: isActive ? colours.tint : 'transparent',
                    cursor: onRowActivate === undefined ? 'default' : 'pointer',
                    outline: isActive ? `2px solid ${colours.focus}` : 'none',
                    outlineOffset: '-2px',
                  }}
                >
                  {columns.map((column) => (
                    <td key={column.key} style={cellStyle(column.align ?? 'left')}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        ))}
    </table>
  );
}
