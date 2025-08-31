"use client";

import * as React from "react";

import { cn } from "@/utils/tailwind.utils";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr";

export type ErrorMessageProps = {
  message?: string;
  className?: string;
  children?: React.ReactNode;
  showIcon?: boolean;
};

export function ErrorMessage({ message, children, className, showIcon = true }: ErrorMessageProps) {
  const content = message ?? children;
  if (!content) return null;

  return (
    <div role='alert' aria-live='polite' className={cn("text-xs text-red-600 flex items-start gap-1", className)}>
      {showIcon && <WarningCircleIcon size={14} className='mt-0.5 shrink-0' aria-hidden />}
      <span className='leading-relaxed'>{content}</span>
    </div>
  );
}

export default ErrorMessage;
