'use client';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  color?: string;
}

export function StatCard({ label, value, icon, trend, trendValue, color = '#6366F1' }: StatCardProps) {
  const trendColors = {
    up: 'text-emerald-400',
    down: 'text-red-400',
    stable: 'text-slate-400',
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    stable: '→',
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6"
      style={{
        background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
        border: '1px solid #334155',
      }}
    >
      {/* Accent glow */}
      <div
        className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 blur-2xl"
        style={{ backgroundColor: color }}
      />

      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400 mb-1">{label}</p>
          <p className="text-3xl font-bold text-white">{value}</p>
          {trend && trendValue && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${trendColors[trend]}`}>
              <span>{trendIcons[trend]}</span>
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}
