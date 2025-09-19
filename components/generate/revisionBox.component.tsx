"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { postReviseMcq } from "@/services/mcq.services";

export default function RevisionBox() {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSend() {
    if (!value.trim()) return;
    setLoading(true);
    try {
      await postReviseMcq({ instruction: value });
      setValue("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className='rounded-lg border bg-white p-3 dark:border-gray-800 dark:bg-gray-950'>
      <div className='flex gap-2'>
        <input
          className='flex-1 rounded-md border px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900'
          placeholder='Ask to tweak wording, difficulty, Bloom level, or options…'
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          aria-label='Revision instruction'
        />
        <Button size='sm' onClick={onSend} disabled={loading || !value.trim()}>
          {loading ? "Sending…" : "Send"}
        </Button>
      </div>
    </div>
  );
}
