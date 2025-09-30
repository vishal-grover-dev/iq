import type { IPerformanceBreakdown } from "@/types/evaluate.types";

/**
 * Results Chart Component
 *
 * Displays performance breakdown as a simple table/list.
 * Shows accuracy per category (topic/subtopic/Bloom level).
 */

interface IResultsChartProps {
  title: string;
  data: IPerformanceBreakdown[];
  className?: string;
}

export default function ResultsChart({ title, data, className = "" }: IResultsChartProps) {
  return (
    <div className={`bg-card rounded-lg border p-4 shadow-sm ${className}`}>
      <h3 className='mb-3 text-sm font-semibold'>{title}</h3>
      <div className='space-y-2'>
        {data.map((item) => (
          <div key={item.category} className='flex items-center justify-between text-sm'>
            <span className='text-muted-foreground'>{item.category}</span>
            <span className='font-medium'>
              {item.correct}/{item.total} ({Math.round(item.accuracy * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
