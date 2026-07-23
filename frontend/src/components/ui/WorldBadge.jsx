const WORLD_MAP = {
  pooja: { label: 'Pooja', color: 'bg-amber-100 text-amber-700' },
  crystals: { label: 'Crystal', color: 'bg-teal-100 text-teal-700' },
  gemstones: { label: 'Gemstone', color: 'bg-primary/10 text-primary' },
};

export function WorldBadge({ world }) {
  const config = WORLD_MAP[world] || { label: world, color: 'bg-stone-100 text-stone-500' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${config.color}`}>
      {config.label}
    </span>
  );
}
