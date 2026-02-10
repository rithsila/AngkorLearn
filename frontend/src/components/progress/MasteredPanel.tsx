'use client';

interface MasteredArea {
  conceptId: string;
  title: string;
  confidence: number;
}

interface MasteredPanelProps {
  areas: MasteredArea[];
}

export function MasteredPanel({ areas }: MasteredPanelProps) {
  return (
    <div
      className="rounded-2xl p-6 h-full"
      style={{
        background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
        border: '1px solid #334155',
      }}
    >
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        ✅ <span>Mastered</span>
      </h3>

      {areas.length === 0 ? (
        <p className="text-slate-400 text-sm">No concepts mastered yet. You&apos;ll get there!</p>
      ) : (
        <ul className="space-y-3">
          {areas.slice(0, 8).map((area) => (
            <li
              key={area.conceptId}
              className="flex items-center justify-between"
            >
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-sm text-white truncate">{area.title}</p>
                <div className="w-full bg-slate-700 rounded-full h-1.5 mt-1">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      width: `${area.confidence}%`,
                      backgroundColor: '#10B981',
                    }}
                  />
                </div>
              </div>
              <span className="text-sm font-medium text-emerald-400 shrink-0">
                {area.confidence}%
              </span>
            </li>
          ))}
        </ul>
      )}

      {areas.length > 8 && (
        <p className="mt-3 text-sm text-slate-400 text-center">
          +{areas.length - 8} more mastered
        </p>
      )}
    </div>
  );
}
