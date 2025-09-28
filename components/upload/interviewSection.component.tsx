"use client";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  EInterviewStream as InterviewStream,
  EInterviewTopic as InterviewTopic,
  EInterviewIngestType as InterviewIngestType,
} from "@/types/upload.types";
import {
  INTERVIEW_SUBTOPICS,
  INTERVIEW_TOPIC_OPTIONS,
  INTERVIEW_INGEST_TYPE_OPTIONS,
} from "@/constants/interview-streams.constants";
import { FormLabel } from "@/components/ui/form-label";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";
import {
  planRepoIngestion,
  planWebIngestion,
  resumeIngestion,
  retryIngestion,
  downloadRunReport,
} from "@/services/ingest.services";

type TInterviewSectionProps = {
  items: Array<{
    topic: InterviewTopic;
    subtopic: string;
    ingestType: InterviewIngestType;
    url: string;
    depth?: 2 | 3 | 4;
  }>;
  stream?: InterviewStream;
  disabled?: boolean;
  setValue: (
    name:
      | "contentCategory"
      | "stream"
      | "items"
      | `items.${number}`
      | `items.${number}.topic`
      | `items.${number}.subtopic`
      | `items.${number}.ingestType`
      | `items.${number}.url`,
    value: unknown,
    options?: { shouldValidate?: boolean; shouldTouch?: boolean }
  ) => void;
};

