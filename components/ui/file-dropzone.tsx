import React from "react";
import { useDropzone, type Accept } from "react-dropzone";
import { cn } from "@/utils/tailwind.utils";

type TFileDropzoneProps = {
  onDrop: (acceptedFiles: File[]) => void;
  accept?: Accept | Record<string, string[]>;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  description?: string;
  hint?: string;
};

export default function FileDropzone({
  onDrop,
  accept,
  multiple = true,
  disabled = false,
  className,
  description = "Drag and drop files here, or click to browse",
  hint,
}: TFileDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept as any,
    multiple,
    disabled,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "rounded-md border border-dashed p-6 text-center",
        "border-gray-300 dark:border-gray-800",
        isDragActive ? "bg-gray-50 dark:bg-gray-900" : "bg-white dark:bg-gray-950",
        className
      )}
    >
      <input {...getInputProps()} disabled={disabled} />
      <p className='text-sm'>{description}</p>
      {hint ? <p className='mt-1 text-xs text-gray-500'>{hint}</p> : null}
    </div>
  );
}
