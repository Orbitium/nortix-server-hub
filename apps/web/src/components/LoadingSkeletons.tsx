import type { CSSProperties } from "react";
import { Card } from "@nortix/ui";

export function ShimmerBlock({
  className = "",
  width,
  height,
}: {
  className?: string;
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
}) {
  return (
    <span
      className={`shimmer-block ${className}`.trim()}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

function LoadingStatus({ label }: { label: string }) {
  return (
    <span className="sr-only" role="status">
      {label}
    </span>
  );
}

export function CardGridSkeleton({
  cards = 6,
  className = "server-grid",
  label = "Loading content",
}: {
  cards?: number;
  className?: string;
  label?: string;
}) {
  return (
    <div className={className} aria-busy="true">
      <LoadingStatus label={label} />
      {Array.from({ length: cards }, (_, index) => (
        <Card className="skeleton-card" key={index}>
          <ShimmerBlock className="skeleton-card__media" />
          <div className="skeleton-card__body">
            <ShimmerBlock width="42%" height={12} />
            <ShimmerBlock width="72%" height={20} />
            <ShimmerBlock width="100%" height={11} />
            <ShimmerBlock width="84%" height={11} />
            <div className="skeleton-card__chips">
              <ShimmerBlock width={68} height={24} />
              <ShimmerBlock width={82} height={24} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function ListSkeleton({
  rows = 4,
  label = "Loading items",
  className = "",
}: {
  rows?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`skeleton-list ${className}`.trim()} aria-busy="true">
      <LoadingStatus label={label} />
      {Array.from({ length: rows }, (_, index) => (
        <div className="skeleton-list__row" key={index}>
          <ShimmerBlock className="skeleton-list__icon" />
          <div>
            <ShimmerBlock width={`${58 + (index % 3) * 11}%`} height={14} />
            <ShimmerBlock width={`${78 - (index % 2) * 14}%`} height={10} />
          </div>
          <ShimmerBlock width={64} height={24} />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 6,
  columns = 4,
  label = "Loading table",
}: {
  rows?: number;
  columns?: number;
  label?: string;
}) {
  return (
    <div className="skeleton-table" aria-busy="true">
      <LoadingStatus label={label} />
      {Array.from({ length: rows }, (_, row) => (
        <div
          className="skeleton-table__row"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          key={row}
        >
          {Array.from({ length: columns }, (_, column) => (
            <ShimmerBlock
              width={`${55 + ((row + column) % 4) * 10}%`}
              height={row === 0 ? 10 : 13}
              key={column}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function MetricGridSkeleton({
  items = 4,
  label = "Loading metrics",
}: {
  items?: number;
  label?: string;
}) {
  return (
    <div className="skeleton-metric-grid" aria-busy="true">
      <LoadingStatus label={label} />
      {Array.from({ length: items }, (_, index) => (
        <Card className="skeleton-metric" key={index}>
          <ShimmerBlock width="48%" height={10} />
          <ShimmerBlock width="65%" height={28} />
          <ShimmerBlock width="82%" height={10} />
        </Card>
      ))}
    </div>
  );
}

export function DetailPageSkeleton({
  label = "Loading details",
}: {
  label?: string;
}) {
  return (
    <div className="skeleton-detail" aria-busy="true">
      <LoadingStatus label={label} />
      <Card className="skeleton-detail__hero">
        <ShimmerBlock className="skeleton-detail__avatar" />
        <div>
          <ShimmerBlock width={110} height={11} />
          <ShimmerBlock width="58%" height={34} />
          <ShimmerBlock width="88%" height={12} />
          <ShimmerBlock width="72%" height={12} />
        </div>
      </Card>
      <div className="skeleton-detail__columns">
        <Card>
          <ShimmerBlock width="32%" height={18} />
          <ShimmerBlock width="100%" height={12} />
          <ShimmerBlock width="92%" height={12} />
          <ShimmerBlock width="76%" height={12} />
          <ListSkeleton rows={3} />
        </Card>
        <Card>
          <ShimmerBlock width="55%" height={18} />
          <TableSkeleton rows={5} columns={2} />
        </Card>
      </div>
    </div>
  );
}
