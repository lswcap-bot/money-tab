/**
 * Horizontal stacked progress bar.
 * items: [{ label: string, value: number, color: string (Tailwind bg-* class) }]
 * total: denominator for percentage (defaults to sum of items)
 */
export default function BreakdownBar({ items, total }) {
  const t = total ?? items.reduce((s, i) => s + i.value, 0);
  const denom = t > 0 ? t : 1;

  return (
    <div className="space-y-2.5">
      {/* Stacked bar */}
      <div className="flex h-4 rounded-full overflow-hidden bg-slate-100">
        {items.map((item, i) => (
          <div
            key={i}
            className={`${item.color} transition-all duration-500 ease-out`}
            style={{ width: `${Math.max(0, (item.value / denom) * 100).toFixed(2)}%` }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${item.color}`} />
              <span className="text-slate-600 truncate">{item.label}</span>
            </div>
            <span className="font-medium text-slate-700 shrink-0 tabular-nums">
              {((item.value / denom) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
