'use client';

interface ReviewItem {
  conceptId: string;
  conceptTitle: string;
  lastReviewed: string;
  confidence: number;
  reviewDueDate: string;
  priority: 'high' | 'medium' | 'low';
}

interface ReviewCalendarProps {
  items: ReviewItem[];
  onStartReview?: (conceptId: string) => void;
}

export function ReviewCalendar({ items, onStartReview }: ReviewCalendarProps) {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const todayItems = items.filter((i) => i.reviewDueDate <= today);
  const tomorrowItems = items.filter((i) => i.reviewDueDate === tomorrow);
  const thisWeekItems = items.filter((i) => {
    const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    return i.reviewDueDate > tomorrow && i.reviewDueDate <= weekEnd;
  });

  const priorityColors = {
    high: { bg: '#EF444420', border: '#EF4444', text: '#FCA5A5' },
    medium: { bg: '#F59E0B20', border: '#F59E0B', text: '#FCD34D' },
    low: { bg: '#10B98120', border: '#10B981', text: '#6EE7B7' },
  };

  const renderGroup = (label: string, groupItems: ReviewItem[], emoji: string) => (
    <div>
      <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
        {emoji} {label}
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold"
          style={{
            backgroundColor: groupItems.length > 0 ? '#6366F130' : '#33415530',
            color: groupItems.length > 0 ? '#A5B4FC' : '#64748B',
          }}
        >
          {groupItems.length}
        </span>
      </h4>
      {groupItems.length === 0 ? (
        <p className="text-xs text-slate-500">Nothing due</p>
      ) : (
        <ul className="space-y-2">
          {groupItems.slice(0, 5).map((item) => {
            const colors = priorityColors[item.priority];
            return (
              <li
                key={item.conceptId}
                className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition hover:opacity-80"
                style={{
                  backgroundColor: colors.bg,
                  borderLeft: `3px solid ${colors.border}`,
                }}
                onClick={() => onStartReview?.(item.conceptId)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{item.conceptTitle}</p>
                  <p className="text-xs" style={{ color: colors.text }}>
                    {item.confidence}% confidence
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
        border: '1px solid #334155',
      }}
    >
      <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
        📅 <span>Review Schedule</span>
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {renderGroup('Today', todayItems, '🔴')}
        {renderGroup('Tomorrow', tomorrowItems, '🟡')}
        {renderGroup('This Week', thisWeekItems, '🟢')}
      </div>

      {items.length === 0 && (
        <p className="text-slate-400 text-sm text-center mt-4">
          No reviews scheduled. Complete some learning sessions to build your review schedule!
        </p>
      )}
    </div>
  );
}
