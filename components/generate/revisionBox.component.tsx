"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { REVISION_BOX_LABELS } from "@/constants/generation.constants";

interface RevisionBoxProps {
  onRevise: (instruction: string) => void;
  isLoading?: boolean;
}

export default function RevisionBox({ onRevise, isLoading = false }: RevisionBoxProps) {
  const [value, setValue] = useState("");

  function onSend() {
    if (!value.trim()) return;
    onRevise(value);
    setValue("");
  }

  return (
    <div className='rounded-lg border bg-white p-3 dark:border-gray-800 dark:bg-gray-950'>
      <div className='flex gap-2'>
        <input
          className='flex-1 rounded-md border px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900'
          placeholder={REVISION_BOX_LABELS.PLACEHOLDER}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          aria-label={REVISION_BOX_LABELS.ARIA_LABEL}
        />
        <Button size='sm' onClick={onSend} disabled={isLoading || !value.trim()}>
          {isLoading ? REVISION_BOX_LABELS.REVISING_BUTTON : REVISION_BOX_LABELS.SEND_BUTTON}
        </Button>
      </div>
    </div>
  );
}
