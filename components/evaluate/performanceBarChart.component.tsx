"use client";

import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { motion } from "framer-motion";
import { usePrefersReducedMotion, ANIMATION_EASING } from "@/utils/animation.utils";
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

const containerVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: ANIMATION_EASING.easeOut,
    },
  },
};

export default function PerformanceBarChart({
  title,
  data,
  className = "",
  sortByAccuracy = true,
}: IPerformanceBarChartProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  // Sort data if requested
  const sortedData = sortByAccuracy ? [...data].sort((a, b) => b.accuracy - a.accuracy) : data;

  // Transform to percentage for display
  const chartData = useMemo(
    () =>
      sortedData.map((item) => ({
        category: item.category,
        accuracy: Math.round(item.accuracy * 100),
        label: `${item.correct}/${item.total}`,
      })),
    [sortedData]
  );

  // Color based on accuracy
  const getBarColor = (accuracy: number) => {
    if (accuracy >= 80) return "hsl(142 76% 36%)"; // green
    if (accuracy >= 60) return "hsl(142 71% 45%)"; // light green
    if (accuracy >= 40) return "hsl(48 96% 53%)"; // amber
    return "hsl(0 84% 60%)"; // red
  };

  return (
    <motion.div
      className={`bg-card rounded-lg border p-4 shadow-sm ${className}`}
      variants={containerVariants}
      initial='hidden'
      animate='visible'
    >
      <motion.h3
        className='mb-4 text-sm font-semibold'
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: ANIMATION_EASING.easeOut }}
      >
        {title}
      </motion.h3>
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
          <Bar
            dataKey='accuracy'
            radius={[0, 4, 4, 0]}
            isAnimationActive={!prefersReducedMotion}
            animationDuration={prefersReducedMotion ? 100 : 400}
            animationEasing='ease-out'
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.accuracy)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
