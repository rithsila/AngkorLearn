'use client';

interface WeakArea {
  conceptId: string;
  title: string;
  confidence: number;
}

interface WeakAreasPanelProps {
  areas: WeakArea[];
  onReview?: (conceptId: string) => void;
}

export function WeakAreasPanel({ areas, onReview }: WeakAreasPanelProps) {
  return (
    <div
      className="rounded-2xl p-6 h-full"
      style={{
        background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
        border: '1px solid #334155',
      }}
    >
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        🎯 <span>Weak Areas</span>
      </h3>

      {areas.length === 0 ? (
        <p className="text-slate-400 text-sm">No weak areas detected yet. Keep learning!</p>
      ) : (
        <ul className="space-y-3">
          {areas.slice(0, 8).map((area) => (
            <li
              key={area.conceptId}
              className="flex items-center justify-between group"
            >
              <div className="flex-1 min-w-0 mr-3">
                <p className="text-sm text-white truncate">{area.title}</p>
                <div className="w-full bg-slate-700 rounded-full h-1.5 mt-1">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{
                      width: `${area.confidence}%`,
                      backgroundColor:
                        area.confidence < 30
                          ? '#EF4444'
                          : area.confidence < 50
                          ? '#F59E0B'
                          : '#6366F1',
                    }}
                  />
                </div>
              </div>
              <span
                className="text-sm font-medium shrink-0"
                style={{
                  color:
                    area.confidence < 30
                      ? '#EF4444'
                      : area.confidence < 50
                      ? '#F59E0B'
                      : '#94A3B8',
                }}
              >
                {area.confidence}%
              </span>
            </li>
          ))}
        </ul>
      )}

      {areas.length > 0 && onReview && (
        <button
          onClick={() => onReview(areas[0].conceptId)}
          className="mt-4 w-full py-2 rounded-lg text-sm font-medium transition hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            color: '#F8FAFC',
          }}
        >
          Review These →
        </button>
      )}
    </div>
  );
}
