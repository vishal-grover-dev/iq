import React from "react";
import { Label } from "./label";

interface FormLabelProps {
  children: React.ReactNode;
  required?: boolean;
}

export function FormLabel({ children, required = false }: FormLabelProps) {
  return (
    <Label>
      {children}
      {required && <span className='text-red-500 ml-1'>*</span>}
    </Label>
  );
}
