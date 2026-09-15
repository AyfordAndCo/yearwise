'use client';

import type { CSSProperties, ReactNode } from 'react';
import { Button } from './button';
import { useTheme } from './theme';
import { tokens } from './tokens';

export interface ChartLegendItem {
  label: string;
  colour: string;
  /** Pre-formatted amount or share. Formatting is the caller's job. */
  value?: ReactNode;
}

/**
 * The accessible mirror of a chart. Every chart must supply one, so the figures
 * are reachable without seeing the drawing.
 */
export interface ChartDataTable {
  caption: string;
  columns: ReadonlyArray<string>;
  rows: ReadonlyArray<ReadonlyArray<string>>;
}

export type ChartState = 'ready' | 'loading' | 'empty' | 'error';

export interface ChartFrameProps {
  title: string;
  description?: string;
  legend?: ReadonlyArray<ChartLegendItem>;
  /**
   * The chart itself. Supply `aria-hidden="true"` on it when `dataTable` is
   * given, so assistive technology reads the table rather than both.
   */
  children: ReactNode;
  dataTable: ChartDataTable;
  state?: ChartState;
  emptyMessage?: string;
  errorMessage?: string;
  onRetry?: () => void;
  minHeight?: number;
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

/**
 * Owns everything a chart shares: title, description, legend, the four states
 * and the screen-reader table.
 *
 * Charts are composed into this frame and are never themed per screen - that is
 * the stated risk in docs/02-phases/phase-1-financial-core.md. The frame is
 * deliberately chart-library agnostic: it renders whatever it is given, so the
 * Recharts decision (design-system open question 2) does not block it.
 */
export function ChartFrame({
  title,
  description,
  legend,
  children,
  dataTable,
  state = 'ready',
  emptyMessage = 'No activity in this period',
  errorMessage = 'This chart could not be loaded',
  onRetry,
  minHeight = 240,
}: ChartFrameProps) {
  const { colours } = useTheme();

  const figureStyle: CSSProperties = {
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.md,
    background: colours.surface,
    border: `1px solid ${colours.border}`,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.lg,
  };

  const bodyStyle: CSSProperties = {
    minHeight,
    display: 'flex',
    alignItems: state === 'ready' ? 'stretch' : 'center',
    justifyContent: 'center',
    color: colours.muted,
    fontSize: tokens.typeScale.sm,
  };

  const skeletonStyle: CSSProperties = {
    width: '100%',
    height: minHeight,
    borderRadius: tokens.radius.sm,
    background: colours.border,
    opacity: 0.5,
  };

  return (
    <figure style={figureStyle}>
      <figcaption
        style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacing.xs }}
      >
        <span style={{ fontSize: tokens.typeScale.base, fontWeight: 600, color: colours.foreground }}>
          {title}
        </span>
        {description !== undefined && <span>{description}</span>}
      </figcaption>

      <div style={bodyStyle}>
        {state === 'ready' && children}
        {state === 'loading' && <span style={skeletonStyle} aria-hidden="true" />}
        {state === 'empty' && <p style={{ margin: 0 }}>{emptyMessage}</p>}
        {state === 'error' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: tokens.spacing.sm,
            }}
          >
            <p style={{ margin: 0 }}>{errorMessage}</p>
            {onRetry !== undefined && (
              <Button variant="secondary" onClick={onRetry}>
                Retry
              </Button>
            )}
          </div>
        )}
      </div>

      {legend !== undefined && legend.length > 0 && (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: tokens.spacing.xs,
          }}
        >
          {legend.map((item) => (
            <li
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: tokens.spacing.sm,
                fontSize: tokens.typeScale.sm,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: '0.625rem',
                  height: '0.625rem',
                  flexShrink: 0,
                  borderRadius: tokens.radius.full,
                  background: item.colour,
                }}
              />
              <span style={{ flex: 1, color: colours.foreground }}>{item.label}</span>
              {item.value !== undefined && (
                <span style={{ fontVariantNumeric: 'tabular-nums', color: colours.foreground }}>
                  {item.value}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <table style={visuallyHidden}>
        <caption>{dataTable.caption}</caption>
        <thead>
          <tr>
            {dataTable.columns.map((column) => (
              <th key={column} scope="col">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataTable.rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td key={`cell-${rowIndex}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
