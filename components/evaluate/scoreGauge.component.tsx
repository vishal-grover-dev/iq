"use client";

import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";

/**
 * Score Gauge Component
 *
 * Displays overall score as a radial gauge with color tiers.
 * Uses Recharts RadialBarChart with responsive container.
 */

interface IScoreGaugeProps {
  score: number; // 0-100
  label?: string;
}

export default function ScoreGauge({ score, label = "Score" }: IScoreGaugeProps) {
  // Color tier based on score
  const getColor = (score: number) => {
    if (score >= 90) return "hsl(142 76% 36%)"; // green
    if (score >= 75) return "hsl(142 71% 45%)"; // light green
    if (score >= 60) return "hsl(48 96% 53%)"; // amber
    return "hsl(0 84% 60%)"; // red
  };

  const color = getColor(score);

  const data = [
    {
      name: label,
      value: score,
      fill: color,
    },
  ];

  return (
    <div className='relative'>
      <ResponsiveContainer width='100%' height={180}>
        <RadialBarChart
          cx='50%'
          cy='50%'
          innerRadius='70%'
          outerRadius='100%'
          barSize={20}
          data={data}
          startAngle={180}
          endAngle={0}
        >
          <PolarAngleAxis type='number' domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar
            background={{ fill: "hsl(var(--muted))" }}
            dataKey='value'
            cornerRadius={10}
            animationDuration={800}
            animationEasing='ease-out'
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className='absolute inset-0 flex flex-col items-center justify-center'>
        <div className='text-4xl font-bold' style={{ color }}>
          {score}%
        </div>
        <div className='text-muted-foreground text-xs'>{label}</div>
      </div>
    </div>
  );
}
