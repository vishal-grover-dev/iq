"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
          <DialogTitle>Automate generation</DialogTitle>
        </DialogHeader>
        <div className='grid gap-4'>
          <div className='grid gap-2 sm:grid-cols-3'>
            <div className='grid gap-1'>
              <label className='text-sm font-medium'>Target count</label>
              <select className='rounded-md border px-2 py-1 text-sm dark:border-gray-800 dark:bg-gray-900'>
                <option value='25'>25</option>
                <option value='50'>50</option>
                <option value='100'>100</option>
              </select>
            </div>
            <div className='grid gap-1'>
              <label className='text-sm font-medium'>Near-duplicate sensitivity</label>
              <select className='rounded-md border px-2 py-1 text-sm dark:border-gray-800 dark:bg-gray-900'>
                <option>Strict</option>
                <option>Standard</option>
                <option>Lenient</option>
              </select>
            </div>
          </div>
          <div className='grid gap-2'>
            <div className='text-sm font-medium'>Coverage (subtopic × difficulty × Bloom)</div>
            <div className='rounded-md border p-3 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300'>
              Placeholder coverage grid. Will fetch counts from mcq_items.
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant='secondary' onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onStart}>Start</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
