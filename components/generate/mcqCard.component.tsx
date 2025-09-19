import { cn } from "@/utils/tailwind.utils";
import { IMcqItemView } from "@/types/mcq.types";

function PlaceholderChip({ label }: { label: string }) {
  return (
    <span className='inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-gray-700 dark:text-gray-300'>
      {label}
    </span>
  );
}

export default function McqCard({ item }: { item: IMcqItemView }) {
  return (
    <div className='rounded-lg border bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950'>
      <div className='mb-3 flex flex-wrap items-center gap-2'>
        <PlaceholderChip label={item.subtopic} />
        <PlaceholderChip label={item.bloomLevel} />
        <PlaceholderChip label={item.difficulty} />
        {item.version ? <PlaceholderChip label={`v${item.version}`} /> : null}
      </div>
      <div className='prose prose-sm max-w-none dark:prose-invert'>
        <p>{item.question}</p>
      </div>
      <div className='mt-3 grid gap-2'>
        {item.options.map((opt, idx) => (
          <div
            key={idx}
            className={cn(
              "flex items-center justify-between rounded-md border p-2 text-sm",
              idx === item.correctIndex
                ? "border-emerald-500/60 bg-emerald-50 dark:border-emerald-600/70 dark:bg-emerald-950/30"
                : "dark:border-gray-800"
            )}
          >
            <span className='font-medium'>{String.fromCharCode(65 + idx)}.</span>
            <span className='ml-2 flex-1'>{opt}</span>
            {idx === item.correctIndex ? (
              <span className='ml-2 text-xs text-emerald-700 dark:text-emerald-300'>Correct</span>
            ) : null}
          </div>
        ))}
      </div>
      <div className='mt-4'>
        <div className='text-xs font-medium text-gray-500 dark:text-gray-400'>Citations</div>
        <ul className='mt-1 list-disc pl-5 text-xs text-gray-700 dark:text-gray-300'>
          {item.citations.map((c, i) => (
            <li key={i}>
              <a href={c.url} target='_blank' className='underline underline-offset-2'>
                {c.title ?? c.url}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
