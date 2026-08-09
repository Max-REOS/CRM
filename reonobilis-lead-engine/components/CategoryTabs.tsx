import { CATEGORY_LABELS, LEAD_CATEGORIES, type LeadCategory } from '@/lib/types';

export default function CategoryTabs({
  active,
  counts,
  total,
  onChange,
}: {
  active: LeadCategory | 'all';
  counts: Record<LeadCategory, number>;
  total: number;
  onChange: (category: LeadCategory | 'all') => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <TabButton label="Alle" count={total} isActive={active === 'all'} onClick={() => onChange('all')} />
      {LEAD_CATEGORIES.map((cat) => (
        <TabButton
          key={cat}
          label={CATEGORY_LABELS[cat]}
          count={counts[cat] ?? 0}
          isActive={active === cat}
          onClick={() => onChange(cat)}
        />
      ))}
    </div>
  );
}

function TabButton({
  label,
  count,
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs uppercase tracking-widest border transition-colors ${
        isActive
          ? 'bg-[#c9a84c]/15 border-[#c9a84c]/40 text-[#c9a84c]'
          : 'bg-[#111111] border-[#1e1e1e] text-gray-400 hover:border-[#2a2a2a] hover:text-gray-200'
      }`}
    >
      <span className="font-[family-name:var(--font-cormorant)] text-sm normal-case tracking-normal">
        {label}
      </span>
      <span
        className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${
          isActive ? 'bg-[#c9a84c]/20' : 'bg-[#1a1a1a] text-gray-500'
        }`}
      >
        {count}
      </span>
    </button>
  );
}
