import type { CSSProperties } from 'react';

/** Decorative chart. Exact values and labels remain in the adjacent HTML list. */
export function AdminDonut({
  values,
  label,
}: {
  values: readonly { count: number; color: string }[];
  label: string;
}) {
  const total = values.reduce((sum, item) => sum + item.count, 0);
  let offset = 0;
  const stops = values.map((item) => {
    const start = offset;
    offset += total ? (item.count / total) * 100 : 0;
    return `${item.color} ${start}% ${offset}%`;
  });
  return (
    <div
      className="admin-donut"
      aria-hidden="true"
      style={
        {
          '--donut-fill': total
            ? `conic-gradient(${stops.join(',')})`
            : '#eddfc8',
        } as CSSProperties
      }
    >
      <div>
        <strong>{total}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
