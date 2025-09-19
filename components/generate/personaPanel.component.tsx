type TPersonaPanelProps = {
  status?: {
    generation?: string;
    judge?: string;
    finalized?: string;
  };
};

export default function PersonaPanel({ status }: TPersonaPanelProps) {
  return (
    <div className='rounded-lg border bg-white p-4 dark:border-gray-800 dark:bg-gray-950'>
      <div className='text-sm font-semibold'>Personas</div>
      <ul className='mt-2 space-y-2 text-sm'>
        <li>Generation — {status?.generation ?? "waiting…"}</li>
        <li>Judge — {status?.judge ?? "waiting…"}</li>
        <li>Finalized — {status?.finalized ?? "pending…"}</li>
      </ul>
    </div>
  );
}