export default function InterviewSection({ items, stream, disabled, setValue }: TInterviewSectionProps) {
  const [openModalIndex, setOpenModalIndex] = useState<number | null>(null);
  const [customSubtopic, setCustomSubtopic] = useState<string>("");

  const [planOpen, setPlanOpen] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [planData, setPlanData] = useState<{
    total: number;
    batchSize: number;
    slices: Array<{ name: string; start: number; end: number; count: number }>;
    categories: Record<string, number>;
  } | null>(null);
  const [webPlanData, setWebPlanData] = useState<{
    count: number;
    pages: Array<{ url: string; title?: string }>;
    groups?: Array<{ label: string; count: number; pages: Array<{ url: string; title?: string }> }>;
  } | null>(null);

  async function handlePlan() {
    try {
      setPlanLoading(true);
      const validItems = items.filter((i) => i && (i.url ?? "").trim());
      if (validItems.length === 0) return;

      // Aggregated results across all rows
      const repoAgg: {
        total: number;
        batchSize: number;
        slices: Array<{ name: string; start: number; end: number; count: number }>;
        categories: Record<string, number>;
      } = { total: 0, batchSize: 200, slices: [], categories: {} };

      const webPagesMap = new Map<string, { url: string; title?: string }>();
      const webGroups: Array<{ label: string; count: number; pages: Array<{ url: string; title?: string }> }> = [];
      let webCount = 0;

      for (const item of validItems) {
        if (item.ingestType === InterviewIngestType.REPO) {
          const res = await planRepoIngestion({ repoUrl: item.url, batchSize: 200 });
          repoAgg.total += res?.total ?? 0;
          repoAgg.batchSize = res?.batchSize ?? repoAgg.batchSize;
          // Prefix slice names with a repo identifier to make batches readable when combined
          const repoId = (() => {
            try {
              const u = new URL(item.url);
              return `${u.hostname}${u.pathname}`;
            } catch {
              return item.url;
            }
          })();
          (res?.slices ?? []).forEach((s: any) => {
            repoAgg.slices.push({ ...s, name: `${repoId} — ${s.name}` });
          });
          Object.entries(res?.categories ?? {}).forEach(([k, v]) => {
            repoAgg.categories[k] = (repoAgg.categories[k] ?? 0) + (v as number);
          });
        } else {
          const u = new URL(item.url);
          const res = await planWebIngestion({
            seeds: [item.url],
            domain: u.hostname,
            depth: (item.depth ?? 2) as number,
            maxPages: 50,
            crawlDelayMs: 300,
            useAiPlanner: false,
            topic: item.topic,
            returnAllPages: false,
            applyQuotas: false,
          });
          webCount += res?.count ?? 0;
          (res?.pages ?? []).forEach((p: any) => {
            if (!webPagesMap.has(p.url)) webPagesMap.set(p.url, p);
          });
          const label = `${item.topic}${item.subtopic ? ` • ${item.subtopic}` : ""} — ${u.hostname}${u.pathname}`;
          webGroups.push({ label, count: res?.count ?? 0, pages: (res?.pages ?? []).slice(0, 20) });
        }
      }

      const hasRepo = repoAgg.total > 0 || repoAgg.slices.length > 0 || Object.keys(repoAgg.categories).length > 0;
      const webPages = Array.from(webPagesMap.values());
      const hasWeb = webPages.length > 0 || webCount > 0;

      setPlanData(hasRepo ? repoAgg : null);
      setWebPlanData(hasWeb ? { count: webCount, pages: webPages, groups: webGroups } : null);
      setPlanOpen(true);
    } finally {
      setPlanLoading(false);
    }
  }

  async function handleResume(ingestionId?: string) {
    if (!ingestionId) return;
    await resumeIngestion(ingestionId);
  }

  async function handleRetry(ingestionId?: string) {
    if (!ingestionId) return;
    await retryIngestion(ingestionId);
  }

  async function handleReport(ingestionId?: string) {
    if (!ingestionId) return;
    await downloadRunReport(ingestionId);
  }

  return (
    <div className='rounded-lg border p-4 shadow-sm bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40'>
      <div className='flex items-center justify-between mb-2'>
        <div className='grid gap-2 sm:max-w-sm'>
          <FormLabel>Interview Streams</FormLabel>
          <Combobox
            value={stream as any}
            onChange={(val) => setValue("stream", val as any, { shouldValidate: true })}
            options={[{ label: InterviewStream.FRONTEND_REACT, value: InterviewStream.FRONTEND_REACT }] as any}
            placeholder='Select stream'
            disabled={disabled}
          />
        </div>
        <div className='flex items-center gap-2'>
          <Button type='button' variant='outline' onClick={handlePlan} disabled={disabled || planLoading}>
            {planLoading ? "Planning…" : "Plan"}
          </Button>
        </div>
      </div>

      <div className='grid gap-3'>
        {items.map((row, idx) => {
          const predefined = INTERVIEW_SUBTOPICS[row.topic as InterviewTopic].map((s) => ({ label: s, value: s }));
          const hasCustom = !!(
            row.subtopic &&
            row.subtopic.trim() &&
            !predefined.some((o) => o.value === row.subtopic)
          );
          const subtopicOptions = [
            { label: "ALL", value: "" },
            ...(hasCustom ? [{ label: row.subtopic, value: row.subtopic }] : []),
            ...predefined,
            { label: "Other", value: "__other__" },
          ];
          return (
            <div key={idx} className='grid gap-3 sm:grid-cols-12 sm:items-end'>
              <div className='grid gap-1 sm:col-span-2'>
                <FormLabel required>Topic</FormLabel>
                <Combobox
                  value={row.topic}
                  onChange={(val) => {
                    const next = items.slice();
                    next[idx] = {
                      ...row,
                      topic: val as InterviewTopic,
                      subtopic: INTERVIEW_SUBTOPICS[val as InterviewTopic][0] ?? "",
                    } as any;
                    setValue("items", next as any, { shouldValidate: true });
                  }}
                  options={INTERVIEW_TOPIC_OPTIONS as any}
                  placeholder='Select topic'
                  disabled={disabled}
                />
              </div>

              <div className='grid gap-1 sm:col-span-2'>
                <FormLabel>Subtopic</FormLabel>
                <Combobox
                  value={(row.subtopic ?? "") as any}
                  onChange={(val) => {
                    if (val === "__other__") {
                      (document.getElementById(`custom-subtopic-${idx}`) as HTMLInputElement)?.focus();
                      setOpenModalIndex(idx);
                      return;
                    }
                    const next = items.slice();
                    next[idx] = { ...row, subtopic: (val as string) || undefined } as any;
                    setValue("items", next as any, { shouldValidate: true });
                  }}
                  options={subtopicOptions as any}
                  placeholder='ALL'
                  disabled={disabled}
                />
              </div>

              <div className='grid gap-1 sm:col-span-3'>
                <FormLabel required>Ingest Type</FormLabel>
                <Combobox
                  value={row.ingestType}
                  onChange={(val) => {
                    const next = items.slice();
                    next[idx] = { ...row, ingestType: val as InterviewIngestType } as any;
                    setValue("items", next as any, { shouldValidate: true });
                  }}
                  options={INTERVIEW_INGEST_TYPE_OPTIONS as any}
                  placeholder='Select ingest type'
                  disabled={disabled}
                  triggerClassName='w/full justify-between overflow-hidden text-ellipsis whitespace-nowrap'
                />
              </div>

              {row.ingestType === InterviewIngestType.WEB && (
                <div className='grid gap-1 sm:col-span-1'>
                  <FormLabel required>Depth</FormLabel>
                  <Combobox
                    value={(row.depth ?? 3) as any}
                    onChange={(val) => {
                      const next = items.slice();
                      next[idx] = { ...row, depth: Number(val) as 2 | 3 | 4 } as any;
                      setValue("items", next as any, { shouldValidate: true });
                    }}
                    options={
                      [
                        { label: "2", value: 2 },
                        { label: "3", value: 3 },
                        { label: "4", value: 4 },
                      ] as any
                    }
                    placeholder='3'
                    disabled={disabled}
                  />
                </div>
              )}

              <div className='grid gap-1 min-w-0 sm:col-span-3'>
                <FormLabel required>URL</FormLabel>
                <Input
                  value={row.url}
                  onChange={(e) => {
                    const next = items.slice();
                    next[idx] = { ...row, url: e.target.value } as any;
                    setValue("items", next as any, { shouldValidate: true });
                  }}
                  type='url'
                  inputMode='url'
                  placeholder={
                    row.ingestType === InterviewIngestType.REPO
                      ? "https://github.com/owner/repo"
                      : "https://developer.mozilla.org/"
                  }
                  title={
                    row.ingestType === InterviewIngestType.REPO
                      ? "Enter a public GitHub docs repository URL"
                      : "Enter a website seed URL to crawl within the same domain"
                  }
                  aria-label='Source URL'
                  className='w-full'
                  disabled={disabled}
                />
              </div>

              <div className='flex justify-end sm:col-span-1'>
                <div className='flex items-center gap-2'>
                  {idx === 0 ? (
                    <Button
                      type='button'
                      variant='secondary'
                      onClick={() =>
                        setValue(
                          "items",
                          [
                            ...items,
                            {
                              topic: items[items.length - 1]?.topic ?? InterviewTopic.REACT,
                              subtopic: "",
                              ingestType: (items[items.length - 1]?.ingestType ?? InterviewIngestType.REPO) as any,
                              url: "",
                            },
                          ] as any,
                          { shouldValidate: true }
                        )
                      }
                      title='Add row'
                      aria-label='Add row'
                    >
                      <PlusIcon size={16} />
                    </Button>
                  ) : (
                    <Button
                      type='button'
                      variant='destructive'
                      onClick={() => {
                        const next = items.filter((_, i) => i !== idx);
                        setValue("items", next as any, { shouldValidate: true });
                      }}
                      title='Delete row'
                      aria-label='Delete row'
                    >
                      <TrashIcon size={16} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Plan modal */}
      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
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
            <Button type='button' variant='secondary' onClick={() => setPlanOpen(false)}>
              Close
            </Button>
            {/* Controls (resume/retry/report) require an ingestion id; will be active during/after a run */}
            <Button type='button' variant='outline' onClick={() => handleResume(undefined)} disabled>
              Resume
            </Button>
            <Button type='button' variant='outline' onClick={() => handleRetry(undefined)} disabled>
              Retry
            </Button>
            <Button type='button' onClick={() => handleReport(undefined)} disabled>
              Download report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Existing custom subtopic modal */}
      <Dialog open={openModalIndex !== null} onOpenChange={(v) => !v && setOpenModalIndex(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add custom subtopic</DialogTitle>
          </DialogHeader>
          <Input
            id={openModalIndex !== null ? `custom-subtopic-${openModalIndex}` : undefined}
            value={customSubtopic}
            onChange={(e) => setCustomSubtopic(e.target.value)}
            placeholder='Enter subtopic name'
          />
          <DialogFooter>
            <Button
              type='button'
              onClick={() => {
                if (openModalIndex === null) return;
                const next = items.slice();
                next[openModalIndex] = { ...next[openModalIndex], subtopic: customSubtopic.trim() } as any;
                setValue("items", next as any, { shouldValidate: true });
                setCustomSubtopic("");
                setOpenModalIndex(null);
              }}
              disabled={!customSubtopic.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
