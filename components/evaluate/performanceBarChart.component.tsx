"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import type { IPerformanceBreakdown } from "@/types/evaluate.types";

/**
 * Performance Bar Chart Component
 *
 * Displays horizontal bar chart for topic/Bloom/difficulty breakdowns.
 * Uses Recharts with mobile-responsive design and shadcn/ui theme colors.
 */

interface IPerformanceBarChartProps {
  title: string;
  data: IPerformanceBreakdown[];
  className?: string;
  sortByAccuracy?: boolean;
}

export default function PerformanceBarChart({
  title,
  data,
  className = "",
  sortByAccuracy = true,
}: IPerformanceBarChartProps) {
  // Sort data if requested
  const sortedData = sortByAccuracy ? [...data].sort((a, b) => b.accuracy - a.accuracy) : data;

  // Transform to percentage for display
  const chartData = sortedData.map((item) => ({
    category: item.category,
    accuracy: Math.round(item.accuracy * 100),
    label: `${item.correct}/${item.total}`,
  }));

  // Color based on accuracy
  const getBarColor = (accuracy: number) => {
    if (accuracy >= 80) return "hsl(142 76% 36%)"; // green
    if (accuracy >= 60) return "hsl(142 71% 45%)"; // light green
    if (accuracy >= 40) return "hsl(48 96% 53%)"; // amber
    return "hsl(0 84% 60%)"; // red
  };

  return (
    <div className={`bg-card rounded-lg border p-4 shadow-sm ${className}`}>
      <h3 className='mb-4 text-sm font-semibold'>{title}</h3>
      <ResponsiveContainer width='100%' height={Math.max(200, chartData.length * 40)}>
        <BarChart
          data={chartData}
          layout='vertical'
          margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
          barCategoryGap='20%'
        >
          <CartesianGrid strokeDasharray='3 3' stroke='hsl(var(--border))' horizontal={false} />
          <XAxis type='number' domain={[0, 100]} stroke='hsl(var(--muted-foreground))' fontSize={12} />
          <YAxis
            dataKey='category'
            type='category'
            width={100}
            stroke='hsl(var(--muted-foreground))'
            fontSize={12}
            tickFormatter={(value) => (value.length > 15 ? value.substring(0, 15) + "..." : value)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
              fontSize: "12px",
            }}
            formatter={(value: number, _name, props) => [`${value}%`, props.payload.label]}
          />
          <Bar dataKey='accuracy' radius={[0, 4, 4, 0]} animationDuration={600} animationEasing='ease-out'>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.accuracy)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
