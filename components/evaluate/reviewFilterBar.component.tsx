"use client";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";
import { QUESTION_REVIEW_LABELS } from "@/constants/evaluate.constants";

interface IReviewFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedTopic: string;
  onTopicChange: (topic: string) => void;
  showOnlyIncorrect: boolean;
  onShowOnlyIncorrectChange: (show: boolean) => void;
  sortMode: "order" | "difficulty" | "topic";
  onSortModeChange: (mode: "order" | "difficulty" | "topic") => void;
  groupMode: "none" | "topic" | "difficulty";
  onGroupModeChange: (mode: "none" | "topic" | "difficulty") => void;
  uniqueTopics: string[];
}

export default function ReviewFilterBar({
  searchQuery,
  onSearchChange,
  selectedTopic,
  onTopicChange,
  showOnlyIncorrect,
  onShowOnlyIncorrectChange,
  sortMode,
  onSortModeChange,
  groupMode,
  onGroupModeChange,
  uniqueTopics,
}: IReviewFilterBarProps) {
  return (
    <div className='space-y-3'>
      {/* Search and Topic Filter */}
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
        <div className='relative flex-1'>
          <MagnifyingGlassIcon className='text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2' />
          <Input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={QUESTION_REVIEW_LABELS.SEARCH_PLACEHOLDER}
            className='pl-9'
          />
        </div>

        {uniqueTopics.length > 1 && (
          <select
            value={selectedTopic}
            onChange={(e) => onTopicChange(e.target.value)}
            className='border-input bg-background ring-offset-background focus-visible:ring-ring h-10 rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-40'
          >
            <option value='all'>{QUESTION_REVIEW_LABELS.ALL_TOPICS_OPTION}</option>
            {uniqueTopics.map((topic) => (
              <option key={topic} value={topic}>
                {topic}
              </option>
            ))}
          </select>
        )}

        <div className='flex items-center gap-2'>
          <Label htmlFor='show-incorrect-only' className='text-sm font-medium cursor-pointer whitespace-nowrap'>
            {QUESTION_REVIEW_LABELS.SHOW_ONLY_INCORRECT}
          </Label>
          <Switch id='show-incorrect-only' checked={showOnlyIncorrect} onCheckedChange={onShowOnlyIncorrectChange} />
        </div>
      </div>

      {/* Sort and Group Controls - Combined Row */}
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-center gap-2'>
          <span className='text-sm font-medium text-muted-foreground'>{QUESTION_REVIEW_LABELS.SORT_LABEL}</span>
          <ToggleGroup
            type='single'
            value={sortMode}
            onValueChange={(value) => value && onSortModeChange(value as typeof sortMode)}
          >
            <ToggleGroupItem value='order' className='h-7 text-xs'>
              {QUESTION_REVIEW_LABELS.ORDER_OPTION}
            </ToggleGroupItem>
            <ToggleGroupItem value='difficulty' className='h-7 text-xs'>
              {QUESTION_REVIEW_LABELS.DIFFICULTY_OPTION}
            </ToggleGroupItem>
            <ToggleGroupItem value='topic' className='h-7 text-xs'>
              {QUESTION_REVIEW_LABELS.TOPIC_OPTION}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className='flex items-center gap-2'>
          <span className='text-sm font-medium text-muted-foreground'>{QUESTION_REVIEW_LABELS.GROUP_LABEL}</span>
          <ToggleGroup
            type='single'
            value={groupMode}
            onValueChange={(value) => value && onGroupModeChange(value as typeof groupMode)}
          >
            <ToggleGroupItem value='none' className='h-7 text-xs'>
              {QUESTION_REVIEW_LABELS.NONE_OPTION}
            </ToggleGroupItem>
            <ToggleGroupItem value='topic' className='h-7 text-xs'>
              {QUESTION_REVIEW_LABELS.TOPIC_OPTION}
            </ToggleGroupItem>
            <ToggleGroupItem value='difficulty' className='h-7 text-xs'>
              {QUESTION_REVIEW_LABELS.DIFFICULTY_OPTION}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    </div>
  );
}
