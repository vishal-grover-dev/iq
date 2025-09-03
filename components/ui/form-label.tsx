import React from "react";
import { Label } from "./label";

interface IFormLabelProps {
  children: React.ReactNode;
  required?: boolean;
}

export function FormLabel({ children, required = false }: IFormLabelProps) {
  return (
    <Label>
      {children}
      {required && <span className='text-red-500 ml-1'>*</span>}
    </Label>
  );
}
