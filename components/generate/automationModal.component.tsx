"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AUTOMATION_MODAL_LABELS, AUTOMATION_MODAL_OPTIONS } from "@/constants/generation.constants";

type TAutomationModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onStart?: () => void;
};

export default function AutomationModal({ open, onOpenChange, onStart }: TAutomationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>{AUTOMATION_MODAL_LABELS.DIALOG_TITLE}</DialogTitle>
        </DialogHeader>
        <div className='grid gap-4'>
          <div className='grid gap-2 sm:grid-cols-3'>
            <div className='grid gap-1'>
              <label className='text-sm font-medium'>{AUTOMATION_MODAL_LABELS.TARGET_COUNT_LABEL}</label>
              <select className='rounded-md border px-2 py-1 text-sm dark:border-gray-800 dark:bg-gray-900'>
                {AUTOMATION_MODAL_OPTIONS.TARGET_COUNTS.map((count) => (
                  <option key={count} value={count}>
                    {count}
                  </option>
                ))}
              </select>
            </div>
            <div className='grid gap-1'>
              <label className='text-sm font-medium'>{AUTOMATION_MODAL_LABELS.SENSITIVITY_LABEL}</label>
              <select className='rounded-md border px-2 py-1 text-sm dark:border-gray-800 dark:bg-gray-900'>
                {AUTOMATION_MODAL_OPTIONS.SENSITIVITY_LEVELS.map((level) => (
                  <option key={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>
          <div className='grid gap-2'>
            <div className='text-sm font-medium'>{AUTOMATION_MODAL_LABELS.COVERAGE_LABEL}</div>
            <div className='rounded-md border p-3 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300'>
              {AUTOMATION_MODAL_LABELS.COVERAGE_PLACEHOLDER}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant='secondary' onClick={() => onOpenChange(false)}>
            {AUTOMATION_MODAL_LABELS.CLOSE_BUTTON}
          </Button>
          <Button onClick={onStart}>{AUTOMATION_MODAL_LABELS.START_BUTTON}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
