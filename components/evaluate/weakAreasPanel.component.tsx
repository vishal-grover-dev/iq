import type { IWeakArea } from "@/types/evaluate.types";

/**
 * Weak Areas Panel Component
 *
 * Displays identified weak areas with recommendations and citations.
 * Only shown when user has subtopics with < 50% accuracy (≥3 questions).
 */

interface IWeakAreasPanelProps {
  weakAreas: IWeakArea[];
}

export default function WeakAreasPanel({ weakAreas }: IWeakAreasPanelProps) {
  if (weakAreas.length === 0) {
    return null;
  }

  return (
    <div className='bg-amber-50 dark:bg-amber-950/20 mb-8 rounded-lg border border-amber-200 p-6 dark:border-amber-800'>
      <h2 className='mb-4 text-lg font-semibold'>Areas to Improve</h2>
      <div className='space-y-4'>
        {weakAreas.map((area, idx) => (
          <div key={idx} className='border-l-4 border-amber-500 pl-4'>
            <div className='mb-1 font-medium'>
              {area.topic}: {area.subtopic}
            </div>
            <div className='text-muted-foreground mb-2 text-sm'>Accuracy: {Math.round(area.accuracy * 100)}%</div>
            <p className='text-sm'>{area.recommendation}</p>
            {area.citation && (
              <a
                href={area.citation}
                target='_blank'
                rel='noopener noreferrer'
                className='text-primary hover:underline mt-2 inline-block text-sm'
              >
                Learn more →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
