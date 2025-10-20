"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { TPlanData, TWebPlanData } from "@/types/upload.types";

interface IPlanModalProps {
  isOpen: boolean;
  planData: TPlanData | null;
  webPlanData: TWebPlanData | null;
  onClose: () => void;
  onResume?: (ingestionId?: string) => void;
  onRetry?: (ingestionId?: string) => void;
  onReport?: (ingestionId?: string) => void;
}

export function PlanModal({ isOpen, planData, webPlanData, onClose, onResume, onRetry, onReport }: IPlanModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className='sm:max-w-xl max-h-[85vh] grid-rows-[auto_1fr_auto] overflow-hidden'>
        <DialogHeader>
          <DialogTitle>Plan</DialogTitle>
        </DialogHeader>
        <div className='min-h-0 overflow-y-auto pr-1'>
          {planData || webPlanData ? (
            <div className='space-y-4 text-sm'>
              {planData && (
                <div className='space-y-2'>
                  <p className='font-medium'>Repos summary</p>
                  <p>Total files: {planData.total}</p>
                  <p>Batch size: {planData.batchSize}</p>
                  <div>
                    <p className='font-medium mt-2'>Categories</p>
                    <div className='max-h-40 overflow-auto space-y-1'>
                      {Object.entries(planData.categories).map(([k, v]) => (
                        <div key={k} className='flex justify-between'>
                          <span>{k}</span>
                          <span>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className='font-medium mt-2'>Batches</p>
                    <div className='max-h-40 overflow-auto space-y-1'>
                      {planData.slices.map((s) => (
                        <div key={s.name} className='flex justify-between'>
                          <span>{s.name}</span>
                          <span>{s.count} files</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {webPlanData && (
                <div className='space-y-2'>
                  <p className='font-medium'>Web crawl summary</p>
                  <p>Discovered pages: {webPlanData.count}</p>
                  <div>
                    <p className='font-medium mt-2'>Sample pages</p>
                    <div className='max-h-40 overflow-auto space-y-1'>
                      {webPlanData.pages.slice(0, 20).map((p) => (
                        <div key={p.url} className='truncate' title={p.url}>
                          {p.title ? `${p.title} — ` : ""}
                          <span className='text-muted-foreground'>{p.url}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {Array.isArray(webPlanData.groups) && webPlanData.groups.length > 0 && (
                    <div className='space-y-2'>
                      <p className='font-medium mt-4'>Per-row breakdown</p>
                      <div className='space-y-3'>
                        {webPlanData.groups.map((g) => (
                          <div key={g.label} className='space-y-1'>
                            <div className='flex items-center justify-between'>
                              <span className='text-sm font-medium'>{g.label}</span>
                              <span className='text-sm text-muted-foreground'>{g.count} pages</span>
                            </div>
                            <div className='max-h-32 overflow-auto space-y-1'>
                              {g.pages.slice(0, 10).map((p) => (
                                <div key={p.url} className='truncate' title={p.url}>
                                  {p.title ? `${p.title} — ` : ""}
                                  <span className='text-muted-foreground'>{p.url}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className='text-sm'>No plan yet.</p>
          )}
        </div>
        <DialogFooter>
          <Button type='button' variant='secondary' onClick={onClose}>
            Close
          </Button>
          <Button type='button' variant='outline' onClick={() => onResume?.(undefined)} disabled>
            Resume
          </Button>
          <Button type='button' variant='outline' onClick={() => onRetry?.(undefined)} disabled>
            Retry
          </Button>
          <Button type='button' onClick={() => onReport?.(undefined)} disabled>
            Download report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ICustomSubtopicModalProps {
  isOpen: boolean;
  value: string;
  onClose: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
}

export function CustomSubtopicModal({ isOpen, value, onClose, onChange, onSave }: ICustomSubtopicModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add custom subtopic</DialogTitle>
        </DialogHeader>
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder='Enter subtopic name' />
        <DialogFooter>
          <Button type='button' onClick={onSave} disabled={!value.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
