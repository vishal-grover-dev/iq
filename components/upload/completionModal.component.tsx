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
  isGenerating?: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: () => Promise<void> | void;
}

export default function CompletionModal({
  open,
  topics,
  subtopics,
  isGenerating,
  onOpenChange,
  onGenerate,
}: ICompletionModalProps) {
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
        <DialogFooter>
          <Button type='button' onClick={() => onGenerate()} disabled={!!isGenerating}>
            Generate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
