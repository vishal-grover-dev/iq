"use client";

import * as React from "react";

import { cn } from "@/utils/tailwind.utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CaretUpDownIcon, CheckIcon } from "@phosphor-icons/react/dist/ssr";

export type ComboboxOption<TValue extends string> = {
  label: string;
  value: TValue;
};

export type ComboboxProps<TValue extends string> = {
  value?: TValue;
  onChange: (value: TValue) => void;
  options: ReadonlyArray<ComboboxOption<TValue>>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  triggerClassName?: string;
  contentClassName?: string;
  listMaxHeightClassName?: string; // e.g., "max-h-64"; will enable vertical scrolling
};

export function Combobox<TValue extends string>(props: ComboboxProps<TValue>) {
  const {
    value,
    onChange,
    options,
    placeholder = "Select option",
    searchPlaceholder = "Search...",
    emptyMessage = "No results found.",
    disabled = false,
    triggerClassName,
    contentClassName,
    listMaxHeightClassName,
  } = props;

  const [open, setOpen] = React.useState(false);

  const selectedLabel = React.useMemo(() => {
    const match = options.find((opt) => opt.value === value);
    return match?.label ?? placeholder;
  }, [options, value, placeholder]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className={cn("h-10 w-full justify-between", triggerClassName)}
          disabled={disabled}
        >
          {selectedLabel}
          <CaretUpDownIcon size={16} className='ml-2 opacity-60' aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-[--radix-popover-trigger-width] p-0", contentClassName)}>
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandEmpty>{emptyMessage}</CommandEmpty>
          <CommandList className={cn(listMaxHeightClassName ?? "max-h-80", "overflow-y-auto")}>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    size={16}
                    className={cn("mr-2", value === option.value ? "opacity-100" : "opacity-0")}
                    aria-hidden
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default Combobox;
