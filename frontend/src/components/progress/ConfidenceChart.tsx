'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface ConfidenceDataPoint {
  date: string;
  confidence: number;
  conceptTitle: string;
}

interface ConfidenceChartProps {
  data: ConfidenceDataPoint[];
}

export function ConfidenceChart({ data }: ConfidenceChartProps) {
  // Group data by concept for multi-line chart
  const concepts = Array.from(new Set(data.map((d) => d.conceptTitle)));
  const colors = ['#6366F1', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];

  // Transform data: group by date, each concept as a column
  const dateMap = new Map<string, Record<string, number>>();
  for (const point of data) {
    const dateKey = new Date(point.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, {});
    }
    dateMap.get(dateKey)![point.conceptTitle] = point.confidence;
  }

  const chartData = Array.from(dateMap.entries()).map(([date, values]) => ({
    date,
    ...values,
  }));

  if (chartData.length === 0) {
    return (
      <div
        className="rounded-2xl p-6"
        style={{
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          border: '1px solid #334155',
        }}
      >
        <h3 className="text-lg font-semibold text-white mb-4">📈 Confidence Over Time</h3>
        <div className="flex items-center justify-center h-48 text-slate-400">
          No confidence data yet. Start learning to see your progress!
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl p-6"
      style={{
        background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
        border: '1px solid #334155',
      }}
    >
      <h3 className="text-lg font-semibold text-white mb-4">📈 Confidence Over Time</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="date"
            stroke="#94A3B8"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="#94A3B8"
            fontSize={12}
            tickLine={false}
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1E293B',
              border: '1px solid #475569',
              borderRadius: '12px',
              color: '#F8FAFC',
            }}
            formatter={(value: number) => [`${value}%`, '']}
          />
          <Legend
            wrapperStyle={{ color: '#94A3B8', fontSize: '12px' }}
          />
          {concepts.slice(0, 7).map((concept, i) => (
            <Line
              key={concept}
              type="monotone"
              dataKey={concept}
              stroke={colors[i % colors.length]}
              strokeWidth={2}
              dot={{ r: 3, fill: colors[i % colors.length] }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
