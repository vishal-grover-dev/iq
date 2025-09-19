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
          <DialogTitle>Indexing completed</DialogTitle>
        </DialogHeader>
        <DialogDescription>Embeddings generated for the following topics and subtopics.</DialogDescription>
        <div className='space-y-2' aria-live='polite'>
          <p className='text-sm text-muted-foreground'>Embeddings generated for:</p>
          {topics.length > 0 && <p className='text-sm'>Topics: {topics.join(", ")}</p>}
          {subtopics.length > 0 && <p className='text-sm'>Subtopics: {subtopics.join(", ")}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
