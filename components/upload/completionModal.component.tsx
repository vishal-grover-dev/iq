"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { COMPLETION_MODAL_LABELS } from "@/constants/upload.constants";

export interface ICompletionModalProps {
  open: boolean;
  topics: string[];
  subtopics: string[];
  onOpenChange: (open: boolean) => void;
}

export default function CompletionModal({ open, topics, subtopics, onOpenChange }: ICompletionModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{COMPLETION_MODAL_LABELS.DIALOG_TITLE}</DialogTitle>
        </DialogHeader>
        <DialogDescription>{COMPLETION_MODAL_LABELS.DIALOG_DESCRIPTION}</DialogDescription>
        <div className='space-y-2' aria-live='polite'>
          <p className='text-sm text-muted-foreground'>{COMPLETION_MODAL_LABELS.EMBEDDINGS_GENERATED}</p>
          {topics.length > 0 && (
            <p className='text-sm'>
              {COMPLETION_MODAL_LABELS.TOPICS_LABEL}: {topics.join(", ")}
            </p>
          )}
          {subtopics.length > 0 && (
            <p className='text-sm'>
              {COMPLETION_MODAL_LABELS.SUBTOPICS_LABEL}: {subtopics.join(", ")}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
