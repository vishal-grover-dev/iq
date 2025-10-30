"use client";

interface IQuestionCardSkeletonProps {
  showProgressBar?: boolean;
  showDelayedMessage?: boolean;
}

/**
 * QuestionCardSkeleton Component
 *
 * Reusable skeleton loading state for question cards.
 * Matches the structure of QuestionCard for consistent UI during loading.
 */
export default function QuestionCardSkeleton({
  showProgressBar = true,
  showDelayedMessage = false,
}: IQuestionCardSkeletonProps) {
  return (
    <div className='mx-auto w-full max-w-4xl px-4 py-6'>
      {/* Skeleton Progress Bar */}
      {showProgressBar && (
        <div className='mb-6'>
          <div className='mb-3 flex items-center justify-between'>
            <div className='bg-muted h-6 w-32 animate-pulse rounded' />
            <div className='bg-muted h-9 w-28 animate-pulse rounded' />
          </div>
          <div className='bg-secondary h-2 w-full overflow-hidden rounded-full'>
            <div className='bg-muted h-full w-1/3 animate-pulse' />
          </div>
        </div>
      )}

      {/* Skeleton Question Card */}
      <div className='border-border rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-950'>
        {/* Metadata chips skeleton */}
        <div className='mb-4 flex flex-wrap gap-2'>
          <div className='bg-muted h-6 w-20 animate-pulse rounded-full' />
          <div className='bg-muted h-6 w-24 animate-pulse rounded-full' />
          <div className='bg-muted h-6 w-16 animate-pulse rounded-full' />
        </div>

        {/* Question text skeleton */}
        <div className='mb-6 space-y-3'>
          <div className='bg-muted h-4 w-full animate-pulse rounded' />
          <div className='bg-muted h-4 w-5/6 animate-pulse rounded' />
          <div className='bg-muted h-4 w-4/6 animate-pulse rounded' />
        </div>

        {/* Options skeleton */}
        <div className='space-y-3'>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className='border-border h-12 animate-pulse rounded-lg border' />
          ))}
        </div>

        {/* Submit button skeleton */}
        <div className='mt-6 flex justify-end'>
          <div className='bg-muted h-10 w-32 animate-pulse rounded' />
        </div>
      </div>

      {/* Progressive loading message */}
      {showDelayedMessage && (
        <div className='mt-6 text-center'>
          <p className='text-muted-foreground text-sm'>Preparing next question...</p>
          <p className='text-muted-foreground mt-1 text-xs'>This usually takes less than a second</p>
        </div>
      )}
    </div>
  );
}

