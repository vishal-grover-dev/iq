import { PERSONA_PANEL_LABELS } from "@/constants/generation.constants";

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
      <div className='text-sm font-semibold'>{PERSONA_PANEL_LABELS.HEADING}</div>
      <ul className='mt-2 space-y-2 text-sm'>
        <li>
          {PERSONA_PANEL_LABELS.GENERATION_LABEL} — {status?.generation ?? PERSONA_PANEL_LABELS.WAITING_STATUS}
        </li>
        <li>
          {PERSONA_PANEL_LABELS.JUDGE_LABEL} — {status?.judge ?? PERSONA_PANEL_LABELS.WAITING_STATUS}
        </li>
        <li>
          {PERSONA_PANEL_LABELS.FINALIZED_LABEL} — {status?.finalized ?? PERSONA_PANEL_LABELS.PENDING_STATUS}
        </li>
      </ul>
    </div>
  );
}
