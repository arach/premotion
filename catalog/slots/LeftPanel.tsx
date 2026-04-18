'use client';

import { useCatalog } from '../Provider';

interface FilterRow {
  id: string;
  label: string;
  count: number;
}

export function CatalogLeftPanel() {
  const { filter, setFilter, counts, appBreakdown } = useCatalog();

  const statusRows: FilterRow[] = [
    { id: 'all', label: 'All', count: counts.total },
    { id: 'curated', label: 'Best Snippets', count: counts.curated },
    { id: 'analyzed', label: 'Analyzed', count: counts.analyzed },
    { id: 'needs-work', label: 'Needs Work', count: counts.total - counts.analyzed },
    { id: 'transcribed', label: 'Transcribed', count: counts.transcribed },
    { id: 'reel', label: 'Reel Candidates', count: counts.reel },
  ];

  const appRows: FilterRow[] = Object.entries(appBreakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([app, count]) => ({ id: app, label: app, count }));

  return (
    <div className="flex flex-col h-full overflow-y-auto frame-scrollbar py-2">
      <Section label="Filter" rows={statusRows} active={filter} onSelect={setFilter} />
      {appRows.length > 0 && (
        <Section label="By App" rows={appRows} active={filter} onSelect={setFilter} />
      )}
    </div>
  );
}

function Section({
  label,
  rows,
  active,
  onSelect,
}: {
  label: string;
  rows: FilterRow[];
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mt-3 first:mt-0">
      <div className="px-3 py-1 text-[10px] font-mono uppercase tracking-wider text-white/25">
        {label}
      </div>
      {rows.map(row => (
        <FilterButton
          key={row.id}
          label={row.label}
          count={row.count}
          active={active === row.id}
          onClick={() => onSelect(row.id)}
        />
      ))}
    </div>
  );
}

function FilterButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors border-l-2 ${
        active
          ? 'bg-cyan-500/5 border-l-cyan-400/40 text-white/80'
          : 'border-l-transparent text-white/40 hover:bg-white/[0.02] hover:text-white/60'
      }`}
    >
      <span className="text-[12px] truncate capitalize">{label}</span>
      <span
        className={`text-[10px] font-mono tabular-nums ${
          active ? 'text-cyan-400/60' : 'text-white/20'
        }`}
      >
        {count}
      </span>
    </button>
  );
}
